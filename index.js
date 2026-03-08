const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const https = require('https');
const sqlite3 = require('sqlite3');
const { load } = require('sqlite-vec');

module.exports = function(api) {
  // Wrap async init in an IIFE to keep module.exports sync
  (async () => {

  const STATE_DIR = api.runtime.state.resolveStateDir();
  const CORE_CACHE_FILE = path.join(STATE_DIR, "telegram", "sticker-cache.json");
  const METADATA_DIR = "/root/.openclaw/workspace/stickers_metadata";
  
  if (!fs.existsSync(METADATA_DIR)) {
    fs.mkdirSync(METADATA_DIR, { recursive: true });
  }

  let db = null;
  let embeddingContext = null;
  let isModelLoading = false;

  function ensureDB() {
    if (!db) {
      try {
        db = new sqlite3.Database('/root/.cache/qmd/index.sqlite');
        load(db);
      } catch (e) {
        api.logger.error("[Stickers] Failed to load vector db: " + e.message);
      }
    }
    return db;
  }

  async function ensureVectorModel() {
    if (embeddingContext || isModelLoading) return embeddingContext;
    isModelLoading = true;
    try {
      const { getLlama } = await import("node-llama-cpp");
      const llama = await getLlama();
      const model = await llama.loadModel({
        modelPath: "/root/.cache/qmd/models/hf_ggml-org_embeddinggemma-300M-Q8_0.gguf"
      });
      embeddingContext = await model.createEmbeddingContext();
    } catch (e) {
      api.logger.error("[Stickers] Failed to lazy-load embedding model: " + e.message);
    }
    isModelLoading = false;
    return embeddingContext;
  }

  // Helper to run commands
  function runCmd(cmd) {
    try {
      return cp.execSync(cmd).toString().trim();
    } catch (e) {
      api.logger.error(`Command failed: ${cmd} - ${e.message}`);
      return null;
    }
  }

  // Get Bot Token
  function getBotToken() {
    return runCmd("jq -r .channels.telegram.botToken ~/.openclaw/openclaw.json");
  }

  // Telegram API helper
  async function tgRequest(method, params = {}) {
    const token = getBotToken();
    if (!token) throw new Error("Bot token not found");
    return new Promise((resolve, reject) => {
      const url = `https://api.telegram.org/bot${token}/${method}`;
      const req = https.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const result = JSON.parse(data);
          if (result.ok) resolve(result.result);
          else reject(new Error(result.description));
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(params));
      req.end();
    });
  }

  // Helper for admin notifications
  async function notifyAdmin(text) {
    const pCfg = api.config?.plugins?.entries?.['telegram-stickers']?.config || {};
    const target = pCfg.notifyChatId;
    if (!target) return;
    try {
      await tgRequest('sendMessage', { chat_id: target, text });
    } catch (e) {
      api.logger.warn(`Failed to notify admin: ${e.message}`);
    }
  }

  // Task Queue for Background Service
  const queue = [];
  let isProcessing = false;

  async function processQueue() {
    if (isProcessing || queue.length === 0) return;
    isProcessing = true;
    
    while (queue.length > 0) {
      const setName = queue.shift();
      try {
        api.logger.info(`[Stickers] Syncing set: ${setName}`);
        await notifyAdmin(`🔄 [Stickers] 开始同步表情包合集: ${setName}`);
        
        const stickerSet = await tgRequest('getStickerSet', { name: setName });
        let processedCount = 0;
        
        for (const sticker of stickerSet.stickers) {
          const qmdPath = path.join(METADATA_DIR, `${sticker.file_unique_id}.qmd`);
          if (fs.existsSync(qmdPath)) continue;

          api.logger.info(`[Stickers] Captioning sticker ${sticker.file_unique_id} in ${setName}...`);
          
          // 1. Get File Path
          const fileInfo = await tgRequest('getFile', { file_id: sticker.file_id });
          const downloadUrl = `https://api.telegram.org/file/bot${getBotToken()}/${fileInfo.file_path}`;
          
          // 2. Vision Caption
          const prompt = "请用中文详细描述这个表情包的情绪、动作和角色特征。如果是二次元风格，请注明。简洁但要有表现力。";
          
          let caption = "无法生成描述";
          try {
            const pCfg = api.config?.plugins?.entries?.['telegram-stickers']?.config || {};
            const scriptPath = path.join(__dirname, "describe_sticker.js");
            const child = cp.spawnSync('node', [scriptPath, downloadUrl, prompt], {
              env: {
                ...process.env,
                VLM_API_KEY: pCfg.vlmApiKey || "",
                VLM_MODEL: pCfg.vlmModel || "gemini-3.1-flash-lite-preview"
              }
            });
            const result = child.stdout.toString().trim();
            if (result) caption = result;
            if (child.stderr && child.stderr.length > 0) {
              const stderrStr = child.stderr.toString().trim();
              if (stderrStr) api.logger.warn(`[Stickers] VLM script stderr: ${stderrStr}`);
            }
          } catch (e) {
            api.logger.error(`[Stickers] VLM script failed: ${e.message}`);
          }

          // 3. Write QMD
          const content = `---
file_id: "${sticker.file_id}"
file_unique_id: "${sticker.file_unique_id}"
emoji: "${sticker.emoji}"
set_name: "${setName}"
---
# Sticker Description
${caption}`;
          
          fs.writeFileSync(qmdPath, content);
          processedCount++;

          // 4. Update Core Cache to "poison" it
          try {
            const coreCache = JSON.parse(fs.readFileSync(CORE_CACHE_FILE, 'utf8'));
            coreCache.stickers[sticker.file_unique_id] = {
              fileId: sticker.file_id,
              fileUniqueId: sticker.file_unique_id,
              emoji: sticker.emoji,
              setName: setName,
              description: caption,
              cachedAt: new Date().toISOString(),
              receivedFrom: "plugin:telegram-stickers"
            };
            fs.writeFileSync(CORE_CACHE_FILE, JSON.stringify(coreCache, null, 2));
          } catch (e) {
            api.logger.warn("Failed to update core sticker cache: " + e.message);
          }
        }

        api.logger.info(`[Stickers] Set ${setName} processed (${processedCount} new). Updating QMD index...`);
        runCmd(`qmd collection add ${METADATA_DIR} --name stickers --mask "**/*.qmd" || true`);
        runCmd(`cd ${METADATA_DIR} && qmd update`);
        runCmd(`qmd embed`);
        
        await notifyAdmin(`✅ [Stickers] 表情包合集 ${setName} 同步完成，新增 ${processedCount} 张！`);
      } catch (err) {
        api.logger.error(`[Stickers] Error processing set ${setName}: ${err.message}`);
        await notifyAdmin(`❌ [Stickers] 同步表情包合集 ${setName} 失败: ${err.message}`);
      }
    }
    isProcessing = false;
  }

  // Use Register Service for background queue processing
  let syncInterval;
  api.registerService({
    id: "telegram-stickers-sync",
    start: () => {
      syncInterval = setInterval(() => {
        processQueue().catch(e => api.logger.error("Sync error: " + e));
      }, 5000);
    },
    stop: () => {
      if (syncInterval) clearInterval(syncInterval);
    }
  });

  // Message Handler for Auto-Steal via `api.on` (Classic Method)
  if (api.on) {
    api.on('message_received', async (event, ctx) => {
      // Only process telegram messages
      const channel = event.metadata?.channel || event.metadata?.originatingChannel;
      if (channel !== 'telegram') return;
      
      if (!event.content || (!event.content.includes('<media:sticker>') && !event.content.includes('sticker'))) return;

      const pCfg = api.config?.plugins?.entries?.['telegram-stickers']?.config || {};
      const autoCollect = pCfg.autoCollect !== false;
      if (!autoCollect) return;

      setTimeout(() => {
        try {
          const cache = JSON.parse(fs.readFileSync(CORE_CACHE_FILE, 'utf8'));
          const senderId = event.metadata?.senderId || event.from?.split(':')?.[1];
          if (!senderId) return;

          const lastSticker = Object.values(cache.stickers)
            .filter(s => s.receivedFrom === `telegram:${senderId}`)
            .sort((a, b) => new Date(b.cachedAt) - new Date(a.cachedAt))[0];

          if (lastSticker && lastSticker.setName && !queue.includes(lastSticker.setName)) {
            api.logger.info(`[Stickers] Detected new sticker from set: ${lastSticker.setName}. Queuing for sync.`);
            queue.push(lastSticker.setName);
          }
        } catch (e) {
          api.logger.error("Failed to detect sticker set from cache: " + e.message);
        }
      }, 2000);
    });
  }

  // Explicit sync tool
  api.registerTool({
    name: "sync_sticker_set_by_name",
    emoji: "📥",
    description: "通过表情包合集的名字（或者包含名字的链接）来手动同步一个 Telegram 表情包合集。当用户发给你一个表情包链接，或者告诉你合集名字让你收集时调用。",
    parameters: {
      type: "object",
      properties: {
        setNameOrUrl: {
          type: "string",
          description: "合集的名字（例如：AnimalPack）或者合集的分享链接（例如：https://t.me/addstickers/AnimalPack）"
        }
      },
      required: ["setNameOrUrl"]
    },
    async execute(id, params, context) {
      try {
        let targetSetName = params.setNameOrUrl.trim();

        // If it's a URL, extract the set name from the end
        if (targetSetName.includes("t.me/addstickers/")) {
          const parts = targetSetName.split("/");
          targetSetName = parts[parts.length - 1].split("?")[0]; // remove any query params
        }

        if (!targetSetName) {
          return { content: [{ type: "text", text: `无法从你提供的参数中提取合集名称，请检查格式！` }] };
        }

        if (queue.includes(targetSetName)) {
          return { content: [{ type: "text", text: `表情包合集 ${targetSetName} 已经在同步队列中啦！` }] };
        }

        queue.push(targetSetName);
        return { content: [{ type: "text", text: `好的！我已经把合集 ${targetSetName} 加入后台同步队列了，同步完成后我会再通知。` }] };
      } catch (e) {
        return { content: [{ type: "text", text: `同步任务提交失败: ${e.message}` }] };
      }
    }
  });

  api.registerTool({
    name: "get_sticker_stats",
    emoji: "📊",
    description: "查询当前表情包库中已处理和索引的表情包数量。当用户询问表情包库状态、进度时调用。",
    parameters: { type: "object", properties: {} },
    async execute() {
      const count = runCmd(`ls -1 ${METADATA_DIR}/*.qmd 2>/dev/null | wc -l`) || "0";
      return { content: [{ type: "text", text: `当前表情包库中共索引了 ${count.trim()} 张表情包。` }] };
    }
  });

  api.registerTool({
    name: "search_sticker_by_emotion",
    emoji: "🔎",
    description: "通过语义（情感、动作、特征）搜索表情包库，并返回匹配的 sticker_id，用于随后通过 message(action=sticker) 发送。\n构建 query 时，请使用具体的情绪、动作、视觉特征的中文词汇组合（如 '开心 笑着 跑' 或 '无奈 叹气 摆烂'）。",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "表情包的语义搜索词（例如：'开心 笑着 跑'）"
        }
      },
      required: ["query"]
    },
    async execute(id, params, context) {
      api.logger.info(`[Stickers] Semantic search for: "${params.query}"`);
      const searchStart = Date.now();
      let results = [];

      try {
        const embCtx = await ensureVectorModel();
        const database = ensureDB();
        if (!database || !embCtx) {
          return { content: [{ type: "text", text: "表情包系统未就绪（数据库或模型加载失败），请稍后再试或检查日志。" }] };
        }
        
        // 1. Generate Embedding in-memory
        const embedding = await embCtx.getEmbeddingFor(params.query);
        const vecJson = JSON.stringify(Array.from(embedding.vector));

        // 2. Query SQLite
        const sql = `
          SELECT d.title, v.distance 
          FROM vectors_vec v 
          JOIN documents d ON v.hash_seq = (d.hash || '_0')
          WHERE v.embedding MATCH ? AND v.k = 10
          ORDER BY v.distance ASC
        `;
        
        results = await new Promise((resolve, reject) => {
          database.all(sql, [vecJson], (err, rows) => {
            if (err) reject(err); else resolve(rows);
          });
        });

        const queryDuration = Date.now() - searchStart;
        api.logger.info(`[Stickers] Search for "${params.query}" took ${queryDuration}ms`);

        if (!results || results.length === 0) {
          return { content: [{ type: "text", text: "未找到语义匹配的表情包，请更换关键词重试。" }] };
        }

        // --- Temperature-based random sampling ---
        const temperature = 0.5; // Higher = more random, Lower = strictly top 1
        
        // 1. Calculate unnormalized weights
        const weights = results.map(r => {
          let similarity = Math.max(0, 1 - (r.distance / 2));
          return Math.exp(similarity / temperature);
        });

        // 2. Calculate total sum of weights
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        // 3. Roll the dice [0, totalWeight)
        let randomVal = Math.random() * totalWeight;
        let pickedIndex = 0;
        
        for (let i = 0; i < weights.length; i++) {
          randomVal -= weights[i];
          if (randomVal <= 0) {
            pickedIndex = i;
            break;
          }
        }
        
        const picked = results[pickedIndex];
        api.logger.info(`[Stickers] Selected #${pickedIndex+1} (${picked.title}) from ${results.length} candidates`);
        const qmdPath = path.join(METADATA_DIR, `${picked.title}.qmd`);
        
        if (!fs.existsSync(qmdPath)) throw new Error(`Metadata file missing: ${qmdPath}`);
        const fileContent = fs.readFileSync(qmdPath, 'utf8');
        const fileIdMatch = fileContent.match(/file_id: "(.*?)"/);
        const fileId = fileIdMatch ? fileIdMatch[1] : null;

        if (!fileId) return { content: [{ type: "text", text: "无法从索引中解析 file_id。" }] };

        return { content: [{ type: "text", text: `{"sticker_id": "${fileId}"}` }] };

      } catch (e) {
        api.logger.error(`[Stickers] Search error: ${e.message}`);
        return { content: [{ type: "text", text: `搜索失败: ${e.message}` }] };
      }
    }
  });
  })();
};
