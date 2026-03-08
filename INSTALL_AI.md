# OpenClaw Agent Installation & Configuration Guide: @roitium/telegram-stickers-brain

This guide is designed for OpenClaw agents to fully automate the setup of the Telegram Stickers Brain plugin.

## Phase 1: Environment Preparation

1.  **Check Package Manager**: Determine if `bun` or `npm` is the preferred manager in the current environment (check for `bun.lockb` or `package-lock.json`).
2.  **Install QMD**: Install the vector search engine globally using the preferred manager:
    *   `bun install -g @tobilu/qmd` OR `npm install -g @tobilu/qmd`

## Phase 2: Plugin Installation

1.  **Install Plugin**:
    ```bash
    openclaw plugins install @roitium/telegram-stickers-brain
    ```
2.  **Rebuild Native Bindings**: Better-sqlite3 MUST be rebuilt to match the host Node.js version:
    ```bash
    cd ~/.openclaw/extensions/telegram-stickers-brain/node_modules/better-sqlite3
    npx node-gyp rebuild
    ```

## Phase 3: Core Configuration (openclaw.json)

1.  **Enable Sticker Actions**: Ensure Telegram sticker actions are enabled in `channels.telegram.actions.sticker`.
2.  **Plugin Allowlist**: If `plugins.allow` exists in the configuration, add `telegram-stickers-brain` to the list.
3.  **Find Credentials**:
    *   Search existing config or environment variables for a valid Gemini API Key.
    *   If not found, **ASK the user** for the API Key.
4.  **User Preferences**:
    *   **ASK the user** if they want to enable `autoCollect` (default: `false`).
    *   **ASK the user** for their Telegram Chat ID to receive sync notifications (`notifyChatId`).

## Phase 4: Plugin Config Block

Apply the configuration to `plugins.entries["telegram-stickers-brain"].config`:
```json
{
  "vlmApiKey": "SEARCHED_OR_USER_PROVIDED",
  "vlmModel": "gemini-3.1-flash-lite-preview",
  "autoCollect": false,
  "notifyChatId": "USER_PROVIDED_ID"
}
```

## Phase 5: Maintenance & Verification

1.  **Schedule Cron**: Add a maintenance task every 12 hours. Use the `none` delivery mode to ensure it runs silently without channel notifications:
    *   `openclaw cron add "0 */12 * * *" "qmd update && qmd embed" --label "stickers-maintenance" --delivery none`
2.  **Verify**: Run `openclaw doctor` to ensure the schema is valid.
3.  **Summarize & Confirm**: 
    *   Present a summary to the user: what was configured, which keys were used, and what preferences were set.
    *   **Request a Gateway Restart** using Telegram Inline Buttons (success: `✅ 授权重启`, danger: `❌ 驳回`).
    *   DO NOT restart without explicit user approval via callback.
