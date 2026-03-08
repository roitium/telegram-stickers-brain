// 迁移现有 baishengnv_stickers.json 到新格式
const fs = require('fs');
const path = require('path');

const OLD_FILE = '/root/.openclaw/workspace/baishengnv_stickers.json';
const NEW_FILE = '/root/.openclaw/workspace/sticker_db.json';

try {
  // 读取旧文件
  const oldData = JSON.parse(fs.readFileSync(OLD_FILE, 'utf8'));
  
  // 创建新格式
  const newData = {
    sets: {
      "Baishengnv": {
        title: oldData.title || "白圣女",
        name: "Baishengnv",
        is_animated: false,
        is_video: false,
        contains_masks: false,
        stickers_count: oldData.count || oldData.stickers.length,
        added_at: new Date().toISOString()
      }
    },
    stickers: []
  };
  
  // 转换 stickers
  oldData.stickers.forEach((sticker, index) => {
    newData.stickers.push({
      id: sticker.id,
      emoji: sticker.emoji || '❓',
      set_name: "Baishengnv",
      keywords: [], // 旧数据没有 keywords，可以留空或根据 emoji 推断
      file_unique_id: sticker.unique_id || `unknown_${index}`,
      type: "regular",
      width: 512, // 默认值
      height: 512,
      file_size: null,
      added_at: new Date().toISOString()
    });
  });
  
  // 保存新文件
  fs.writeFileSync(NEW_FILE, JSON.stringify(newData, null, 2));
  console.log(`✅ 迁移完成！`);
  console.log(`   旧文件: ${OLD_FILE} (${oldData.stickers.length} 个表情包)`);
  console.log(`   新文件: ${NEW_FILE}`);
  console.log(`   集合: Baishengnv (${newData.sets.Baishengnv.stickers_count} 个表情包)`);
  
  // 创建初始使用状态文件
  const stateFile = '/root/.openclaw/workspace/sticker_usage_state.json';
  const initialState = {
    counts: {},
    last_used: {}
  };
  
  // 初始化所有表情包的使用次数为 0
  newData.stickers.forEach(sticker => {
    initialState.counts[sticker.id] = 0;
    initialState.last_used[sticker.id] = 0;
  });
  
  fs.writeFileSync(stateFile, JSON.stringify(initialState, null, 2));
  console.log(`✅ 创建使用状态文件: ${stateFile}`);
  
} catch (error) {
  console.error('迁移失败:', error.message);
  process.exit(1);
}