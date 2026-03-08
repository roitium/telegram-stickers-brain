# Telegram Stickers Skill

一个完整的 Telegram 表情包管理插件，支持自动收集表情包集合、智能回复和负载均衡。

## 功能特性

### 🎯 核心功能
1. **自动收集表情包集合** - 当用户发送表情包时，自动获取整个集合
2. **智能回复工具** - 根据情感智能选择表情包回复
3. **负载均衡算法** - 均匀使用同一 emoji 下的不同表情包
4. **数据库管理** - 查看和管理已收集的表情包

### 🔧 可用工具

#### 1. `reply_with_sticker` - 发送表情包回复
**使用场景：**
- 用户明确要求表情包
- 用户先发表情包（sticker battle）
- 表达强烈情感（开心、悲伤、困惑等）
- 调节对话氛围

**参数：**
- `emoji` (推荐): 表情符号，如 😂, 😭, 🤔
- `keyword`: 关键词，如 "laugh", "cry", "angry"
- `file_id`: 直接指定表情包 ID

**负载均衡策略：**
- 对于同一 emoji 的多个表情包，系统自动：
  - 记录每个表情包的使用次数
  - 记录最后使用时间
  - 优先选择使用次数最少且最久未使用的
  - 从最合适的几个中随机选择（增加多样性）

#### 2. `list_stickers` - 查看数据库
查看表情包统计信息：
- 总表情包数量
- 表情包集合列表
- 按 emoji 分组统计
- 使用次数统计

#### 3. `add_sticker_set` - 手动添加集合
通过集合名称手动添加表情包集合。

## 🧠 模型行为指南

### 情感映射表
| 用户情感/意图 | 推荐 emoji | 关键词示例 |
|--------------|-----------|-----------|
| 开心/大笑 | 😂 😄 🥰 | laugh, happy, joy |
| 悲伤/哭泣 | 😭 😢 💔 | sad, cry, tear |
| 困惑/疑问 | 🤔 🧐 ❓ | confused, thinking |
| 惊讶/震惊 | 😮 😲 🫢 | surprised, shocked |
| 愤怒/不满 | 😠 😡 🤬 | angry, mad |
| 可爱/喜欢 | 🥰 😍 😘 | cute, love |
| 尴尬/无奈 | 😅 😓 🫠 | awkward, sweat |

### 调用时机判断
✅ **应该使用的情况：**
1. 用户明确要求："发个表情包"、"来个😂"
2. 用户先发表情包（回应 sticker battle）
3. 对话达到强烈情感节点
4. 需要轻松氛围调节
5. 简短回应比文字更合适时

❌ **应该避免的情况：**
1. 严肃话题讨论
2. 每个回复都用表情包（保持平衡）
3. 用户正在寻求详细解答
4. 正式场合或工作讨论

### 使用示例
```javascript
// 回应开心
reply_with_sticker({ emoji: "😂" })

// 回应困惑
reply_with_sticker({ keyword: "confused" })

// 指定表情包
reply_with_sticker({ file_id: "CAACAgUAAxUAAWmrjuR_t_7hiouNwDwNVCIJlh8N" })
```

## ⚙️ 技术实现

### 自动收集机制
1. 监听 `message_received` 事件
2. 检查消息是否包含表情包 metadata
3. 如果表情包属于集合，通过 Telegram Bot API 获取整个集合
4. 解析并保存所有表情包的 id、emoji、keywords
5. 更新本地 JSON 数据库

### 数据库结构
```json
{
  "sets": {
    "Baishengnv": {
      "title": "白圣女",
      "name": "Baishengnv",
      "stickers_count": 120,
      "added_at": "2024-01-01T00:00:00Z"
    }
  },
  "stickers": [
    {
      "id": "CAACAgUAAxUAAWmrjuR_t_7hiouNwDwNVCIJlh8N",
      "emoji": "😕",
      "set_name": "Baishengnv",
      "keywords": [],
      "added_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 使用状态记录
```json
{
  "counts": {
    "CAACAgUAAxUAAWmrjuR_t_7hiouNwDwNVCIJlh8N": 5
  },
  "last_used": {
    "CAACAgUAAxUAAWmrjuR_t_7hiouNwDwNVCIJlh8N": 1709798400000
  }
}
```

## 📁 文件位置
- 插件代码: `/root/.openclaw/workspace/skills/telegram-stickers/`
- 数据库: `/root/.openclaw/workspace/sticker_db.json`
- 使用状态: `/root/.openclaw/workspace/sticker_usage_state.json`

## 🚀 快速开始
1. 确保 Telegram Bot Token 已配置
2. 用户发送一个表情包（自动开始收集）
3. 使用 `reply_with_sticker` 工具回复
4. 使用 `list_stickers` 查看收集情况

## 🔍 调试提示
- 使用 `list_stickers` 查看数据库状态
- 检查日志中的 "Received sticker:" 消息
- 确保 Bot 有权限获取表情包集合
- 单个表情包（不属于集合）也会被记录

## 📝 最佳实践
1. **适度使用**：不要过度使用表情包
2. **情感匹配**：选择与用户情感匹配的 emoji
3. **多样性**：让系统自动处理负载均衡
4. **情境判断**：在合适的场合使用表情包
5. **组合使用**：可以结合文字和表情包一起回复