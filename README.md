# telegram-stickers-brain

Semantic Telegram sticker management for OpenClaw. Features VLM-powered captioning, vector search, and automated/manual collection syncing.

## Features

- **Semantic Search**: Find stickers by emotion, action, or character description (e.g., "happy smiling girl").
- **VLM Captioning**: Automatically describes stickers using Google Gemini Vision.
- **Vector Indexing**: High-performance local search using SQLite-vec and GGUF embeddings.
- **Flexible Syncing**: 
  - **Auto-Collect**: Automatically sync sticker sets from messages received in Telegram.
  - **Manual Sync**: Direct sync via sticker set name or link.
- **Admin Notifications**: Real-time progress updates for sync tasks.

## Installation

1. Clone this into your OpenClaw extensions directory:
   ```bash
   cd ~/.openclaw/extensions
   git clone <repo-url> telegram-stickers
   ```
2. Install dependencies:
   ```bash
   cd telegram-stickers
   npm install
   ```

## Configuration

Add the following to your `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "telegram-stickers": {
        "enabled": true,
        "config": {
          "vlmApiKey": "YOUR_GEMINI_API_KEY",
          "vlmModel": "gemini-3.1-flash-lite-preview",
          "autoCollect": true,
          "notifyChatId": "YOUR_TELEGRAM_ID"
        }
      }
    }
  },
  "channels": {
    "telegram": {
      "actions": {
        "sticker": true
      }
    }
  }
}
```

## Tools

- `search_sticker_by_emotion`: Returns a `sticker_id` for semantic queries.
- `sync_sticker_set_by_name`: Manually queue a set by name or `t.me` link.
- `get_sticker_stats`: Check the total number of indexed stickers.

## License

MIT
