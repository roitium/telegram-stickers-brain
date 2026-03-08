# Telegram Stickers Plugin - 安装配置指南

## 📦 安装步骤

### 1. 确保插件目录存在
```bash
cd /root/.openclaw/workspace/skills/
mkdir -p telegram-stickers
```

### 2. 复制所有文件
将以下文件复制到 `telegram-stickers/` 目录：
- `index.js` - 主插件代码
- `SKILL.md` - 技能说明
- `openclaw.plugin.json` - 插件配置
- `package.json` - Node.js 包配置
- `README.md` - 详细说明
- `MODEL_GUIDE.md` - 模型使用指南
- `migrate_existing.js` - 数据迁移脚本

### 3. 迁移现有数据（如果有）
```bash
cd /root/.openclaw/workspace/skills/telegram-stickers
node migrate_existing.js
```

### 4. 配置 Telegram Bot Token
确保 `~/.openclaw/openclaw.json` 中包含 Telegram Bot Token：
```json
{
  "channels": {
    "telegram": {
      "botToken": "YOUR_BOT_TOKEN_HERE",
      "enabled": true
    }
  }
}
```

### 5. 启用插件
插件会自动被 OpenClaw 加载，因为它在 skills 目录中。

## 🔧 配置文件说明

### 生成的文件
插件运行后会创建以下文件：

1. **`~/.openclaw/workspace/sticker_db.json`**
   - 表情包数据库
   - 包含所有收集的表情包和集合信息
   - 格式：
     ```json
     {
       "sets": {
         "集合名称": {
           "title": "集合标题",
           "name": "集合名称",
           "stickers_count": 数量,
           "added_at": "时间戳"
         }
       },
       "stickers": [
         {
           "id": "file_id",
           "emoji": "😊",
           "set_name": "集合名称",
           "keywords": ["关键词1", "关键词2"],
           "added_at": "时间戳"
         }
       ]
     }
     ```

2. **`~/.openclaw/workspace/sticker_usage_state.json`**
   - 使用状态记录
   - 用于负载均衡算法
   - 格式：
     ```json
     {
       "counts": {
         "file_id_1": 使用次数,
         "file_id_2": 使用次数
       },
       "last_used": {
         "file_id_1": 最后使用时间戳,
         "file_id_2": 最后使用时间戳
       }
     }
     ```

## 🚀 快速测试

### 1. 测试数据库查看
```javascript
list_stickers()
```
应该显示：
```
📊 表情包数据库统计
总表情包数: 120
集合数量: 1
过滤后: 120 个表情包

🎭 Emoji 分布:
😕: 1 个
😐: 1 个
😢: 2 个
...
```

### 2. 测试表情包发送
```javascript
reply_with_sticker({ emoji: "😂" })
```
如果数据库中有 😂 表情包，会发送一个。

### 3. 测试手动获取集合
```javascript
fetch_sticker_set({ set_name: "AnotherStickerSet" })
```

## 🐛 故障排除

### 问题1：无法获取 Bot Token
**症状**：`Error: Bot token not configured`
**解决**：
1. 检查 `~/.openclaw/openclaw.json` 中 Telegram 配置
2. 确保 botToken 正确
3. 重启 OpenClaw gateway

### 问题2：插件未加载
**症状**：工具不可用
**解决**：
1. 检查插件目录是否正确
2. 检查 `openclaw.plugin.json` 格式
3. 查看 OpenClaw 日志：`journalctl --user -u openclaw-gateway -f`

### 问题3：无法发送表情包
**症状**：`Error sending sticker`
**解决**：
1. 检查网络连接
2. 检查 Bot Token 权限
3. 检查 file_id 是否有效

### 问题4：负载均衡不工作
**症状**：总是发送同一个表情包
**解决**：
1. 检查 `sticker_usage_state.json` 文件权限
2. 确保文件可写
3. 重启插件

## 🔄 更新插件

### 小版本更新
直接替换 `index.js` 文件，然后重启 OpenClaw。

### 大版本更新
1. 备份现有数据：
   ```bash
   cp ~/.openclaw/workspace/sticker_db.json ~/.openclaw/workspace/sticker_db.json.backup
   cp ~/.openclaw/workspace/sticker_usage_state.json ~/.openclaw/workspace/sticker_usage_state.json.backup
   ```

2. 更新所有文件
3. 重启 OpenClaw

## 📈 监控和维护

### 定期检查
1. **数据库大小**：`ls -lh ~/.openclaw/workspace/sticker*.json`
2. **使用统计**：`list_stickers()`
3. **错误日志**：查看 OpenClaw 日志

### 清理建议
如果数据库过大：
1. 删除不常用的集合
2. 清理单个表情包（非集合）
3. 重置使用统计（删除 `sticker_usage_state.json`）

## 🎯 最佳实践

### 数据安全
1. 定期备份数据库文件
2. 不要将 Bot Token 泄露
3. 敏感数据不要放在表情包 keywords 中

### 性能优化
1. 数据库文件保持在合理大小（<10MB）
2. 定期清理无效 file_id
3. 使用 LRU 缓存优化查询

### 用户体验
1. 确保表情包质量（清晰、相关）
2. 保持集合多样性
3. 定期更新热门表情包集合

## 📞 支持

遇到问题：
1. 查看 OpenClaw 文档
2. 检查错误日志
3. 联系开发者

---

**插件版本**: 2.0.0  
**最后更新**: 2026-03-07  
**兼容性**: OpenClaw 1.0+  
**依赖**: Node.js, Telegram Bot API