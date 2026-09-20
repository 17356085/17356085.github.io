---
title: 快速上手Nginx
published: 2025-08-23
updated: 2025-08-23
description: 仅仅只是快速上手nginx，并未深入了解
author: mio
tags:
  - 后端开发
  - 项目学习
category: 后端
draft: true
---
> Nginx是一个高性能的HTTP和方向=代理服务器，同时也是一个IMAP/POP3/SMTP代理服务器。它以高性能、稳定性、丰富的功能集、简单的配置文件和低系统资源消耗而闻名。

## 1. nginx基础概念

### 1.1 核心特性

- **高并发处理**：采用异步、事件驱动的架构，能够处理数万个并发连接，内存占用极低。
- **模块化设计**：核心功能通过模块实现，支持动态加载模块，便于扩展功能（如第三方模块如Lua支持）。
- **反向代理与负载均衡**：提供强大的代理功能和多种负载均衡算法，包括轮询、IP哈希、最少连接等。
- **静态文件服务**：高效处理静态文件，支持gzip压缩、缓存控制等优化功能。
- **SSL/TLS支持**：内置SSL支持，可配置HTTPS服务，并支持现代加密标准。
- **其他**：支持WebSocket、gRPC、流媒体服务等。

### 1.2 应用场景

Nginx广泛应用于Web服务器、反向代理、负载均衡器、API网关、静态资源服务器等场景。许多知名网站如Netflix、Airbnb、GitHub等都在生产环境中使用Nginx。它也常用于微服务架构、容器化环境（如Kubernetes的Ingress控制器）。

## 2. 环境配置（win环境下）

### 2.1 目录结构

```bash
C:\nginx\            # 主安装目录
├── nginx.exe        # 主可执行文件
├── conf\            # 配置目录
│   ├── nginx.conf   # 主配置文件
│   ├── mime.types   # MIME 类型定义
│   └── ...          # 其他配置文件
├── html\            # 默认网站根目录
│   ├── index.html   # 默认欢迎页面
│   └── 50x.html     # 默认错误页面
├── logs\            # 日志目录（运行后创建）
│   ├── access.log   # 访问日志
│   └── error.log    # 错误日志
├── temp\            # 临时文件目录（运行后创建）
└── contrib\         # 附加工具和脚本
```

## 3. 基础配置

> **基本语法规则**
> 1. **指令**：以分号`;`结束，如`worker_processes auto;`。
> 2. **块**：用`{}`包围，可嵌套。
> 3. **注释**：用`#`开头。
> 4. **变量**：用`$`前缀，如`$remote_addr`。
> 5. **包含**：`include /etc/nginx/conf.d/*.conf;` 用于模块化配置。
> 
> 配置验证：`nginx -t` 检查语法错误。

### 3.1 配置文件结构

Nginx配置文件采用了层次化结构，主要块包括：

- **全局块**：用于设置Nginx服务器的全局参数。如进程管理、用户权限和日志设置。
```nginx
user nginx;                  # 运行用户
worker_processes auto;       # 进程数（auto为CPU核数）
error_log /var/log/nginx/error.log warn;  # 错误日志
```

- **events块**：配置 Nginx 的事件驱动模型和连接处理参数。Nginx 使用异步、非阻塞的事件机制来处理高并发连接，这个块主要优化 worker 进程的连接管理和事件处理效率。
```nginx
events {
    worker_connections 1024;  # 每个进程最大连接数
    use epoll;                # 事件模型（Linux推荐）
    multi_accept on;          # 同时接受多个连接
}
```

- **http块**：这是 HTTP 协议的核心配置块，用于设置所有 HTTP/HTTPS 相关的全局参数，如 MIME 类型、日志格式、gzip 压缩、缓存等。它是 server 块的父级容器，可以包含多个 server 块，实现虚拟主机管理。一个http块可以有多个server块。
```nginx
http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;
    sendfile on;              # 高效文件传输
    keepalive_timeout 65;     # 连接超时
    gzip on;                  # 压缩启用
}
```

- **server块**：定义一个虚拟主机（Virtual Host），**用于处理特定域名、IP 或端口的请求。每个 server 块对应一个独立的网站或服务配置，包括监听端口、服务器名称、根目录等**。它是 Nginx 处理 HTTP 请求的入口点，可以实现基于域名/IP/端口的区分。一个server块可以有多个location块。
```nginx
server {
    listen 80;
    server_name www.example.com;
    root /var/www/example;
    index index.html;
}
...
```

- **location块**：用于匹配具体的 URI（请求路径），并定义该路径下的处理规则，如静态文件服务、代理转发、重定向等。它是配置中最细粒度的部分，支持多种匹配模式（精确、前缀、正则等），允许针对不同路径应用不同的策略。
```nginx
location = / { return 200 "Home"; }  # 精确
location ~ \.jpg$ { root /images; }   # 正则
location / { root /var/www; }         # 通用
```

示例nginx.conf：
```nginx
# 全局块
user nginx;
worker_processes auto;

# events块
events {
    worker_connections 1024;
}

# http块
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen 80;
        server_name example.com;
        
        location / {
            root /var/www/html;
            index index.html;
        }
    }
}
```

## 3. 核心功能

### 3.1 反向代理

> 反向代理是指 Nginx 作为==中间服务器==，接收来自客户端（比如浏览器）的请求，然后将这些请求转发到后端的真实服务器（上游服务器），并将后端服务器的响应返回给客户端。(客户端只看到 Nginx 的地址，而不知道后端服务器的真实 IP 或结构。)

```nginx
http {
    upstream backend {
        server backend1.example.com:8080;  # 后端服务器
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            proxy_pass http://backend;  # 转发请求到上游
            proxy_set_header Host $host;  # 传递头部信息
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}

```

### 3.2 负载均衡

> 负载均衡是将 incoming 的请求均匀分发到多个后端服务器上，以避免单一服务器过载。

```nginx
http {
    upstream backend_servers {
        server backend1.example.com:8080 weight=1;  # 权重为1
        server backend2.example.com:8080 weight=2;  # 权重更高，接收更多请求
        server backend3.example.com:8080 backup;    # 备份服务器，只在其他宕机时使用
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            proxy_pass http://backend_servers;  # 指向 upstream 组，实现负载均衡
            health_check;  # 可选：启用健康检查
        }
    }
}

```

### 3.3 静态文件服务
```nginx
location /static/ {
    root /var/www;
    expires 30d;  # 缓存30天
    gzip_static on;
}
```

### 3.4 目前仅做了解

1️⃣ URL重写与重定向
```nginx
server {
    if ($host ~* ^www\.(.*)) { return 301 https://$1$request_uri; }
    rewrite ^/old/(.*)$ /new/$1 permanent;
}
```
2️⃣缓存控制
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;
location /api/ {
    proxy_cache my_cache;
    proxy_cache_valid 200 10m;
}
```
3️⃣ 限速与限流
```nginx
limit_req_zone $binary_remote_addr zone=one:10m rate=1r/s;
location /login {
    limit_req zone=one burst=5;
}
```
4️⃣ HTTPS与SSL配置
```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/ssl/cert.crt;
    ssl_certificate_key /etc/ssl/key.key;
    ssl_protocols TLSv1.3;
}
server { listen 80; return 301 https://$host$request_uri; }
```

## 4. 实战案例

1️⃣ **门户网站**

配置静态页面、API代理、文件上传。
```nginx
upstream api_backend {
    server 192.168.1.10:3000;
    server 192.168.1.11:3000;
    keepalive 16;
}

server {
    listen 443 ssl http2;
    server_name corporate.example.com;
    ssl_certificate /etc/ssl/corporate.crt;
    ssl_certificate_key /etc/ssl/corporate.key;

    location / {
        root /var/www/corporate;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /static/ {
        root /var/www/corporate;
        expires 1y;
        gzip_static on;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://api_backend/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_cache api_cache;
        proxy_cache_key $scheme$request_method$host$request_uri;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        add_header X-Cache-Status $upstream_cache_status;
    }

    location /upload/ {
        client_max_body_size 100m;
        proxy_pass http://file_backend/;
    }
}
```

2️⃣ **高可用负载均衡集群**

为Node.js应用构建负载均衡。
```nginx
upstream app_servers {
    least_conn;
    server app1.example.com:3000 max_fails=3 fail_timeout=30s;
    server app2.example.com:3000 max_fails=3 fail_timeout=30s;
    server app3.example.com:3000 backup;
}

server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://app_servers;
        proxy_next_upstream error timeout http_502;
        health_check;
    }
}
```

3️⃣ **API网关与微服务**

使用Nginx作为API网关，路由到不同微服务。
```nginx
map $request_uri $service {
    ~^/user/    user_service;
    ~^/product/ product_service;
    default     default_service;
}

upstream user_service { server user:8080; }
upstream product_service { server product:8081; }

server {
    location / {
        proxy_pass http://$service;
    }
}
```
