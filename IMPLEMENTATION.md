# Telegram Stickers Plugin 实现文档

## 📋 功能完成清单

### ✅ 已完成的功能
1. **自动收集表情包集合**
   - 监听 `message_received` 事件
   - 检测表情包 metadata
   - 自动获取整个表情包集合
   - 保存 id、emoji、keywords 到数据库

2. **智能回复工具 `reply_with_sticker`**
   - 支持 emoji 参数（推荐）
   - 支持 keyword 参数
   - 支持直接 file_id
   - 详细的模型行为指南

3. **负载均衡算法**
   - LRU（最近最少使用）策略
   - 使用次数统计
   - 最后使用时间记录
   - 从最合适的几个中随机选择

4. **数据库管理工具**
   - `list_stickers`：查看统计信息
   - `add_sticker_set`：手动添加集合

5. **完整文档**
   - SKILL.md：技能说明
   - README.md：功能特性
   - EXAMPLE.md：使用示例
   - IMPLEMENTATION.md：实现文档

## 🏗️ 架构设计

### 数据流
```
用户发送表情包 → message_received hook → 检测 sticker metadata
    ↓
如果是集合表情包 → Telegram Bot API → 获取整个集合
    ↓
解析所有表情包 → 保存到 sticker_db.json
    ↓
模型调用 reply_with_sticker → 负载均衡选择 → 发送表情包
```

### 文件结构
```
/root/.openclaw/workspace/skills/telegram-stickers/
├── index.js              # 主插件代码
├── SKILL.md             # 技能文档
├── README.md            # 功能说明
├── EXAMPLE.md           # 使用示例
├── IMPLEMENTATION.md    # 实现文档
├── openclaw.plugin.json # 插件配置
└── package.json         # 包配置

/root/.openclaw/workspace/
├── sticker_db.json          # 表情包数据库
└── sticker_usage_state.json # 使用状态记录
```

## 🔧 技术细节

### 1. 自动收集机制
```javascript
api.registerHook('message_received', async (event) => {
  if (msg.meta && msg.meta.sticker) {
    const sticker = msg.meta.sticker;
    if (sticker.set_name) {
      // 获取整个集合
      const stickerSet = await getStickerSet(setName);
      // 保存所有表情包
    }
  }
});
```

### 2. 负载均衡算法
```javascript
// 排序：使用次数少 + 最后使用时间早
matches.sort((a, b) => {
  const countA = state.counts[a.id] || 0;
  const countB = state.counts[b.id] || 0;
  if (countA !== countB) return countA - countB;
  return (state.last_used[a.id] || 0) - (state.last_used[b.id] || 0);
});

// 从最合适的几个中随机选择
const topCandidates = matches.slice(0, Math.min(3, matches.length));
const picked = topCandidates[Math.floor(Math.random() * topCandidates.length)];
```

### 3. 模型行为指南
包含在 `reply_with_sticker` 的 description 中：
- 何时使用（4种场景）
- 如何选择 emoji（情感映射表）
- 负载均衡说明
- 使用建议和注意事项

## 🎯 模型调用示例

### 场景 1：用户开心时
```javascript
// 用户："今天天气真好！"
reply_with_sticker({ emoji: "😄" })
```

### 场景 2：用户困惑时  
```javascript
// 用户："这个代码什么意思？"
reply_with_sticker({ emoji: "🤔" })
// 或
reply_with_sticker({ keyword: "confused" })
```

### 场景 3：Sticker Battle
```javascript
// 用户先发表情包
// 自动收集后，回应类似表情
reply_with_sticker({ emoji: "😊" })
```

### 场景 4：明确要求
```javascript
// 用户："发个表情包"
reply_with_sticker({ emoji: "😂" })
```

## 📈 扩展可能性

### 1. 高级匹配算法
- 语义分析用户消息
- 机器学习情感识别
- 上下文感知选择

### 2. 用户偏好学习
- 记录用户对不同表情包的反应
- 学习用户偏好
- 个性化推荐

### 3. 多平台支持
- 扩展支持其他聊天平台
- 统一表情包管理
- 跨平台同步

### 4. 数据分析
- 使用统计可视化
- 热门表情包分析
- 使用模式识别

## 🔍 测试验证

### 已测试功能
1. ✅ 插件加载正常（3个工具 + 1个hook）
2. ✅ 数据库转换正常（120个表情包）
3. ✅ 状态文件创建正常
4. ✅ 统计查询正常

### 待测试功能
1. 🔄 实际 Telegram 消息接收
2. 🔄 自动集合获取
3. 🔄 实际表情包发送
4. 🔄 负载均衡效果

## 🚀 部署步骤

1. **确保配置正确**
   ```bash
   # 检查 Telegram Bot Token
   cat ~/.openclaw/openclaw.json | jq .channels.telegram.botToken
   ```

2. **启用插件**
   - 插件已放置在正确位置
   - OpenClaw 会自动加载

3. **测试功能**
   ```javascript
   // 发送测试表情包
   list_stickers({ filter: "all" })
   ```

4. **开始使用**
   - 用户在 Telegram 发送表情包
   - 系统自动收集
   - 使用 `reply_with_sticker` 回复

## 📝 注意事项

### 安全性
- Bot Token 安全存储
- 只处理授权的对话
- 不存储敏感信息

### 性能
- 数据库使用 JSON 文件，适合小规模
- 大量表情包时考虑数据库优化
- 定期清理无效 file_id

### 兼容性
- 依赖 Telegram Bot API
- 需要网络连接
- 支持标准表情包格式

## 🎉 总结

这个 Telegram Stickers Plugin 实现了：
1. **自动化收集**：用户发送即自动获取整个集合
2. **智能回复**：根据情感智能选择表情包
3. **负载均衡**：确保表情包使用多样性
4. **完整文档**：详细的模型行为指南

插件已准备好投入使用，只需用户在 Telegram 中发送表情包即可开始自动收集，然后就可以使用 `reply_with_sticker` 进行智能回复了！