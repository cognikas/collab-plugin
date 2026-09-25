# Operación del cliente

Lo que toca al servidor (desplegar, invitaciones, revocar, rotar secretos, logs del backend) está en
el `docs/OPERATIONS.md` de [`collab-backend`](https://github.com/cognikas/collab-backend).

## Publicar un cambio del plugin

`claude plugin update` compara **versiones, no commits**. Si subes un arreglo sin tocar la versión,
todo el mundo sigue con el código viejo y el comando responde "already at the latest version" sin
ningún aviso de que hay algo nuevo.

Cada vez que cambies `plugin/src/`:

```bash
node scripts/version.mjs 1.0.1      # sube la versión en todos los sitios
pnpm build                          # regenera los bundles commiteados
pnpm typecheck && pnpm test
git commit && git push              # fuentes, dist/ y versión juntos
```

La versión vive en cinco sitios, y `scripts/version.mjs` los cambia todos:

- los dos que compara `claude plugin update`: `plugin/.claude-plugin/plugin.json` y la entrada del
  plugin en `.claude-plugin/marketplace.json`;
- los dos `package.json`;
- `PLUGIN_VERSION` en `plugin/src/lib/version.ts`, que es el `serverInfo` del servidor MCP y la
  versión que el daemon declara al suscribirse.

La versión propia del catálogo (`version` en la raíz de `marketplace.json`) es otra cosa y no se
toca. Si algún sitio se desincroniza, `pnpm test` falla (`plugin/test/versions.test.ts`).

Si el cambio necesita una versión nueva del protocolo, primero se publica el tag en
`collab-protocol`, luego se sube el tag de la dependencia en los dos `package.json` y se hace
`pnpm install`.

Y en cada máquina que lo tenga instalado:

```bash
claude plugin marketplace update cognikas
claude plugin update collab-channel@cognikas --scope local
```

El `marketplace update` es obligatorio: sin él se compara contra el catálogo cacheado y la versión
nueva no se ve. El plugin se recarga al arrancar la siguiente sesión.

## Diagnóstico

Desde la sesión afectada:

```
/collab-join
```

Ejecuta `cli.mjs doctor`, que revisa configuración, credenciales, daemon y socket, y muestra las
últimas líneas del log. A mano:

```bash
node plugin/dist/cli.mjs doctor
node plugin/dist/cli.mjs status
cat "$CLAUDE_PLUGIN_DATA/v1/sessions/<session_id>/daemon.log"
```

`status` y `collab_status` incluyen la línea `Server:` con la versión del backend y el protocolo
acordado en el último `hello`.

### Síntomas frecuentes

| Síntoma | Causa probable |
|---|---|
| El plugin está instalado pero no pasa nada, y `/mcp` muestra el servidor `collab` como `failed` | falta Node.js ≥ 20 en el `PATH`. Instálalo y reinicia Claude Code desde una terminal nueva |
| «api_endpoint is not configured» | falta rellenar `/config` → Collaboration Channel |
| «no credentials and no invite_code» | la invitación ya se canjeó en otra máquina, o nunca se puso. También pasa al cambiar `api_endpoint`: las credenciales solo valen en el backend que las emitió |
| «the channel backend does not speak this plugin's protocol» | `api_endpoint` apunta a un backend que no habla `collab.v1` (por ejemplo el de 0.6), o el plugin quedó atrás de una mayor nueva. El daemon deja de reconectar hasta la próxima sesión |
| «this member was revoked» | un administrador revocó tu credencial. Hace falta una invitación nueva |
| El daemon corre pero el socket está caído | mira `daemon.log`: si dice `ticket failed` con `UNAUTHENTICATED`, la credencial no es válida en ese backend |
| El peer no ve mis mensajes | comprueba con `/collab-status` que estáis en el mismo canal, y que el mensaje fue a su tema o a su handle |
| `NAME_TAKEN` al unirse | otro miembro ya tiene ese handle. Elige otro nombre visible; la invitación sigue valiendo |
| Un mensaje urgente no llega hasta el final del turno | `midturn_min_urgency` está en `off` o por encima de la urgencia del mensaje, o `delivery_mode` es `prompt`/`manual` |
| Nada se inyecta al terminar el turno | `delivery_mode` está en `manual` o `prompt`, o `stop_min_urgency` es más alta que la urgencia del mensaje |
| En modo `channel`, un mensaje con la sesión inactiva espera al próximo prompt | la sesión no se arrancó con `--dangerously-load-development-channels plugin:collab-channel@cognikas`, o el push se dio por descartado. `/collab-status` lo dice en la línea `Delivery:` |

El estado del modo `channel` vive en `sessions/<session_id>/channel.json`, y lo que ven los hooks del
turno en curso, en `turn.json`. Los errores del bucle de push van al stderr del servidor MCP:
`claude --debug` los deja en `~/.claude/debug/<session-id>.txt`.

## Pruebas

```bash
pnpm build                          # stop-guard.test.ts ejecuta el hook compilado
pnpm typecheck                      # incluye los tests
pnpm test                           # unitarias, sin red
```

Contra un backend 1.0 desplegado, `scripts/mcp-check.mjs` habla MCP con el servidor del plugin y
ejerce todas las herramientas en un canal desechable, con su propio directorio de datos, y apaga al
terminar el daemon que arranca:

```bash
# en collab-backend: una invitación para un canal desechable
node scripts/invite.mjs --channel mcpcheck-$(date +%s) --label mcp-check

# aquí, sin clave de admin
COLLAB_API_ENDPOINT=<HttpEndpoint> node scripts/mcp-check.mjs --invite <código>
```

Con `COLLAB_ADMIN_KEY` definida (en CI, por ejemplo) se puede omitir `--invite` y el script emite la
invitación él mismo.

Para probar el plugin a mano sin un segundo equipo, `scripts/fake-peer.mjs` hace de segunda sesión:

```bash
node scripts/fake-peer.mjs join --endpoint <url> --invite <código> --name ana
node scripts/fake-peer.mjs send --type done --text "terminé el endpoint /login" --to-topic collab-global
node scripts/fake-peer.mjs send --text "¿lo revisas?" --to-user carlos
node scripts/fake-peer.mjs watch --topic collab-global
node scripts/fake-peer.mjs state --topic collab-global
```

Cada comando actúa como una sesión en un tema (`--topic`, por defecto `general`).

## Probar 1.0 junto a 0.6

Mientras la 0.6 sigue siendo el canal del día a día, la 1.0 se prueba en **sesiones aparte**, sin
tocar la instalación del marketplace (los dos marketplaces se llaman `cognikas` y no pueden estar a
la vez hasta el cambio):

1. En el proyecto de prueba, desactiva la 0.6 solo ahí, para que sus hooks y su servidor MCP no
   corran junto a los de la 1.0: `/plugin` → collab-channel → *Disable* con alcance de proyecto
   (o `claude plugin disable collab-channel@cognikas --scope local` desde esa carpeta).
2. Configura la 1.0 por entorno, porque un plugin cargado desde una carpeta no tiene sus opciones de
   `/config`:

   ```bash
   export COLLAB_API_ENDPOINT=<HttpEndpoint de CollabBackendStack>
   export COLLAB_INVITE_CODE=<invitación del backend 1.0>
   export COLLAB_DISPLAY_NAME=<tu nombre>
   claude --plugin-dir <ruta a collab-plugin>/plugin
   ```

3. Comprueba con `/collab-status` que la línea `Server:` dice protocolo 1.0.

Los datos de una sesión así viven en el `CLAUDE_PLUGIN_DATA` que Claude Code asigne al plugin
cargado desde carpeta, siempre bajo `v1/`, así que no pisan los de la 0.6.
