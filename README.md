# collab-channel — canal de colaboración entre sesiones de Claude Code

Varios programadores, varias máquinas, cada uno con su sesión interactiva de Claude Code. Este
plugin las conecta: mensajes, presencia, contexto compartido, reserva de archivos y aviso automático
de trabajo terminado.

El objetivo concreto es **eliminar el handoff manual**. Hoy uno copia un resumen, lo pega en Slack, y
el otro lo pega en su sesión. Aquí, cuando una sesión termina algo, la otra se entera sola.

```
  Programador A                     AWS us-east-1                    Programador B
┌──────────────────┐                                            ┌──────────────────┐
│ Claude Code      │   WSS    ┌──────────────────────┐    WSS    │ Claude Code      │
│  ├ hooks         │◄────────►│ collab-backend       │◄─────────►│  ├ hooks         │
│  ├ tools collab_*│          │ API GW + Lambda +    │           │  ├ tools collab_*│
│  └ daemon local  │          │ DynamoDB + SNS       │           │  └ daemon local  │
└──────────────────┘          └──────────────────────┘           └──────────────────┘
```

Esta es la versión **1.0**. Habla el protocolo `collab.v1`, definido en
[`cognikas/collab-protocol`](https://github.com/cognikas/collab-protocol), contra el backend de
[`cognikas/collab-backend`](https://github.com/cognikas/collab-backend). La 0.6, plugin y backend
en un solo repo, queda como referencia histórica en `cognikas/claude-code-collaboration`. Las dos no
son compatibles: 1.0 necesita el endpoint y una invitación del backend nuevo.

## Qué hace, en concreto

| Situación | Qué pasa |
|---|---|
| Ana termina el endpoint `/login` | La sesión de Bruno lo recibe y **lo procesa al cerrar su turno**, sin que Bruno haga nada |
| Ana decide el diseño de auth | Lo publica con `collab_context_put`; Bruno lo lee con `collab_context_get` en vez de pedírselo |
| Ana va a refactorizar `src/api/**` | Lo reserva con `collab_claim`; a Bruno se le pide confirmación antes de editar ahí |
| Bruno no puede seguir sin el endpoint | `collab_wait` bloquea su turno hasta que llegue el aviso, sin polling |
| Nadie más está conectado | El mensaje sale también como aviso offline (email opcional, vía SNS) |

## Temas y destinatarios

Cada sesión entra al canal en un **tema** y solo recibe lo que va dirigido a ella. Por defecto el
tema es el nombre del repositorio (`collab-global`, `masterlive`), así que dos personas en repos
distintos no se pisan los mensajes, las reservas ni el contexto.

Todo mensaje dice para quién es. No hay difusión a todo el canal:

| Destinatario | Llega a |
|---|---|
| `topic: "masterlive"` | todas las sesiones en ese tema, de cualquier persona, menos las tuyas |
| `user: "willy"` | todas las sesiones de willy, en cualquier tema |
| `user: "willy", topic: "masterlive"` | solo las sesiones de willy en ese tema |

A una persona se la nombra por su **handle**, que sale de su nombre visible (`prueba (fake peer)` →
`prueba-fake-peer`) y es único en el canal. `/collab-status` muestra el tuyo, tu tema, y en qué temas
está cada uno.

Las reservas (`collab_claim`) y el contexto compartido también son del tema: solo avisan y se ven
dentro de él. El contexto de otro tema se puede leer nombrándolo en `collab_context_get`.

Para fijar el tema de un proyecto, pon `COLLAB_TOPIC` en el `env` de su
`.claude/settings.local.json`; el campo `topic` de `/config` lo fija para todos. Una sesión conserva
su tema de principio a fin: el cambio se nota en la siguiente.

## Instalación

Necesitas un **código de invitación** del backend 1.0 (quien lo administra lo emite con
`scripts/invite.mjs` de `collab-backend`), y en tu máquina:

| Requisito | Por qué |
|---|---|
| Claude Code con sesión iniciada | el plugin vive dentro de él |
| **Node.js ≥ 20** en el `PATH` | los hooks y el servidor MCP se ejecutan con el comando `node`. Sin él, el plugin no hace nada. En Windows, el instalador LTS de [nodejs.org](https://nodejs.org); comprueba con `node --version` en una terminal nueva |
| Git y acceso a la organización `cognikas` en GitHub | el repositorio del marketplace es privado |

Si tenías la 0.6 instalada, quita antes su marketplace: los dos se llaman `cognikas` y no pueden
estar a la vez.

```
/plugin marketplace remove cognikas
/plugin marketplace add cognikas/collab-plugin
/plugin install collab-channel@cognikas
```

El repositorio es privado, así que tu cuenta de GitHub tiene que pertenecer a la organización
`cognikas` y tener las credenciales de git configuradas (`gh auth login` basta). Si el comando falla
con un 404, es eso y no un error de escritura.

Luego `/config` → **Collaboration Channel**, y rellena:

| Campo | Valor |
|---|---|
| `api_endpoint` | la URL del backend 1.0 que te pasaron (la salida `HttpEndpoint` de `CollabBackendStack`) |
| `invite_code` | tu código de invitación (de un solo uso) |
| `display_name` | cómo quieres que te vean los demás; de aquí sale tu handle, que tiene que estar libre |
| `topic` | opcional: el tema de tus sesiones. Vacío, el nombre del repositorio |

Reinicia la sesión. En el arranque se canjea la invitación sola y el canal queda conectado.
Comprueba con `/collab-join`, que además diagnostica si algo falta.

Aparte de Node no hace falta instalar nada: los bundles vienen compilados en el repositorio, así que
no hay `npm install` ni dependencias que bajar. La 1.0 guarda sus credenciales y su estado en una
carpeta `v1/` propia dentro de los datos del plugin, así que lo que dejó la 0.6 no se mezcla.

## Cómo llegan los mensajes

Lo controla `delivery_mode` en `/config`:

| Modo | Comportamiento |
|---|---|
| **`stop`** (por defecto) | Al terminar su turno, si hay mensajes sin leer, la sesión los procesa antes de quedar inactiva. Es lo más parecido a un push real dentro de la terminal |
| `prompt` | Solo se inyectan cuando escribes tu siguiente mensaje. Nunca te interrumpe |
| `manual` | Nada automático. El canal se consulta con las herramientas `collab_*` y los comandos |
| `all` | Arranque de sesión + cada prompt + fin de turno |
| `channel` | Como `stop`, y además los mensajes que llegan con la sesión **inactiva** entran solos, sin esperar a que escribas. Requiere arrancar con el flag de channels (abajo); sin él funciona exactamente como `stop` |

`stop_min_urgency` decide qué urgencia merece interrumpir. Por defecto `normal`, así que el ruido de
bookkeeping (reservas, avisos de contexto) nunca corta un turno. La urgencia solo decide si se
interrumpe: cuando algo interrumpe, se entrega todo lo pendiente, también lo de menor urgencia.

Un mensaje urgente no espera al final del turno: en los modos `stop`, `all` y `channel`, si hay algo
sin leer con urgencia al menos `midturn_min_urgency` (por defecto `high`), entra en el contexto justo
después de la siguiente llamada a herramienta. `off` lo desactiva.

### Modo `channel` (research preview)

Usa los [channels](https://code.claude.com/docs/en/channels) de Claude Code: el servidor MCP del
plugin empuja el mensaje a la sesión y Claude lo procesa aunque nadie esté escribiendo. Un plugin de
un marketplace propio no está en la lista de channels aprobados, así que hay que arrancar con el flag
de desarrollo:

```bash
claude --dangerously-load-development-channels plugin:collab-channel@cognikas
```

Claude Code muestra un aviso a pantalla completa la primera vez; elige *I am using this for local
development*. En organizaciones Team o Enterprise, un Owner tiene que activar los channels
(`channelsEnabled`); si no, Claude Code descarta los eventos sin avisar al plugin.

Por eso el plugin no se fía de que el push haya llegado: si en 3 minutos la sesión no arranca ningún
turno, devuelve el mensaje a la cola, lo entrega el siguiente `Stop` y esa sesión pasa a comportarse
como `stop`. Un push descartado no se pierde; en el caso dudoso un mensaje puede verse dos veces.
`/collab-status` dice qué modo está en vigor y por qué. Detalles en
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#entrega-con-la-sesión-inactiva-modo-channel).

## Comandos

| Comando | Para qué |
|---|---|
| `/collab-status` | Quién está conectado y en qué tema, qué se reservó en el tuyo, qué no has leído |
| `/collab-send <texto>` | Mandar un mensaje a un tema, a una persona, o a una persona en un tema |
| `/collab-done [qué]` | Anunciar trabajo terminado — el reemplazo del handoff |
| `/collab-claim [rutas]` | Reservar archivos antes de un refactor |
| `/collab-join` | Unirse al canal, o diagnosticar por qué no conecta |

## Desarrollo

Requisitos: Node ≥ 20 y pnpm. El protocolo se instala como dependencia git fijada a un tag de
`collab-protocol`; como ese repo es privado, pnpm lo clona por SSH. Sin clave SSH en GitHub, redirige
SSH a HTTPS una vez (ver el README de `collab-protocol`).

```bash
pnpm install
pnpm build                    # esbuild → plugin/dist/*.mjs (commiteado)
pnpm typecheck && pnpm test
```

Cómo se publica un cambio, cómo diagnosticar y cómo probar 1.0 junto a 0.6, en
[docs/OPERATIONS.md](docs/OPERATIONS.md). El diseño, en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Estructura

```
.claude-plugin/   el marketplace cognikas (una entrada: collab-channel)
plugin/           el plugin: daemon, hooks, servidor MCP, skill, comandos
  src/            fuentes TypeScript
  dist/           bundles autocontenidos (commiteados a propósito)
scripts/          version, mcp-check, fake-peer
docs/             arquitectura y operación del cliente
```

## Seguridad

- La credencial es un `member_id` y un secreto de 32 bytes; el servidor guarda solo su hash. Vive en
  `${CLAUDE_PLUGIN_DATA}/v1/credentials.json` con la ACL restringida al usuario, o en el llavero del
  sistema si pegas `member_id` y `member_secret` en `/config`. Solo se usa contra el backend que la
  emitió: si cambias `api_endpoint`, hace falta una invitación nueva.
- El WebSocket se autentica con un ticket de 60 s y de un solo uso, nunca con el secreto: la URL de
  un WebSocket acaba en los logs.
- Lo que escribe otra persona **acaba en el contexto del modelo de tu sesión**. Se inyecta siempre
  precedido de una nota que lo marca como información, no como instrucciones, y con los saltos de
  línea aplanados para que un mensaje no pueda falsificar la estructura del bloque (por ejemplo,
  colar una línea con pinta de `#99 SYSTEM ...`). Lo mismo vale para nombres, ramas, rutas y notas de
  una reserva. En modo `channel`, además, el texto no puede cerrar la etiqueta `<channel>` y abrir
  una falsa. Hay pruebas de regresión para todo esto.

Está pensado para un equipo pequeño que confía entre sí, no para multi-tenant. **Los temas ordenan,
no protegen**: cualquier miembro entra en cualquier tema con solo nombrarlo. Lo único privado son los
mensajes dirigidos a una persona (`user` en `collab_send`), y aun así viajan por el mismo backend: no
son un canal para secretos.
