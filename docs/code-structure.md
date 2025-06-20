# 服务器管理系统代码结构说明文档

本文档详细说明服务器管理系统的代码结构、目录组织和主要模块功能，帮助开发者快速理解系统架构和代码逻辑。

## 目录

- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [前端架构](#前端架构)
- [后端架构](#后端架构)
- [数据流](#数据流)
- [认证机制](#认证机制)
- [扩展指南](#扩展指南)

## 项目概述

服务器管理系统是一个基于 Next.js 和 Express.js 构建的全栈应用，用于集中管理、监控和操作多台服务器。系统采用前后端分离架构，前端使用 React 和 TypeScript 开发，后端使用 Node.js 和 Express 框架提供 API 服务。

## 技术栈

### 前端

- **框架**：Next.js 14.x (React)
- **语言**：TypeScript
- **UI 组件**：
  - Tailwind CSS
  - Radix UI 组件
  - Lucide React 图标
- **状态管理**：React Hooks (useState, useEffect, useCallback)
- **HTTP 客户端**：Axios
- **本地存储**：localStorage (用于离线功能和数据持久化)

### 后端

- **框架**：Express.js
- **语言**：JavaScript (Node.js)
- **SSH 连接**：node-ssh
- **文件传输**：SFTP
- **认证**：JWT (jsonwebtoken)
- **数据存储**：本地 JSON 文件
- **环境配置**：dotenv

## 目录结构

```
servermanager-main/
├── app/                    # Next.js 应用页面和布局
│   ├── layout.tsx          # 应用主布局
│   └── page.tsx            # 主页面组件
├── components/             # React 组件
│   ├── ui/                 # 通用 UI 组件
│   ├── auth-guard.tsx      # 认证保护组件
│   ├── command-execution.tsx # 命令执行组件
│   ├── command-library.tsx # 命令库管理组件
│   ├── dashboard.tsx       # 仪表盘组件
│   ├── file-sync.tsx       # 文件同步组件
│   ├── history-view.tsx    # 历史记录查看组件
│   ├── login.tsx           # 登录组件
│   ├── server-form-modal.tsx # 服务器表单模态框
│   └── server-management.tsx # 服务器管理组件
├── docs/                   # 文档目录
├── public/                 # 静态资源
├── server/                 # 后端服务器代码
│   ├── data/               # 数据存储目录
│   │   ├── commands.json   # 命令库数据
│   │   ├── command-history.json # 命令历史数据
│   │   ├── file-operations.json # 文件操作历史数据
│   │   └── servers.json    # 服务器信息数据
│   ├── auth.js             # 认证相关功能
│   ├── crypto.js           # 加密解密工具
│   └── index.js            # 后端主入口
├── services/               # 前端服务层
│   ├── api.ts              # API 通用请求函数
│   ├── api-service.ts      # API 服务封装
│   ├── auth-service.ts     # 认证服务
│   ├── server-status.ts    # 服务器状态服务
│   └── view-state.ts       # 视图状态管理服务
├── styles/                 # 全局样式
├── types/                  # TypeScript 类型定义
│   ├── command.ts          # 命令相关类型
│   └── server.ts           # 服务器相关类型
├── utils/                  # 工具函数
├── .env                    # 环境变量配置
├── .gitignore              # Git 忽略文件
├── next.config.js          # Next.js 配置
├── package.json            # 项目依赖和脚本
├── postcss.config.js       # PostCSS 配置
├── tailwind.config.js      # Tailwind CSS 配置
└── tsconfig.json           # TypeScript 配置
```

## 前端架构

### 核心组件

#### 1. 主页面 (`app/page.tsx`)

- 应用的主入口点
- 管理导航和选项卡切换
- 控制用户会话状态
- 根据选中的选项卡渲染不同的功能组件

#### 2. 服务器管理 (`components/server-management.tsx`)

- 提供服务器的 CRUD 操作
- 支持多种视图模式（卡片、列表、分组）
- 实现服务器搜索和过滤功能
- 与 `server-form-modal.tsx` 配合实现服务器添加和编辑

#### 3. 服务器监控 (`components/dashboard.tsx`)

- 显示服务器的实时状态信息
- 包括 CPU、内存、磁盘和网络监控
- 支持手动和自动刷新状态

#### 4. 命令执行 (`components/command-execution.tsx`)

- 在选定服务器上执行命令
- 支持单服务器和批量命令执行
- 显示命令执行结果和状态
- 集成命令库功能

#### 5. 文件同步 (`components/file-sync.tsx`)

- 实现文件上传和下载功能
- 支持拖放操作
- 显示传输进度和状态
- 记录文件操作历史

#### 6. 登录组件 (`components/login.tsx`)

- 用户登录界面
- 表单验证
- 调用认证服务进行身份验证

### 服务层

#### 1. API 服务 (`services/api-service.ts`)

- 封装与后端 API 的通信
- 提供服务器、命令、历史记录等数据操作方法
- 实现本地存储回退机制（离线支持）

#### 2. 认证服务 (`services/auth-service.ts`)

- 处理用户登录和身份验证
- 管理认证令牌
- 提供用户会话状态检查

#### 3. 服务器状态服务 (`services/server-status.ts`)

- 获取和处理服务器状态信息
- 解析和格式化监控数据

#### 4. 视图状态服务 (`services/view-state.ts`)

- 管理和持久化 UI 视图状态
- 保存用户界面偏好设置

## 后端架构

### 主要模块

#### 1. 主入口 (`server/index.js`)

- Express 服务器配置和启动
- API 路由定义
- 中间件配置
- 错误处理

#### 2. 认证模块 (`server/auth.js`)

- JWT 令牌生成和验证
- 用户凭证验证
- 认证中间件

#### 3. 加密模块 (`server/crypto.js`)

- 密码加密和解密
- 敏感数据保护

### API 端点

#### 1. 认证相关

- `POST /api/auth/login` - 用户登录
- `GET /api/health` - 健康检查（无需认证）

#### 2. 服务器管理

- `GET /api/servers` - 获取所有服务器
- `POST /api/servers` - 保存所有服务器
- `POST /api/servers/add` - 添加单个服务器
- `PUT /api/servers/:id` - 更新单个服务器
- `DELETE /api/servers/:id` - 删除单个服务器

#### 3. 命令执行

- `POST /api/connect` - 连接到服务器
- `POST /api/execute` - 执行命令
- `POST /api/batch-execute` - 批量执行命令
- `POST /api/disconnect/:id` - 断开服务器连接
- `POST /api/disconnect-all` - 断开所有连接

#### 4. 文件操作

- `POST /api/upload` - 上传文件
- `GET /api/download` - 下载文件

#### 5. 服务器状态

- `GET /api/status/:id` - 获取服务器状态

#### 6. 数据管理

- `GET /api/commands` - 获取命令库
- `POST /api/commands` - 保存命令库
- `GET /api/command-history` - 获取命令历史
- `POST /api/command-history` - 保存命令历史
- `POST /api/command-history/add` - 添加命令执行记录
- `DELETE /api/command-history` - 清除命令历史
- `GET /api/file-operations` - 获取文件操作历史
- `POST /api/file-operations` - 保存文件操作历史
- `POST /api/file-operations/add` - 添加文件操作记录
- `DELETE /api/file-operations` - 清除文件操作历史

## 数据流

### 前端到后端

1. **用户交互** → 触发组件状态更新
2. **组件** → 调用相应的服务方法
3. **服务层** → 通过 Axios 发送 API 请求
4. **API 请求** → 携带认证令牌发送到后端
5. **后端认证中间件** → 验证令牌并允许/拒绝请求
6. **后端控制器** → 处理请求并执行相应操作
7. **数据存储** → 读取或写入数据
8. **响应** → 返回处理结果到前端

### 数据持久化

系统采用两级数据持久化策略：

1. **后端持久化**：
   - 数据存储在 `server/data` 目录下的 JSON 文件中
   - 包括服务器信息、命令库、命令历史和文件操作历史

2. **前端持久化**：
   - 数据缓存在浏览器的 localStorage 中
   - 在后端 API 不可用时作为回退机制
   - 支持离线操作和数据恢复

## 认证机制

系统采用基于 JWT 的认证机制：

1. **登录流程**：
   - 用户提交用户名和密码
   - 后端验证凭证并生成 JWT 令牌
   - 令牌返回给前端并存储在 localStorage 中

2. **请求认证**：
   - 前端通过请求拦截器在每个 API 请求中添加 Authorization 头
   - 后端使用认证中间件验证令牌
   - 验证成功后请求继续处理，失败则返回 401 错误

3. **令牌管理**：
   - 令牌包含用户信息和过期时间
   - 默认过期时间为 24 小时（可配置）
   - 登出时清除本地存储的令牌

## 扩展指南

### 添加新功能

1. **前端扩展**：
   - 在 `components` 目录中创建新组件
   - 在 `services` 目录中添加相应的服务方法
   - 在 `app/page.tsx` 中添加新的导航选项卡

2. **后端扩展**：
   - 在 `server/index.js` 中添加新的 API 端点
   - 实现相应的处理逻辑
   - 如需新的数据存储，在 `server/data` 目录中添加新的 JSON 文件

### 修改认证机制

如需更改认证机制，主要修改以下文件：

- `server/auth.js` - 后端认证逻辑
- `services/auth-service.ts` - 前端认证服务
- `services/api.ts` 和 `services/api-service.ts` - API 请求拦截器

### 数据库集成

当前系统使用本地 JSON 文件存储数据。如需集成数据库：

1. 安装相应的数据库驱动（如 mongoose、sequelize 等）
2. 创建数据模型和连接配置
3. 修改 `server/index.js` 中的数据操作逻辑，替换为数据库操作
4. 更新环境配置，添加数据库连接参数
