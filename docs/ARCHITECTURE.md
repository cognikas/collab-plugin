# Arquitectura del cliente

El plugin `collab-channel` es el cliente del canal. El contrato que habla con el servidor (el
esquema, las reglas de visibilidad, los bindings de WebSocket y HTTP, el versionado) está en
[`cognikas/collab-protocol`](https://github.com/cognikas/collab-protocol); el servidor, en
[`cognikas/collab-backend`](https://github.com/cognikas/collab-backend). Este documento cubre lo que
es propio del cliente.

## El problema de fondo

Una sesión interactiva de Claude Code es **por turnos**. Ningún proceso externo puede inyectarle un
turno: no hay una API para decirle «oye, ha llegado esto». Todo lo que este plugin hace se deriva de
esa restricción.

La consecuencia práctica es que hacen falta tres piezas y no una:

1. Un **daemon local** que sostenga el WebSocket, porque los hooks son procesos efímeros que no
   pueden mantener una conexión abierta.
2. Unos **hooks** que se enganchen a los momentos en que Claude Code sí ejecuta código nuestro
   (arranque, fin de turno, envío de prompt, tras cada herramienta) y aprovechen para inyectar lo que
   el daemon ya dejó en disco.
3. Un **servidor MCP** con las herramientas `collab_*`, para cuando el modelo quiere actuar sobre el
   canal deliberadamente.

Los hooks nunca tocan la red. Leen archivos locales y terminan en milisegundos, porque corren en la
ruta crítica de cada turno. Tampoco cargan el runtime de Protobuf: leen el modelo propio del plugin
(`src/lib/model.ts`), JSON plano que el daemon escribe.

```
Ana llama collab_done
   │
   ├─► servidor MCP ──loopback──► daemon de Ana ──WSS──► collab-backend
   │                                                          │
   │                         fan-out a las sesiones a las que │
   │                         va dirigido (tema, persona, o ambos)
   │                                                          ▼
   └───────────────────────────────────────────── daemon de Bruno
                                                        │
                                       inbox.jsonl + aviso de escritorio
                                                        │
                            Bruno termina su turno ──► hook Stop lee el inbox
                                                        │
                                          exit 2 + mensaje por stderr
                                                        │
                                       el modelo de Bruno lo procesa
```

## Cliente

### El daemon

Uno por sesión de Claude Code. Lo arranca el hook `SessionStart`, en modo *detached*, y vive en
`${CLAUDE_PLUGIN_DATA}/v1/sessions/<client_session_id>/`:

| Archivo | Contenido |
|---|---|
| `daemon.json` | pid, puerto de loopback, token, cwd, pid del proceso de Claude Code |
| `inbox.jsonl` | mensajes recibidos, append-only, en el modelo del plugin |
| `cursor.json` | hasta dónde ha leído esta sesión |
| `state.json` | tema y handle, presencia, reservas e índice de contexto del tema, último error |
| `turn.json` | solo en modo `channel`: si hay un turno en curso, y cuándo hubo actividad |
| `channel.json` | solo en modo `channel`: si el push está activo y, si no, por qué |
| `daemon.log` | diagnóstico |

La carpeta `v1/` existe porque 1.0 conserva el id de plugin de 0.6 (`collab-channel@cognikas`) y por
tanto su `CLAUDE_PLUGIN_DATA`. Las credenciales de 0.6 son de otro backend y su inbox de otro
protocolo: 1.0 no debe leer ninguno de los dos.

Expone HTTP en `127.0.0.1:<puerto aleatorio>` protegido por un token. Es por donde le hablan los
hooks y el servidor MCP. Solo loopback: esta API habla en nombre de la sesión, así que no debe ser
alcanzable desde fuera de la máquina. Es un contrato interno del plugin, no parte del protocolo.

`GET /wait` es un long-poll sobre el inbox. Con `since=<seq>` responde al momento si ya hay algo
posterior que cumpla el filtro (`types`, `minUrgency`), y si no espera a la siguiente llegada; así un
mensaje que llega entre dos llamadas no se pierde. Devuelve **todo** lo posterior a `since`, no solo
lo que casa con el filtro: el filtro decide cuándo despertar, no qué se ve.

Muere cuando `SessionEnd` se lo pide, cuando otro daemon toma el relevo de la sesión, cuando muere el
proceso de Claude Code al que sirve (un cierre abrupto se salta `SessionEnd`), o a las 12 h.

**El tema de la sesión** lo decide el daemon al arrancar: `COLLAB_TOPIC`, luego la opción `topic`,
luego el nombre del repositorio principal (desde un worktree es el del repo, en un submódulo el del
submódulo), y si no, `general`. Lo guarda en `state.json`, y un daemon que el servidor MCP vuelve a
arrancar toma el de ahí: una sesión no cambia de tema a medias.

### Cómo habla el daemon con el servidor

Sigue el binding WebSocket de `collab.v1` (`bindings/websocket.md` del repo del protocolo):

1. Pide un ticket por HTTP (`WebSocketService/IssueTicket`) con su credencial, su tema y su
   `client_session_id`, y abre el socket con `?ticket=`.
2. El primer frame es `subscribe`, con su `ClientInfo` (`collab-channel`, su versión, el protocolo
   1.0, sin capacidades) y `since` si ya tiene algo guardado. El servidor contesta `hello` con el
   estado y la versión acordada. Hasta ese `hello` el daemon no manda nada más por el socket: el
   servidor rechaza cualquier frame anterior a `subscribe`.
3. Después llegan `message`, `presence`, `claims` y `context`. Cada petición del daemon lleva un
   `requestId` y espera su `result` tipado, o un `error`.
4. `heartbeat` cada 30 s mantiene al miembro `ONLINE`.
5. Si el socket se cae, reconecta con backoff y se vuelve a suscribir con `since` igual al último
   `seq` que tiene, así que no pierde nada.

**Cuándo deja de reconectar.** `ERROR_CODE_UNSUPPORTED_PROTOCOL` (el backend no habla esta versión)
y `ERROR_CODE_REVOKED` (el miembro fue revocado) no se arreglan reintentando. Lleguen por el socket o
por HTTP, el daemon deja de reconectar, apunta el motivo en `state.json` (`fatal` y `lastError`), y
los hooks y `/collab-status` lo muestran. Un daemon nuevo (sesión nueva, plugin actualizado) vuelve a
intentarlo.

**Socket o HTTP.** Toda operación unaria existe en los dos bindings. El daemon usa el socket cuando
está suscrito y el frame cabe; si no, HTTP. Un frame de más de ~120 KB (un contexto grande) va por
HTTP directamente, porque API Gateway rechaza mensajes de WebSocket de más de 128 KB. Una respuesta
del servidor, sea resultado o error, es definitiva; solo se repite por HTTP lo que el socket no pudo
llevar (cerrado, o sin respuesta en 10 s).

Las credenciales se usan solo contra el `api_endpoint` que las emitió: si cambia, el plugin pide una
invitación nueva en vez de presentar una credencial que el otro backend no conoce.

### Cómo el servidor MCP encuentra su daemon

Un hook recibe su `session_id` por stdin. **Un servidor MCP no.** Los hooks y los servidores MCP son
**hijos directos** del mismo proceso de Claude Code, así que cada hook y el servidor MCP apuntan
`process.ppid` en `COLLAB_CLAUDE_PID`, el daemon que arrancan lo guarda en `daemon.json`, y el
servidor MCP busca el daemon con su mismo `ppid`. En orden:

1. **El daemon del mismo proceso de Claude Code**, el más reciente. Es exacto aunque haya dos
   sesiones en el mismo repositorio, y sigue a un `/clear`, que abre una sesión nueva dentro del
   mismo proceso.
2. **`CLAUDE_CODE_SESSION_ID`**, que Claude Code pone en el entorno del servidor al lanzarlo. Es
   correcto para la sesión con la que arrancó, pero se queda congelado: tras un `/clear` ya no, y por
   eso el daemon manda.
3. Daemons sin pid registrado: directorio de trabajo, y si no, el más reciente.

### El guard anti-bucle del hook `Stop`

El guard es propio y tiene dos capas:

1. El cursor **avanza antes** de bloquear, así que un segundo `Stop` inmediato no encuentra nada sin
   leer.
2. Un rate-limit de 4 segundos entre interrupciones.

`test/stop-guard.test.ts` ejecuta el hook compilado dos veces seguidas y comprueba que interrumpe
exactamente una.

### Entrega con la sesión inactiva (modo `channel`)

Los [channels](https://code.claude.com/docs/en/channels-reference) de Claude Code (research preview)
son la única vía para meter algo en una sesión sin que haya un turno: un servidor MCP que declara la
capacidad `experimental['claude/channel']` puede enviar `notifications/claude/channel`, y la sesión lo
recibe como `<channel source="plugin:collab-channel:collab" collab_seq="…" type="…" urgency="…">` y lo
procesa aunque esté inactiva.

**Reparto del trabajo.** Durante un turno entregan los hooks, exactamente igual que en `stop`. El
servidor MCP solo empuja con la sesión **inactiva**: un evento que llega a mitad de turno se encola
hasta el siguiente, y para entonces el `Stop` ya habría entregado el mismo mensaje. Para saber si hay
turno, en este modo los hooks escriben `turn.json`. Un turno del que ningún hook sabe nada en 10
minutos se da por terminado, porque si el usuario interrumpe con Esc no hay `Stop`.

**El bucle.** `GET /wait` en el daemon; cuando despierta, espera a que la sesión esté inactiva,
recalcula el lote, reclama el cursor **antes** de empujar para que un hook que salte a la vez no lo
entregue también, y emite una notificación por mensaje, con `UNTRUSTED_NOTE`, el texto aplanado y
`<channel` neutralizado.

**Saber si la sesión lo aceptó.** Claude Code no le dice a un servidor si lo registró como channel, y
si no lo hizo descarta los eventos sin error. Dos defensas: al arrancar, el servidor lee la línea de
comandos de su proceso padre y busca el flag con `plugin:collab-channel@…`; y cada push se confirma
por la actividad de hooks que deja el turno que arranca. Si en 180 s no hay nada, el cursor vuelve
atrás, el siguiente `Stop` entrega el mensaje y esa sesión deja de empujar. Ante la duda (el usuario
escribió en ese intervalo) el mensaje vuelve a la cola: puede verse dos veces, pero no perderse.

### Por qué `dist/` está commiteado

El segundo programador no debería ejecutar `npm install` para usar un plugin. Los bundles (daemon,
hook, servidor MCP, CLI) se generan con esbuild, con el paquete del protocolo dentro, y se commitean:
instalar es añadir el marketplace y nada más.

## Modo degradado

Si el daemon no corre o el socket está caído, todo sigue funcionando por HTTP directo: el estado con
`ChannelService/GetState`, los envíos con `Send`, y las reservas y el contexto con sus propias
operaciones. Se pierde la inmediatez, no la funcionalidad. El estado local se marca como
`connected: false` y tanto los hooks como las herramientas lo dicen explícitamente en vez de fingir
que el mensaje llegó.
