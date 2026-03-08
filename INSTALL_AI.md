# OpenClaw Agent Installation Guide: @roitium/telegram-stickers-brain

This guide is designed for OpenClaw agents to automate the installation and configuration of the Telegram Stickers Brain plugin.

## Prerequisites
The agent must have permissions to execute shell commands and modify the `openclaw.json` configuration.

## Step 1: Install System Dependencies (QMD)
QMD is the vector search engine used by this plugin. Install it globally:
```bash
npm install -g @tobilu/qmd
```

## Step 2: Install the Plugin
Use the OpenClaw CLI to install the plugin:
```bash
openclaw plugins install @roitium/telegram-stickers-brain
```

## Step 3: Rebuild Native Bindings
Since OpenClaw skips `postinstall` scripts for security, the `better-sqlite3` native bindings must be rebuilt manually to match the host environment:
```bash
cd ~/.openclaw/extensions/telegram-stickers-brain/node_modules/better-sqlite3
npx node-gyp rebuild
```

## Step 4: Configure the Plugin
Update `~/.openclaw/openclaw.json` with the following configuration under `plugins.entries["telegram-stickers-brain"].config`. 

**Required parameters:**
- `vlmApiKey`: Gemini API Key for image captioning.
- `vlmModel`: Suggested `gemini-3.1-flash-lite-preview`.
- `autoCollect`: `false` (recommended).
- `notifyChatId`: Your Telegram ID for sync notifications.

Example:
```json
{
  "plugins": {
    "entries": {
      "telegram-stickers-brain": {
        "enabled": true,
        "config": {
          "vlmApiKey": "YOUR_GEMINI_API_KEY",
          "vlmModel": "gemini-3.1-flash-lite-preview",
          "autoCollect": false,
          "notifyChatId": "YOUR_CHAT_ID"
        }
      }
    }
  }
}
```

## Step 5: Setup Maintenance Cron
To keep the vector index healthy, schedule a recurring task (every 12 hours):
```bash
openclaw cron add "0 */12 * * *" "qmd update && qmd embed" --label "stickers-maintenance"
```

## Step 6: Reload Gateway
After configuration, restart the OpenClaw gateway:
```bash
# Run doctor first to verify config
openclaw doctor
# If clean, restart (requires user confirmation in active sessions)
systemctl --user restart openclaw-gateway.service
```
