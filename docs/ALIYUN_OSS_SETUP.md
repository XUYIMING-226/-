# 阿里云 OSS 接入清单

当前 Bucket：`xingce-study-86166`。请保持 Bucket 读写权限为 **私有**；不要把 AccessKey、Secret 或截图中的凭据发送到聊天中。

## 已完成的代码能力

- `POST /api/upload-policy` 在服务端生成 5 分钟有效的 OSS V4 上传策略。
- 浏览器拿到策略后把一个 PDF 或图片直接上传到私有 OSS，不经过网站服务器。
- 上传限制：PDF、JPG、PNG、WebP；最大 25 MB；对象路径只能写入 `private/uploads/default/`。
- AccessKey 只从部署环境变量读取，永远不进入浏览器、Git 历史或仓库。

## 等部署前再做的控制台操作

1. 在 OSS Bucket 的 CORS 设置中添加网站正式域名；开发阶段可暂时添加本地地址 `http://localhost:3000`。
2. 创建一个 RAM 用户或角色，仅授予该 Bucket 下 `private/uploads/default/*` 的最小写入权限；不要使用阿里云主账号 AccessKey。
3. 将 RAM 凭据仅填入部署平台的环境变量，字段名以 `.env.example` 为准。不要创建或提交 `.env` 文件。
4. 生产环境建议将上传策略改为 STS 临时凭据；阿里云也建议用临时凭据，避免浏览器接触长期密钥。

## 数据库与部署

下一阶段选择阿里云 RDS MySQL 8.0 后执行 `database/schema.sql`。正式部署时，网站后端需运行 `npm start`，并在部署平台设置 `.env.example` 中的变量。
