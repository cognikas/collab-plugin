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
| `state.json` | tema y handle, presencia, reservas, índice de contexto y listas de tareas con tareas abiertas del tema, último error |
| `turn.json` | solo en modo `channel`: si hay un turno en curso, y cuándo hubo actividad |
| `channel.json` | solo en modo `channel`: si el push está activo y, si no, por qué |
| `daemon.log` | diagnóstico |

Aparte, cada servidor MCP del plugin deja `${CLAUDE_PLUGIN_DATA}/v1/mcp/<pid>.json` con su pid y el
del proceso de Claude Code. Con eso el daemon sabe si su sesión sigue ahí (ver más abajo cuándo
muere).

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

**Cuándo muere.** Cuando `SessionEnd` se lo pide, cuando otro daemon toma el relevo de la sesión,
cuando muere el proceso de Claude Code al que sirve (un cierre abrupto se salta `SessionEnd`), o a
las 12 h.

`SessionEnd` no basta:

- tiene 1,5 s, y Claude Code puede cortarlo antes de que termine;
- el proceso de Claude Code puede seguir vivo después de la sesión, convertido en un spare de fondo
  (`claude bg-spare --bg-spare …`).

Un daemon que queda así sigue conectado como una sesión que nadie lee, y los demás le escriben. Por
eso también muere en estos casos:

- **Otra sesión arranca en su proceso.** El `SessionStart` de esa sesión lo retira, por ejemplo tras
  un `/clear` o un `/resume` cuyo `SessionEnd` no llegó. Un proceso de Claude Code corre una sesión
  a la vez.
- **Su sesión se reanuda con `--resume` en otro proceso.** El `SessionStart` lo reemplaza: si no, se
  emparejaría con el servidor MCP equivocado, vigilaría el pid equivocado y conservaría el tema y el
  repo de antes.
- **El proceso de Claude Code se convirtió en spare después de que el daemon arrancó.** Se ve en su
  línea de comandos. No aplica en Windows, donde un proceso no cambia su línea de comandos.
- **No queda ningún servidor MCP del plugin bajo ese proceso.** Tiene que llevar 3 minutos así, y
  solo cuenta si alguna vez lo hubo. Claude Code lo mantiene mientras tiene las herramientas de la
  sesión, y lo conserva tras un `/clear`.

Al morir borra `daemon.json` solo si todavía es el suyo. Un daemon que perdió la sesión frente a otro
no debe dar de baja al ganador, que si no se apaga también en su siguiente revisión.

**El tema de la sesión** lo decide el daemon al arrancar, en este orden:

1. `COLLAB_TOPIC`;
2. la opción `topic`;
3. el tema que la sesión ya tenía, guardado en `state.json`;
4. el nombre del repositorio principal (desde un worktree es el del repo, en un submódulo el del
   submódulo);
5. `general`.

Un daemon que arranca de nuevo para la misma sesión (el tope de 12 h, una caída, un `--resume`)
conserva el tema guardado antes que el del repo: una sesión no cambia de tema porque su directorio
apunte a otro repo. Un tema explícito sí gana sobre el guardado, así que ponerlo surte efecto la
próxima vez que la sesión arranca, `--resume` incluido. Mientras tanto, `collab_status` avisa si el
tema configurado y el de la sesión no coinciden.

El repo y la rama que el daemon declara al suscribirse se los pasa el hook. Un daemon que arrancó
el servidor MCP los saca del directorio de la sesión.

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

**Socket o HTTP.** Toda operación unaria existe en los dos bindings, salvo `GetState` y `ListTasks`,
que solo van por HTTP. El daemon usa el socket cuando
está suscrito y el frame cabe; si no, HTTP. Un frame de más de ~120 KB (un contexto grande) va por
HTTP directamente, porque API Gateway rechaza mensajes de WebSocket de más de 128 KB. Una respuesta
del servidor, sea resultado o error, es definitiva; solo se repite por HTTP lo que el socket no pudo
llevar (cerrado, o sin respuesta en 10 s).

Las credenciales se usan solo contra el `api_endpoint` que las emitió: si cambia, el plugin pide una
invitación nueva en vez de presentar una credencial que el otro backend no conoce.

### Listas de tareas

Las herramientas `collab_tasks`, `collab_task_add` y `collab_task_update` hablan con el daemon por
`GET /tasks`, `POST /tasks/add` y `POST /tasks/update`.

- **Escrituras.** `CreateTaskList`, `AddTasks` y `UpdateTask` van por el socket, como cualquier
  petición; `collab_task_add` crea la lista antes de agregar (crearla es idempotente).
- **Lecturas.** `ListTasks` va siempre por HTTP.
- **Resumen.** `state.json` guarda las listas del tema que tienen tareas abiertas. Sale del `hello`,
  de cada aviso `TASK` (su payload trae la lista con los contadores después del cambio) y de la
  respuesta a los cambios de esta misma sesión, que no recibe su propio aviso. Un aviso que llega
  tarde no hace retroceder una lista (`applyTaskList`). Ese resumen es lo que muestran el
  `SessionStart` y `collab_status`; las tareas en sí se piden con `collab_tasks`.
- **Quién hace qué.** `state.json` guarda también las tareas abiertas del tema (`tasks`), para que el
  `SessionStart` y la statusline digan quién tiene qué sin ir a la red.
  - Un aviso `TASK` dice qué tarea cambió, pero no quién la tiene ahora ni cuánto avanzó. Por eso el
    daemon vuelve a leer las tareas abiertas con `ListTasks` después de cada `hello` y de cada aviso,
    juntando los avisos de 300 ms en una sola lectura.
  - Los cambios de esta sesión salen de la respuesta a su propia petición (`applyTask`).
  - El `hello` marca las tareas como atrasadas (`tasksStale`) hasta esa lectura. Si alguna lista
    tiene tareas en curso, el `SessionStart` la espera dentro de sus 4 s, y si no llega no muestra
    tareas que podrían estar viejas.
  - `collab_status` las pide frescas cuando hay algo en curso y muestra la sección «In progress»:
    persona, sesión, tarea, avance, última nota y hace cuánto.
- **Avisos.** Son mensajes corrientes del inbox, de tipo `task`. Los cierres llegan en `normal`, así
  que interrumpen en el siguiente `Stop`; el resto llega en `low` y se muestra junto con la próxima
  entrega. Llegan también a las otras sesiones de quien actuó en el tema.
- **Backend viejo.** Uno anterior a las listas contesta que no conoce la operación, y el daemon lo
  traduce a «el backend todavía no tiene listas de tareas».

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

### Una sesión concreta

La `client_session_id` de cada sesión es el `session_id` de Claude Code: la que el hook recibe por
stdin y el daemon usa como carpeta y manda en el ticket. Desde el protocolo 1.0.0-rc.3 también sale
del servidor:

- **Presencia:** cada miembro trae `sessions`, con una entrada por sesión viva: id, tema, repo, rama
  y hora de conexión. `collab_status`, el resumen de `SessionStart` y `cli status` listan las
  sesiones de cada miembro con su id completo, y las otras sesiones propias.
- **Remitente:** cada mensaje dice qué sesión lo envió. Se muestra como
  `willy@beta-1.0 (session <id>)`.
- **Destinatario:** `collab_send` y `collab_done` aceptan `session`. El servidor MCP la resuelve con
  `resolveSessionTarget` (`src/lib/sessions.ts`) contra la presencia que tiene el daemon:
  - la sesión tiene que estar conectada;
  - si falta `user`, lo deduce;
  - rechaza un `topic` que no coincide con el de la sesión.

  Si ningún miembro trae `sessions`, el servidor es anterior a rc.3 y descartaría el campo,
  repartiendo el mensaje a todas las sesiones del miembro. En ese caso la herramienta se niega en
  lugar de ampliar el reparto en silencio.
- **Mensaje para esta sesión:** se muestra como `→ you (this session)`, comparando con la id propia
  que el daemon expone en `GET /status`.
- **Destinatario por defecto:** `resolveRecipient` (`src/lib/sessions.ts`) lo decide antes de enviar,
  con la presencia que tiene el daemon:
  - `replyTo` va a la sesión que escribió ese mensaje, que sale del inbox local. Si ya no está
    conectada, va a su miembro en el tema del mensaje, que es donde sigue la conversación.
  - `user` sin tema ni sesión va a ese miembro en el tema propio si tiene una sesión viva ahí. Si no,
    va a todas sus sesiones, con una nota en la confirmación. `anyTopic` pide todas a propósito. Así
    lo de un proyecto no cae en las sesiones que esa persona tiene abiertas en otros.
  - Es una decisión del cliente: el protocolo y el backend no cambian, y quién ve qué lo sigue
    decidiendo el servidor.
- **Confirmación:** `sentLine` nombra las sesiones que la presencia dice que cubre el destinatario
  (`reachedSessions`), junto al conteo que devuelve el servidor.

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
turno, en este modo los hooks escriben `turn.json`.

Un turno del que ningún hook sabe nada en 10 minutos se da por terminado, porque si el usuario
interrumpe con Esc no hay `Stop`. Eso vale solo cuando el canal ya demostró que entrega en ese
proceso. Antes, un turno que solo espera una herramienta larga, o la respuesta del usuario a una
pregunta, recibiría el primer push y lo haría parecer perdido.

Una compactación dispara `SessionStart` con `source: "compact"`, a veces a mitad de turno. No cuenta
como turno terminado.

**El bucle.** `GET /wait` en el daemon; cuando despierta, espera a que la sesión esté inactiva,
recalcula el lote, reclama el cursor **antes** de empujar para que un hook que salte a la vez no lo
entregue también, y emite una notificación por mensaje, con `UNTRUSTED_NOTE`, el texto aplanado y
`<channel` neutralizado.

**Saber si la sesión lo aceptó.** Claude Code no le dice a un servidor si lo registró como channel, y
si no lo hizo descarta los eventos sin error. Dos defensas: al arrancar, el servidor lee la línea de
comandos de su proceso padre y busca el flag con `plugin:collab-channel@…`; y el primer push se
confirma por la actividad de hooks que deja el turno que arranca. `UserPromptSubmit` no se dispara
para ese turno, así que la señal es su primera herramienta o su `Stop`.

Según lo que pase después del primer push:

- **Nada en 10 minutos:** el cursor vuelve atrás, el siguiente `Stop` entrega el mensaje y esa
  sesión deja de empujar.
- **Hay duda** (el usuario escribió en ese intervalo): el mensaje vuelve a la cola. Puede verse dos
  veces, pero no perderse.
- **Se confirma:** el canal está registrado en ese proceso. Claude Code no pierde un evento que
  recibió: uno que cae en un turno en curso espera a que el turno lo tome. Desde entonces ningún
  push vuelve a la cola.

Sin esa regla, un push que cae en un turno largo se daría por perdido. El mensaje se entregaría dos
veces, y el canal se apagaría para el resto de la sesión con un falso «not registered».

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
