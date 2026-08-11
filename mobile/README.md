# Personal AI OS Mobile PWA

版本：`alpha-3.5.2-mobile`；核心基线：`alpha-3.5.2`；数据 Schema：v3。

这是独立的静态发布目录。它不调用模型、业务 API 或第三方服务；任务、笔记、捕获、决策、复盘和个人记忆均保存于此 PWA origin 的浏览器 `localStorage`。

## 发布

将 `mobile/` 作为单独的 Vercel 项目根目录，使用独立 HTTPS 域名。不要部署到 Desktop 项目的子路径，否则两者会共享同一 origin 数据空间。

## iPhone 安装

1. 使用 Safari 打开独立 Mobile HTTPS 地址，并保持联网完成首次加载。
2. 通过“分享”菜单选择“添加到主屏幕”。
3. 从主屏幕启动应用，确认显示 Mobile PWA 版本信息。
4. 关闭网络后重新打开，应用壳应仍可从静态缓存加载。

`file://` 与局域网 HTTP 可运行静态应用，但不能注册 iPhone PWA Service Worker；PWA 安装需要 HTTPS。

## 数据迁移与备份

Mobile PWA 与 Desktop、Vercel、局域网 HTTP 均是独立数据空间，不会自动同步。迁移时：

1. 在原入口的“个人记忆”导出 JSON 备份。
2. 在 Mobile PWA 的空数据空间选择该文件。
3. 核对来源、创建时间和六类记录数量后确认恢复。

恢复只允许空数据空间，不会覆盖或自动合并已有记录。请定期在 Mobile PWA 内导出 JSON 备份，防范浏览器数据清理、设备遗失或误删应用。

## 缓存边界

`service-worker.js` 只预缓存本目录中的 HTML、CSS、JavaScript、manifest 和图标。它不访问 `localStorage`、不处理业务数据、不调用 `fetch()`，也不访问外部网络资源。静态资源的首次缓存与将来版本更新仍需要网络；安装成功后，核心功能可离线运行。
