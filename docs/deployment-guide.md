# 服务器管理系统部署文档

本文档提供服务器管理系统的完整部署指南，包括环境准备、安装步骤、配置说明和常见问题解决方案。

## 目录

- [系统要求](#系统要求)
- [环境准备](#环境准备)
- [安装步骤](#安装步骤)
- [配置说明](#配置说明)
- [启动服务](#启动服务)
- [部署到生产环境](#部署到生产环境)
- [常见问题](#常见问题)

## 系统要求

- **操作系统**：Windows、macOS 或 Linux
- **Node.js**：v16.0.0 或更高版本
- **npm**：v7.0.0 或更高版本
- **存储**：至少 500MB 可用磁盘空间
- **内存**：至少 2GB RAM

## 环境准备

1. **安装 Node.js 和 npm**

   访问 [Node.js 官网](https://nodejs.org/) 下载并安装适合您操作系统的最新 LTS 版本。

2. **验证安装**

   ```bash
   node --version
   npm --version
   ```

3. **安装 Git（可选，用于从代码仓库克隆项目）**

   访问 [Git 官网](https://git-scm.com/) 下载并安装。

## 安装步骤

### 方法一：从源代码安装

1. **克隆代码仓库**

   ```bash
   git clone <repository-url>
   cd servermanager-main
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

### 方法二：从发布包安装

1. **下载最新发布包**

   从项目发布页面下载最新版本的 zip 或 tar.gz 文件。

2. **解压文件**

   ```bash
   unzip servermanager-main.zip
   # 或
   tar -xzf servermanager-main.tar.gz
   ```

3. **进入项目目录并安装依赖**

   ```bash
   cd servermanager-main
   npm install
   ```

## 配置说明

系统配置主要通过 `.env` 文件进行管理。在项目根目录创建 `.env` 文件，并参考以下配置项：

```
# API 服务端口
API_PORT=3003
NEXT_PUBLIC_API_PORT=3003

# 认证配置
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=server-manager-secret-key
TOKEN_EXPIRES_IN=86400
```

**配置项说明：**

- `API_PORT`：后端 API 服务监听端口
- `NEXT_PUBLIC_API_PORT`：前端访问 API 的端口（通常与 API_PORT 相同）
- `ADMIN_USERNAME`：管理员用户名
- `ADMIN_PASSWORD`：管理员密码
- `JWT_SECRET`：JWT 令牌加密密钥（建议在生产环境中使用强随机字符串）
- `TOKEN_EXPIRES_IN`：令牌过期时间（秒），默认 86400（24小时）

## 启动服务

### 开发环境

```bash
# 启动开发服务器
npm run dev
```

这将同时启动前端和后端服务。前端默认运行在 http://localhost:3000，后端 API 服务运行在 http://localhost:3003（或您在 .env 中配置的端口）。

### 生产环境

```bash
# 构建项目
npm run build

# 启动生产服务
npm start
```

## 部署到生产环境

### 方法一：直接部署

1. **构建项目**

   ```bash
   npm run build
   ```

2. **启动生产服务**

   ```bash
   npm start
   ```

   或使用进程管理器如 PM2：

   ```bash
   npm install -g pm2
   pm2 start npm --name "servermanager" -- start
   ```

### 方法二：使用 Docker 部署

1. **构建 Docker 镜像**

   在项目根目录创建 `Dockerfile`：

   ```dockerfile
   FROM node:16-alpine

   WORKDIR /app

   COPY package*.json ./
   RUN npm install

   COPY . .
   RUN npm run build

   EXPOSE 3000
   EXPOSE 3003

   CMD ["npm", "start"]
   ```

2. **构建并运行容器**

   ```bash
   docker build -t servermanager .
   docker run -p 3000:3000 -p 3003:3003 -d servermanager
   ```

### 方法三：使用 Nginx 反向代理

1. **安装并配置 Nginx**

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /api {
           proxy_pass http://localhost:3003;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 常见问题

### 端口冲突

**问题**：启动服务时提示端口已被占用。

**解决方案**：
- 修改 `.env` 文件中的 `API_PORT` 和 `NEXT_PUBLIC_API_PORT` 为其他可用端口
- 或终止占用端口的进程：
  ```bash
  # 查找占用端口的进程
  lsof -i :3000
  lsof -i :3003
  
  # 终止进程
  kill -9 <PID>
  ```

### 认证失败

**问题**：无法登录系统或 API 请求返回 401 未授权错误。

**解决方案**：
- 确认 `.env` 文件中的用户名和密码配置正确
- 检查 JWT_SECRET 是否与之前部署的版本一致
- 清除浏览器缓存和 localStorage
- 检查前端 API 请求是否正确携带认证令牌

### 数据持久化问题

**问题**：重启服务后数据丢失。

**解决方案**：
- 确认 `server/data` 目录存在且有写入权限
- 检查服务是否有权限访问数据文件
- 考虑配置外部数据库进行数据持久化

### SSH 连接问题

**问题**：无法连接到远程服务器。

**解决方案**：
- 确认远程服务器 SSH 服务正常运行
- 检查服务器信息（IP、用户名、密码/密钥）是否正确
- 确认网络连接正常，没有防火墙阻止
- 检查 SSH 密钥权限是否正确（如果使用密钥认证）
