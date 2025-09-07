---
title: SpringBoot
published: 2025-08-08
description: ""
author: mio
tags:
  - 苍穹外卖
category: 学习记录
updated: 2025-08-10
---

# sky-take-out

>***在项目学习过程中发现需要学习（复习的知识）***
>
>- [x] maven对于父子依赖存在有疑问，在实操过程中花去大半时间
>- [ ] ngin配置文件该怎么写？如何部署？是如何打通前后端之间的‘通信’？
>- [√] 对于如何正确使用git分支不是很理解
>
>**后续进一步优化项目的知识点**
>
>- [ ] mybatis-plue（和mybatis相比有什么区别？怎么用mybatis-plue开发？）
>- [ ] Axios网络请求（Axious如何使用？）

## 一、依赖项配置

### 核心依赖版本信息

| 依赖类别        | 版本号     | 说明                      |
| ----------- | ------- | ----------------------- |
| Spring Boot | 3.2.0   | 支持 Java 21 的最新稳定版本      |
| Java        | 21      | 项目使用的 Java 版本           |
| MyBatis     | 3.0.3   | 适配 Spring Boot 3 的版本    |
| Lombok      | 1.18.30 | 简化 Java 代码的工具库          |
| FastJSON    | 2.0.32  | 支持 Java 17 + 的 JSON 处理库 |

### 各模块依赖详情

#### 1. 父模块 (sky-take-out) 依赖管理

父模块通过`dependencyManagement`统一管理所有子模块的依赖版本，主要包含以下类别：

| 依赖类别 | 具体依赖                                     | 版本    | 用途                                        |
| -------- | -------------------------------------------- | ------- | ------------------------------------------- |
| 核心框架 | spring-boot-dependencies                     | 3.2.0   | Spring Boot 核心依赖集合                    |
| 数据访问 | mybatis-spring-boot-starter                  | 3.0.3   | MyBatis 与 Spring Boot 集成                 |
| 工具类   | lombok                                       | 1.18.30 | 减少模板代码，通过注解生成 getter/setter 等 |
| 工具类   | fastjson                                     | 2.0.32  | JSON 序列化与反序列化                       |
| 工具类   | commons-lang3                                | 3.12.0  | 常用 Java 工具类扩展                        |
| 数据库   | druid-spring-boot-starter                    | 1.2.20  | 数据库连接池                                |
| 数据库   | pagehelper-spring-boot-starter               | 1.4.7   | 分页插件                                    |
| API 文档 | knife4j-openapi3-jakarta-spring-boot-starter | 4.5.0   | 生成 API 文档                               |
| AOP      | aspectjrt、aspectjweaver                     | 1.9.20  | AOP 编程支持                                |
| 安全     | jjwt-api、jjwt-impl、jjwt-jackson            | 0.11.5  | JWT 令牌处理                                |
| 存储     | aliyun-sdk-oss                               | 3.10.2  | 阿里云 OSS 存储服务                         |
| 文档处理 | poi、poi-ooxml                               | 5.2.5   | Excel 文件处理                              |
| 支付     | wechatpay-apache-httpclient                  | 0.4.8   | 微信支付接口                                |
| 数据库   | mysql-connector-j                            | 8.0.33  | MySQL 数据库驱动                            |

#### 2. sky-server 模块依赖

该模块是项目的核心业务模块，依赖关系如下：

| 依赖来源        | 具体依赖                                                     | 用途                     |
| ----------- | -------------------------------------------------------- | ---------------------- |
| 自定义模块       | sky-common、sky-pojo                                      | 项目内部通用模块               |
| Spring Boot | spring-boot-starter、spring-boot-starter-web              | Spring Boot 核心及 Web 支持 |
| Spring Boot | spring-boot-starter-test                                 | 单元测试支持                 |
| 数据库         | mysql-connector-j、mybatis-spring-boot-starter            | 数据库连接与 ORM 框架          |
| 工具类         | lombok、fastjson、druid-spring-boot-starter                | 工具类与数据库连接池             |
| 工具类         | pagehelper-spring-boot-starter                           | 分页查询支持                 |
| AOP         | aspectjrt、aspectjweaver                                  | 面向切面编程                 |
| API 文档      | knife4j-openapi3-jakarta-spring-boot-starter             | 接口文档生成                 |
| 缓存          | spring-boot-starter-data-redis、spring-boot-starter-cache | Redis 缓存支持             |
| 实时通信        | spring-boot-starter-websocket                            | WebSocket 支持           |
| 文档处理        | poi、poi-ooxml                                            | Excel 导入导出             |

#### 3. sky-common 模块依赖

该模块包含项目通用的工具类和组件：

| 依赖类别  | 具体依赖                            | 用途            |
| --------- | ----------------------------------- | --------------- |
| 工具类    | lombok、fastjson、commons-lang3     | 通用工具类      |
| JSON 处理 | spring-boot-starter-json            | JSON 数据处理   |
| 安全      | jjwt-api、jjwt-impl、jjwt-jackson   | JWT 令牌处理    |
| 配置      | spring-boot-configuration-processor | 配置文件处理器  |
| 存储      | aliyun-sdk-oss                      | 阿里云 OSS 服务 |
| 支付      | wechatpay-apache-httpclient         | 微信支付集成    |

#### 4. sky-pojo 模块依赖

该模块主要包含项目实体类：

| 依赖类别  | 具体依赖                                     | 用途               |
| --------- | -------------------------------------------- | ------------------ |
| 工具类    | lombok                                       | 简化实体类代码     |
| JSON 处理 | jackson-databind                             | JSON 序列化支持    |
| API 文档  | knife4j-openapi3-jakarta-spring-boot-starter | 实体类文档注释支持 |

#### 5.依赖关系图

```plaintext
sky-take-out (父模块)
├── sky-common (通用模块)
│   ├── Lombok
│   ├── FastJSON
│   ├── JWT
│   ├── 阿里云OSS
│   └── 微信支付
│
├── sky-pojo (实体类模块)
│   ├── Lombok
│   ├── Jackson
│   └── API文档支持
│
└── sky-server (核心业务模块)
    ├── 依赖 sky-common 和 sky-pojo
    ├── Spring Boot 核心
    ├── Web支持
    ├── 数据库相关
    ├── 缓存(Redis)
    ├── WebSocket
    ├── Excel处理
    └── AOP支持
```
