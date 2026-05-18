# Deploy — bot de Telegram de Guanaco

Pasos para desplegar la Edge Function `telegram-bot` y conectarla a Telegram.

## 1. Pre-requisitos

- Tener instalado el [Supabase CLI](https://supabase.com/docs/guides/cli) y estar logueado (`supabase login`).
- Estar lincado al proyecto: `supabase link --project-ref <PROJECT_REF>`.
- Tener cargados estos secrets en Supabase (Dashboard → Project Settings → Edge Functions → Secrets):
  - `TELEGRAM_BOT_TOKEN` — token del bot de Telegram (creado con [@BotFather](https://t.me/BotFather)).
  - `ANTHROPIC_API_KEY` — API key de Anthropic (Claude).
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta la plataforma automáticamente.

Si todavía no están cargados, podés setearlos así:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

## 2. Deployar la Edge Function

Desde la raíz del repo:

```bash
supabase functions deploy telegram-bot --no-verify-jwt
```

`--no-verify-jwt` es importante porque el webhook de Telegram no manda JWT — la Edge Function se expone pública y validamos por el token de bot.

## 3. Registrar el webhook en Telegram

Reemplazá `<BOT_TOKEN>` por el token del bot y `<PROJECT_REF>` por el ref del proyecto de Supabase:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot"}'
```

Verificar que quedó bien:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

Deberías ver `"url": "https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot"` y `"pending_update_count": 0`.

## 4. Probar

Abrí el chat con el bot en Telegram y mandá:

- `/start` → saludo de bienvenida.
- `¿Cómo está Belgrano?` → estado de la sede.
- `¿Qué tareas están vencidas?` → listado con días de atraso.
- `Dame un resumen general` → panorama por sede.

## 5. Ver logs / debug

```bash
supabase functions logs telegram-bot --tail
```

## 6. Borrar el webhook (si querés desconectarlo)

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"
```
