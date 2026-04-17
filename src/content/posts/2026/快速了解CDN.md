---
title: 简单了解CDN
published: 2026-04-17
updated: 2026-04-17
description: 未命名
author: mio
tags:
  - 编程学习
category: 后端
draft: true
---
**CDN**（Content Delivery Network/Content Distribution Network）内容分发网络
- 内容：指的是静态资源，包括图片、视频、文档、Javascript、CSS、HTML等。
- 分发网络：指的是将这些静态资源分发到位于多个不同地理位置机房中的服务器上，从而实现**就近访问**——例如北京的用户直接访问北京机房的数据。
![](https://oss.javaguide.cn/github/javaguide/high-performance/cdn/cdn-101.png)

## 1. CDN加速和全站加速
### 1.1 CDN加速

📌 核心作用：把网站的**静态资源缓存到全球节点**，用户就近访问。

 🧠 工作原理：用户访问 → CDN节点有缓存 → 直接返回（不走你的服务器）。比如说，用户在日本访问，而你的服务器在新加坡，CDN就会在日本节点缓存一份资源。

✅ 优点
- 非常快（直接命中缓存）
- 减轻服务器压力
- 成本低

❌ 局限
- **不适合动态请求**
    - 登录
    - 下单
    - API请求
- 每次都要回源服务器

### 1.2 全站加速（DCDN / 全站 CDN）

📌 核心作用：不仅缓存，还优化**动态请求的传输路径**。
📦 加速内容

- 静态资源 ✅（和 CDN 一样）
- 动态请求 ✅（核心区别），比如 登录接口 `/login` 获取用户信息 `/api/user`，下单 `/order`。
🧠 工作原理（重点）

1. **智能路由（选最快路径）**
2. **TCP优化 / QUIC加速**
3. **连接复用**
4. **边缘节点中转**

👉 变成：  
用户 → 最近加速节点 → 优化链路 → 源站
而不是：  
用户 → 直接跨国访问服务器

## 2. CDN的工作原理
![](https://oss.javaguide.cn/github/javaguide/high-performance/cdn/cdn-full-life-cycle-of-cdn-cache.png)

>图片来自https://javaguide.cn/，侵删