---
title: SpringMVC
published: 2025-08-20
updated: 2025-08-20
description: SpringMVC
author: mio
tags:
  - Spring框架
  - 项目学习
category: 后端
draft: true
---
## MVC架构

> M：Model（模型），负责业务处理及数据收集
> V：View（视图），负责数据展示
> C：Controller（控制器），负责调度，由它来决定调用Model来处理业务，什么时候调用View展示数据

![Spring MVC 架构图](https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/blog/posts/spring-mvc/mvc-architecture.png)
1️⃣ **MVC架构模式的描述**：前端浏览器发送请求给web服务器，web服务器中的Controller接收到用户的请求，Controller负责将前端提交的数据进行封装，然后Controller调用Model来处理业务，当Model处理完业务后会返回处理之后的数据给Controller，Controller再调用View来完成数据的展示，最终将结果响应给浏览器，浏览器进行渲染展示页面。

2️⃣ **面试题**：什么是三层模型，并说一说MVC架构与三层架构的区别？

**三层模型**：
![Spring MVC 请求处理流程](https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/blog/posts/spring-mvc/mvc-request-flow.png)
**MVC架构**：
![Spring MVC 与三层架构](https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/blog/posts/spring-mvc/mvc-and-three-tier.png)MVC 和三层模型都采用了分层结构来设计应用程序，都是降低耦合度，提高扩展力，提高组件复用性。

区别在于：他们的关注点不同，三层模型更加关注业务逻辑组件的划分。 MVC架构模式关注的是整个应用程序的层次关系和分离思想。现代的开发方式大部分都是MVC架构模式结合三层模型一起用。


…………………………
