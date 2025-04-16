# 威胁情报共享平台

## 项目概述

威胁情报共享平台是一个完整的网络安全情报共享与协作系统，旨在帮助安全专业人员和组织分享、获取和分析网络安全威胁情报。该平台支持情报文件上传、下载、分类和搜索，并提供社交功能如好友添加、即时通讯以及情报收藏等功能。

平台利用区块链技术确保情报的可验证性和不可篡改性，同时通过IPFS分布式存储系统实现高效的内容寻址和分发。

## 系统架构

该项目采用前后端分离的架构设计，同时集成了区块链和分布式文件系统：

```
项目结构
├── backend/                # 后端代码
│   ├── main.go             # 主程序入口
│   ├── template/           # 业务逻辑处理模块
│   ├── go.mod              # Go模块依赖定义
│   └── go.sum              # Go模块依赖锁定
│
├── blockchain/             # 区块链相关代码
│   ├── contracts/          # 智能合约
│   ├── migrations/         # 合约部署脚本
│   └── truffle-config.js   # Truffle配置文件
│
└── frontend/               # 前端代码
    ├── public/             # 静态资源
    ├── src/                # 源代码
    │   ├── components/     # 可复用组件
    │   ├── pages/          # 页面组件
    │   ├── css/            # 样式文件
    │   └── App.js          # 应用入口
    ├── package.json        # 项目配置和依赖
    └── README.md           # 项目说明
```

### 技术栈

#### 后端
- **框架**: Go语言 + Gin Web框架
- **数据库**: MySQL
- **API风格**: RESTful
- **实时通信**: WebSocket、SSE (Server-Sent Events)
- **分布式存储**: IPFS (星际文件系统)

#### 前端
- **框架**: React.js
- **路由**: React Router
- **状态管理**: React Hooks
- **UI组件**: 自定义组件
- **数据可视化**: Chart.js
- **Web3交互**: Web3.js

#### 区块链
- **本地开发环境**: Ganache
- **区块链网络**:
  - SBC (Security Blockchain Chain) - 安全情报链
  - IBC (Intelligence Blockchain Chain) - 情报共享链
  - CBC (Collaboration Blockchain Chain) - 协作链
- **智能合约**: Solidity
- **开发框架**: Truffle

## 核心功能模块

### 1. 用户账户管理
- 用户注册与登录
- 用户资料查看与修改
- 积分系统 (下载文件消耗积分)

### 2. 情报文件管理
- 文件上传功能（支持IPFS分布式存储）
- 文件分类与标记（高危、中危、低危）
- 文件下载与积分扣除
- 文件统计分析（文件类型、风险等级分布）
- 文件哈希上链存证（确保文件完整性）

### 3. 社交与交流功能
- 好友添加与管理
- 实时聊天系统
- 文章分享功能
- 文章收藏功能

### 4. 搜索与发现
- 全文搜索
- 用户搜索
- 高级过滤

### 5. 区块链功能
- 情报上链存证
- 权限与访问控制
- 交易记录与审计
- 跨链数据交互

## IPFS分布式存储

本项目利用IPFS（星际文件系统）实现情报文件的分布式存储：

- **内容寻址**: 基于文件内容而非位置寻址，确保文件完整性
- **去中心化存储**: 文件分布式存储，无单点故障
- **重复数据删除**: 相同内容只存储一次，节省存储空间
- **版本控制**: 支持文件版本追踪
- **高效检索**: 基于DHT（分布式哈希表）的快速检索

上传流程：
1. 用户上传文件至后端服务器
2. 后端将文件添加到IPFS网络
3. 获取文件的唯一CID（内容标识符）
4. 将CID与元数据一起存储到数据库
5. 同时将CID哈希上传至区块链网络存证

下载流程：
1. 用户请求下载特定情报文件
2. 后端从数据库检索文件CID
3. 通过IPFS网络获取文件内容
4. 将文件返回给用户
5. 记录下载交易到区块链

## 多链架构设计

本项目使用Ganache创建了三条独立的区块链，各司其职：

### SBC (Security Blockchain Chain)
- 功能：管理安全情报的存证和验证
- 智能合约：IntelligenceVerification、ThreatRegistry
- 应用：记录情报文件哈希、验证情报完整性、管理威胁情报库

### IBC (Intelligence Blockchain Chain)
- 功能：处理情报共享和交换的交易
- 智能合约：IntelligenceExchange、TokenContract
- 应用：积分交易、情报交换记录、共享权限管理

### CBC (Collaboration Blockchain Chain)
- 功能：支持用户协作和社区治理
- 智能合约：Reputation、Governance
- 应用：用户声誉系统、协作记录、社区治理投票

### 跨链交互
- 采用哈希时间锁定合约(HTLC)实现跨链资产转移
- 使用Merkle树证明实现跨链数据验证
- 设计中继机制处理跨链事件通知

## API接口设计

### 用户相关
- `POST /login` - 用户登录
- `POST /register` - 用户注册
- `GET /profile` - 获取用户资料
- `GET/PUT /changeprofile` - 获取/更新用户资料

### 情报文件相关
- `GET /articles` - 获取情报文章列表
- `POST /upload` - 上传情报文件到IPFS网络
- `POST /download` - 下载情报文件
- `GET /file-stats` - 获取文件统计信息
- `GET /fileupdate` - 获取文件更新
- `DELETE /fileupdate/:articleId` - 删除文章
- `PUT /fileupdate/:articleId` - 更新文章
- `GET /file/verify/:cid` - 验证文件完整性和区块链存证

### 社交相关
- `GET /friends` - 获取好友列表
- `GET /friend-requests` - 获取好友请求
- `POST /friend-requests` - 发送好友请求
- `PUT /friend-requests/:requestId` - 响应好友请求
- `DELETE /friend` - 删除好友
- `GET /users/search` - 搜索用户

### 即时通讯
- `GET /messages` - 获取消息历史
- `POST /messages` - 发送消息
- `GET /messages/unread` - 获取未读消息数
- `GET /ws/chat` - WebSocket聊天连接

### 收藏功能
- `POST /favorites` - 添加收藏
- `DELETE /favorites` - 删除收藏
- `GET /favorites/check` - 检查收藏状态
- `GET /favorites` - 获取收藏列表

### 区块链接口
- `POST /blockchain/verify` - 验证文件存证
- `GET /blockchain/transactions/:address` - 获取用户交易历史
- `POST /blockchain/record` - 记录新的区块链事务
- `GET /blockchain/status` - 获取区块链网络状态

## 数据模型

### 主要数据表
- `user` - 用户信息
- `message` - 情报文件信息
- `friendships` - 好友关系
- `favorites` - 收藏关系
- `blockchain_records` - 区块链交易记录
- `ipfs_files` - IPFS文件索引
- 其他辅助表

## 安全设计

- CORS（跨域资源共享）保护
- 用户身份认证与鉴权
- API访问控制
- 敏感信息保护
- 区块链存证确保数据完整性
- IPFS分布式存储提高数据可用性

## 界面展示

平台提供直观、现代化的用户界面，主要包括以下页面：

1. **登录和注册页面**
2. **首页** - 展示情报文章列表
3. **个人资料页面** - 查看和修改用户资料
4. **文件上传页面** - 上传新情报文件
5. **文件管理页面** - 管理已上传的文件
6. **文件统计页面** - 可视化展示文件统计信息
7. **收藏页面** - 管理收藏的情报文章
8. **聊天界面** - 与好友进行即时通讯
9. **区块链浏览器** - 查看区块链交易和存证记录

## 部署要求

### 后端
- Go 1.15+ 环境
- MySQL 5.7+ 数据库
- IPFS节点 (go-ipfs 0.8.0+)
- 默认端口: 8080

### 前端
- Node.js 14+ 环境
- npm 或 yarn 包管理器
- 默认端口: 3000

### 区块链环境
- Ganache 2.5.0+
- Truffle 5.0+
- 三条区块链网络配置 (SBC, IBC, CBC)
- Web3.js 1.3.0+

## 开发与贡献

本项目欢迎开发者贡献代码和提交改进建议。开发者可以通过以下步骤参与：

1. Fork项目仓库
2. 创建特性分支
3. 提交更改
4. 发起Pull Request

## 许可证

[适用的许可证类型] 
