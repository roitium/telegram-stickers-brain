# Telegram Stickers Plugin 使用示例

## 🚀 快速开始

### 1. 自动收集表情包
当用户在 Telegram 中发送表情包时，插件会自动：
- 检测表情包 metadata
- 如果是集合表情包，获取整个集合
- 保存所有表情包的 id、emoji、keywords
- 更新本地数据库

### 2. 使用表情包回复

#### 示例 1：回应开心
```javascript
// 用户说："今天好开心啊！"
reply_with_sticker({ emoji: "😂" })
// 系统会自动选择使用最少的 😂 表情包
```

#### 示例 2：回应困惑
```javascript
// 用户说："这个我不太明白..."
reply_with_sticker({ keyword: "confused" })
// 或
reply_with_sticker({ emoji: "🤔" })
```

#### 示例 3：Sticker Battle
```javascript
// 用户先发表情包
// 插件自动收集该表情包集合
// 回应类似的表情包
reply_with_sticker({ emoji: "😄" })
```

### 3. 查看数据库
```javascript
// 查看所有统计
list_stickers({ filter: "all" })

// 只看集合
list_stickers({ filter: "sets" })

// 只看表情分组
list_stickers({ filter: "emoji" })
```

### 4. 手动添加集合
```javascript
// 手动添加表情包集合
add_sticker_set({ set_name: "Baishengnv" })
```

## 🎭 情感映射示例

| 用户消息 | 推荐 emoji | 调用示例 |
|---------|-----------|----------|
| "哈哈太好笑了！" | 😂 | `reply_with_sticker({ emoji: "😂" })` |
| "有点难过..." | 😭 | `reply_with_sticker({ emoji: "😭" })` |
| "这是什么意思？" | 🤔 | `reply_with_sticker({ emoji: "🤔" })` |
| "哇！真的吗？" | 😮 | `reply_with_sticker({ emoji: "😮" })` |
| "气死我了！" | 😡 | `reply_with_sticker({ emoji: "😡" })` |
| "好可爱啊～" | 🥰 | `reply_with_sticker({ emoji: "🥰" })` |
| "尴尬..." | 😅 | `reply_with_sticker({ emoji: "😅" })` |

## 🔄 负载均衡演示

假设数据库中有 5 个 😂 表情包：
1. 😂_1 (使用 3 次)
2. 😂_2 (使用 1 次) 
3. 😂_3 (使用 2 次)
4. 😂_4 (使用 0 次)
5. 😂_5 (使用 1 次)

**系统选择逻辑：**
1. 按使用次数排序：😂_4(0), 😂_2(1), 😂_5(1), 😂_3(2), 😂_1(3)
2. 从使用最少的几个中随机选择：😂_4, 😂_2, 😂_5
3. 随机选择一个，比如 😂_2
4. 更新使用次数：😂_2 变成 2 次

**结果：** 所有 😂 表情包都会被均匀使用，避免重复。

## 📊 数据库结构示例

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
      "file_unique_id": "AgADUgIAAilbWFU",
      "added_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## 🛠️ 故障排除

### 问题 1：无法发送表情包
**可能原因：**
- Bot Token 未配置
- Bot 没有发送表情包权限
- 表情包 file_id 无效

**解决方案：**
1. 检查 `~/.openclaw/openclaw.json` 中的 Telegram 配置
2. 确保 Bot 是对话成员
3. 使用 `list_stickers` 检查表情包是否存在

### 问题 2：无法自动收集
**可能原因：**
- 消息 metadata 格式不匹配
- 网络问题无法访问 Telegram API
- 集合名称无效

**解决方案：**
1. 检查日志中的 "Received sticker:" 消息
2. 手动使用 `add_sticker_set` 添加集合
3. 确保 Bot 有权限获取表情包集合

### 问题 3：负载均衡不工作
**可能原因：**
- 状态文件损坏
- 只有 1 个匹配的表情包

**解决方案：**
1. 检查 `sticker_usage_state.json` 文件
2. 使用 `list_stickers` 查看同一 emoji 的表情包数量
3. 收集更多表情包增加多样性

## 💡 最佳实践

1. **适度使用**：不要每个回复都用表情包
2. **情感匹配**：选择与对话氛围匹配的表情包
3. **多样性**：让系统自动处理负载均衡
4. **情境判断**：在轻松、友好的对话中使用
5. **组合使用**：可以结合文字一起回复

## 🎯 高级用法

### 自定义关键词
可以通过修改数据库为表情包添加关键词：
```json
{
  "id": "...",
  "emoji": "😂",
  "keywords": ["laugh", "funny", "haha", "开心", "大笑"],
  ...
}
```

### 扩展情感映射
可以扩展情感映射表，支持更多 emoji：
```javascript
const emotionMap = {
  'excited': '🎉',
  'sleepy': '😴', 
  'sick': '🤒',
  'cool': '😎',
  'shy': '😊'
};
```

### 使用统计导出
可以从状态文件中导出使用统计，分析最受欢迎的表情包。