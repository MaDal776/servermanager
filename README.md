# 服务器管理系统 (Server Manager)

一个基于 Next.js 和 Express.js 构建的服务器管理系统，用于集中管理、监控和操作多台服务器。

## 功能特点

- 服务器管理：添加、编辑、删除和分组管理服务器
- 服务器监控：实时监控服务器的 CPU、内存、磁盘和网络状态
- 命令执行：在单台或多台服务器上执行命令
- 文件同步：在本地和远程服务器之间上传和下载文件
- 命令库管理：保存和管理常用命令
- 操作历史：记录命令执行和文件操作历史
- 用户认证：基于 JWT 的安全认证机制

## 快速部署指南

### 环境要求

- Node.js v16.0.0 或更高版本（推荐 v18.x LTS）
- npm v7.0.0 或更高版本
- Nginx (用于生产环境部署)

## 部署方式

本系统支持两种部署方式：

1. **开发环境部署**：前后端一体化启动，适合本地开发和测试
2. **生产环境部署**：前后端分离部署，使用 Nginx 反向代理，适合云服务器生产环境

## 开发环境部署

### 1. 配置环境变量

在项目根目录创建 `.env` 文件，添加以下内容：

```
# 环境变量
NODE_ENV=development

# API 服务端口
API_PORT=3003
NEXT_PUBLIC_API_PORT=3003

# 认证配置
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=server-manager-secret-key
TOKEN_EXPIRES_IN=86400
```

### 2. 安装依赖并启动服务

本项目使用 Next.js 集成了前端和后端服务，只需要一个命令即可同时启动两者：

```bash
# 进入项目目录
cd servermanager-main

# 安装依赖
npm install

# 启动开发服务
npm run dev
```

启动后，前端服务将运行在 http://localhost:3000，后端 API 服务运行在 http://localhost:3003（或您在 .env 中配置的端口）。

### 3. 分别启动前端和后端（可选）

如果您需要分别启动前端和后端服务，可以使用以下命令：

**启动前端服务：**

```bash
cd servermanager-main
npm install
npm run dev
```

**启动后端服务：**

```bash
cd servermanager-main/server
npm install
node index.js
```

## 生产环境部署（云服务器）

### 1. 环境变量配置

在项目根目录创建 `.env` 文件，添加以下内容：

```
# 环境变量
NODE_ENV=production

# API 服务端口
API_PORT=3003
# 生产环境下前端API请求路径，通过Nginx代理
NEXT_PUBLIC_API_URL=/api

# 认证配置
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=your-strong-secret-key-here
TOKEN_EXPIRES_IN=86400
```

### 2. 构建前端应用

```bash
# 进入项目目录
cd servermanager-main

# 安装依赖
npm install

# 构建前端应用
npm run build
```

### 3. 启动后端服务

```bash
# 进入后端目录
cd server

# 安装后端依赖
npm install

# 启动后端服务（推荐使用PM2进行进程管理）
node index.js

# 或者使用PM2启动
pm2 start index.js --name "server-manager-api"
```

### 4. 配置 Nginx 反向代理

创建 Nginx 配置文件（例如 `/etc/nginx/conf.d/server-manager.conf`）：

```nginx
server {
    listen 80;
    # 替换为您的域名或服务器IP
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /path/to/servermanager-main/.next/server/app;
        try_files $uri $uri/ /index.html;
        
        # 如果使用Next.js的standalone输出
        # root /path/to/servermanager-main/.next/standalone;
    }
    
    # API请求代理
    location /api/ {
        proxy_pass http://localhost:3003/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. 启动 Nginx 服务

```bash
# 测试Nginx配置
sudo nginx -t

# 启动或重载Nginx
sudo systemctl restart nginx
# 或
sudo service nginx restart
```

### 6. 防火墙配置

确保您的服务器防火墙已开放 80 端口（HTTP）或 443 端口（HTTPS）：

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 7. 访问系统

打开浏览器，访问您的域名或服务器IP：访问端口使用nginx代理的端口
- http://your-domain.com 或 http://your-server-ip

默认登录凭证：
- 用户名：admin
- 密码：admin123（或您在 .env 中配置的密码）

## 常见问题排查

### API 连接问题

如果前端无法连接到后端 API，请检查：

1. 确认后端服务正在运行
2. 检查 Nginx 配置中的代理路径是否正确
3. 检查环境变量 `NEXT_PUBLIC_API_URL` 是否正确设置
4. 检查浏览器控制台是否有跨域错误

### 添加服务器功能问题

如果添加服务器功能不工作，可能是由于：

1. 浏览器不支持 `crypto.randomUUID()` API，项目已提供兼容方案
2. 检查网络请求是否正确发送到后端
3. 检查后端日志是否有错误信息

## 详细文档

更详细的文档请参考：

- [部署指南](./docs/deployment-guide.md) - 完整的部署和配置说明
- [用户指南](./docs/user-guide.md) - 系统功能和操作说明
- [代码结构](./docs/code-structure.md) - 代码组织和架构说明

## 许可证

MIT
