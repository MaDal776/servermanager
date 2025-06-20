# 服务器管理平台 - 本地代理设置指南

## 概述

本地代理是一个Node.js服务器，用于在浏览器和远程服务器之间建立桥梁，实现真实的SSH命令执行和文件传输功能。

## 安装步骤

### 1. 环境要求
- Node.js 16+ 
- npm 或 yarn

### 2. 安装依赖
\`\`\`bash
cd scripts
npm install
\`\`\`

### 3. 启动代理服务器
\`\`\`bash
npm start
\`\`\`

或者使用开发模式（自动重启）：
\`\`\`bash
npm run dev
\`\`\`

### 4. 验证服务
访问 http://localhost:3001/api/health 应该返回：
\`\`\`json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
\`\`\`

## 功能说明

### SSH命令执行
- **端点**: `POST /api/execute-command`
- **功能**: 在多台服务器上批量执行SSH命令
- **支持**: 密码认证和SSH密钥认证

### 文件上传
- **端点**: `POST /api/upload-files`  
- **功能**: 通过SFTP将文件上传到多台服务器
- **支持**: 多文件并发上传

### 服务器状态监控
- **端点**: `POST /api/server-status`
- **功能**: 获取服务器的实时状态信息
- **监控项**: CPU使用率、内存使用率、磁盘使用率、运行时间

## 安全注意事项

1. **网络安全**: 代理服务器只监听本地端口，不对外网开放
2. **认证安全**: 推荐使用SSH密钥而非密码认证
3. **文件安全**: 上传的临时文件会在传输完成后自动删除
4. **连接管理**: SSH连接使用完毕后会自动关闭

## 故障排除

### 常见问题

1. **端口被占用**
   \`\`\`bash
   Error: listen EADDRINUSE :::3001
   \`\`\`
   解决方案：修改 `local-agent.js` 中的端口号

2. **SSH连接失败**
   - 检查服务器IP地址和端口
   - 验证用户名和密码/密钥
   - 确保目标服务器开启SSH服务

3. **文件上传失败**
   - 检查目标目录是否存在
   - 验证用户是否有写入权限
   - 确保磁盘空间充足

### 调试模式
启动时添加调试信息：
\`\`\`bash
DEBUG=* npm start
\`\`\`

## 配置选项

可以通过环境变量配置：
\`\`\`bash
PORT=3001          # 服务端口
UPLOAD_DIR=uploads # 临时文件目录
MAX_FILE_SIZE=100  # 最大文件大小(MB)
\`\`\`

## API接口文档

### 执行命令
\`\`\`javascript
POST /api/execute-command
Content-Type: application/json

{
  "servers": [
    {
      "id": "server1",
      "name": "生产服务器",
      "ip": "192.168.1.100",
      "user": "root",
      "authType": "password",
      "password": "your-password"
    }
  ],
  "command": "ls -la"
}
\`\`\`

### 上传文件
\`\`\`javascript
POST /api/upload-files
Content-Type: multipart/form-data

files: [File objects]
servers: JSON string of server array
targetPath: "/tmp/"
\`\`\`

### 获取状态
\`\`\`javascript
POST /api/server-status
Content-Type: application/json

{
  "servers": [server objects]
}
