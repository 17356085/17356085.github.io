---
title: RESTFul编程风格
published: 2025-08-20
updated: 2025-08-20
description: RESTFul编程风格
author: mio
tags:
  - 后端开发
category: 后端
image: https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/blog/covers/mahoyo-1.jpg
---
> RESTFul是WEB服务器接口的一种设计风格。
> RESTFul对URL的约束和规范的核心：通过采用**不同的请求方法**+**URL**来确定WEB服务中的资源

**RESTful 的英文全称是 Representational State Transfer（表述性状态转移）。简称REST。**

1. 表述性（Representational）是：URI + 请求方式。 
2. 状态（State）是：服务器端的数据。 
3. 转移（Transfer）是：变化。 
4. 表述性状态转移是指：通过 URI + 请求方式 来控制服务器端数据的变化。

## 1. 常见RESTFul设计模式

```text
GET /users # 获取所有用户 
GET /users/123 # 获取特定用户 
POST /users # 创建新用户 
PUT /users/123 # 更新特定用户 
DELETE /users/123 # 删除特定用户
```

## 2. 核心原则

**1. 无状态性（Stateless）**

- 每个请求都包含处理该请求所需的全部信息
- 服务器不存储客户端的状态信息

**2. 客户端-服务器架构**

- 明确分离用户界面和数据存储的关注点
- 提高系统的可移植性和可扩展性

**3. 统一接口**

- 使用标准的HTTP方法：GET、POST、PUT、DELETE等
- 通过URI唯一标识资源
- 使用标准的状态码和响应格式

**4. 资源导向**

- 将数据和功能视为资源，通过URI进行标识
- 例如：`/users/123` 表示ID为123的用户资源

**5. 分层系统**

- 允许在客户端和服务器之间使用中间层（如代理、网关）

## 3. RESFul风格与传统方式对比

传统的URL是基于动作的，而 RESTful URL 是基于资源和状态的，因此 RESTful URL 更加清晰和易于理解

| **传统的 URL**              | **RESTful URL** |
| ------------------------ | --------------- |
| GET /getUserById?id=1    | GET /user/1     |
| GET /getAllUser          | GET /user       |
| POST /addUser            | POST /user      |
| POST /modifyUser         | PUT /user       |
| GET /deleteUserById?id=1 | DELETE /user/1  |

## 4. RESTful的优势

- **简单性**：使用标准HTTP协议，易于理解和实现
- **可扩展性**：无状态特性使系统易于扩展
- **互操作性**：标准化接口便于不同系统间的集成
- **缓存友好**：GET请求可以被缓存，提高性能