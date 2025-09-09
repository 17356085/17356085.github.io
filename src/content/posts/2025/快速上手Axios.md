---
title: 快速上手Axios
published: 2025-09-09
updated: 2025-09-09
description: 前后端联调如何实现？
author: mio
tags:
  - Axios
  - 网络请求
category: 前端
image: /img/二刺螈.jpg
---
> 什么是Axios？
> Axios 是一个基于 Promise 的 HTTP 客户端库，用于浏览器和 Node.js 环境。它提供了简洁的 API 来处理 HTTP 请求和响应。

**核心特性**：
1. 支持 Promise API，可以在浏览器和 Node.js 中使用
2. 支持请求和响应拦截器
3. 能够自动转换 JSON 数据
4. 提供请求和响应数据转换功能，支持取消请求
5. 具备客户端防护 XSRF 攻击的能力，并且支持上传进度监控

## 一、基础用法

### 1. 导入Axios

```javascript
// ES6 模块
import axios from 'axios';

// CommonJS
const axios = require('axios');

```

### 2. 发送GET请求

```javascript
axios.get('https://api.example.com/users')
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('请求失败:', error);
  });
```

## 二、HTTP方法支持

### 2.1 GET请求：

```javascript
// 基本 GET 请求
axios.get('/api/users')
  .then(response => console.log(response.data));

// 带参数的 GET 请求
axios.get('/api/users', {
  params: {
    page: 1,
    limit: 10
  }
})
.then(response => console.log(response.data));
```

### 2.2 POST请求：

```javascript
// 发送 POST 请求
axios.post('/api/users', {
  name: '张三',
  email: 'zhangsan@example.com'
})
.then(response => console.log(response.data));

// 使用 async/await
async function createUser() {
  try {
    const response = await axios.post('/api/users', {
      name: '李四',
      email: 'lisi@example.com'
    });
    console.log(response.data);
  } catch (error) {
    console.error('创建用户失败:', error);
  }
}
```

### 2.3 其他HTTP方法

```javascript
// PUT 请求 - 更新资源
axios.put('/api/users/1', {
  name: '王五',
  email: 'wangwu@example.com'
});

// DELETE 请求 - 删除资源
axios.delete('/api/users/1');

// PATCH 请求 - 部分更新
axios.patch('/api/users/1', {
  name: '赵六'
});
```

### 2.4 请求配置

**常用配置选项解释：**

- `baseURL`: 请求的基础 URL
    
- `timeout`: 请求超时时间（毫秒）
    
- `headers`: 自定义请求头
    
- `responseType`: 响应数据类型（json、text、blob 等）
    
- `withCredentials`: 跨域请求时是否携带凭证

```javascript
const config = {
  url: '/api/users',
  method: 'post',
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  },
  data: {
    name: '用户名'
  },
  timeout: 5000,
  responseType: 'json'
};

axios(config)
  .then(response => console.log(response.data));
```

## 三、拦截器

**请求拦截器**：

```javascript
// 添加请求拦截器
axios.interceptors.request.use(
  config => {
    // 在发送请求之前做些什么
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('请求发送:', config);
    return config;
  },
  error => {
    // 请求错误时做些什么
    return Promise.reject(error);
  }
);
```

**响应拦截器**：

```javascript
// 添加响应拦截器
axios.interceptors.response.use(
  response => {
    // 2xx 范围内的状态码都会触发该函数
    console.log('响应接收:', response);
    return response;
  },
  error => {
    // 超出 2xx 范围的状态码都会触发该函数
    if (error.response.status === 401) {
      // 处理未授权错误
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## 四、错误处理

```javascript
axios.get('/api/users')
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    if (error.response) {
      // 服务器响应了错误状态码
      console.log('响应错误:', error.response.data);
      console.log('状态码:', error.response.status);
    } else if (error.request) {
      // 请求发出但没有收到响应
      console.log('请求错误:', error.request);
    } else {
      // 其他错误
      console.log('错误:', error.message);
    }
  });
```

## 五、取消请求

可以使用 AbortController 或 Axios 的取消令牌来取消请求。

**使用 AbortController（推荐）：**

```javascript
const controller = new AbortController();

axios.get('/api/users', {
  signal: controller.signal
})
.then(response => {
  console.log(response.data);
})
.catch(error => {
  if (axios.isCancel(error)) {
    console.log('请求已取消');
  }
});

// 取消请求
controller.abort();
```

## 六、项目实战

### 6.1 构建API服务层

在实际项目中，建议创建一个统一的 API 服务层来管理所有的网络请求。

**api/index.js - API 基础配置：**

```javascript
import axios from 'axios';

// 创建 Axios 实例
const api = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 添加 loading 效果
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 添加时间戳防止缓存
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  response => {
    // 统一处理响应数据格式
    if (response.data.code === 200) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || '请求失败');
    }
  },
  error => {
    // 统一错误处理
    let message = '网络错误';
    
    if (error.response) {
      switch (error.response.status) {
        case 401:
          message = '未授权，请重新登录';
          // 清除本地存储的用户信息
          localStorage.removeItem('accessToken');
          // 跳转到登录页
          window.location.href = '/login';
          break;
        case 403:
          message = '拒绝访问';
          break;
        case 404:
          message = '请求地址不存在';
          break;
        case 500:
          message = '服务器内部错误';
          break;
        default:
          message = error.response.data?.message || '请求失败';
      }
    }
    
    // 这里可以集成消息提示组件
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

export default api;
```

### 6.2 用户管理模块

**api/user.js - 用户相关 API：**

```javascript
import api from './index';

export const userApi = {
  // 用户登录
  login(credentials) {
    return api.post('/auth/login', credentials);
  },

  // 获取用户信息
  getUserInfo() {
    return api.get('/user/profile');
  },

  // 更新用户信息
  updateUserInfo(userInfo) {
    return api.put('/user/profile', userInfo);
  },

  // 获取用户列表
  getUserList(params) {
    return api.get('/users', { params });
  },

  // 创建用户
  createUser(userData) {
    return api.post('/users', userData);
  },

  // 删除用户
  deleteUser(userId) {
    return api.delete(`/users/${userId}`);
  },

  // 上传头像
  uploadAvatar(formData, onUploadProgress) {
    return api.post('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });
  }
};
```

### 6.3 在Vue组件中使用

**components/UserManager.vue：**

```vue
<template>
  <div class="user-manager">
    <div class="actions">
      <button @click="loadUsers" :disabled="loading">
        {{ loading ? '加载中...' : '刷新用户列表' }}
      </button>
      <button @click="showCreateDialog">添加用户</button>
    </div>

    <div class="user-list">
      <div v-for="user in users" :key="user.id" class="user-card">
        <h3>{{ user.name }}</h3>
        <p>{{ user.email }}</p>
        <div class="user-actions">
          <button @click="editUser(user)">编辑</button>
          <button @click="deleteUser(user.id)" class="danger">删除</button>
        </div>
      </div>
    </div>

    <!-- 用户创建/编辑对话框 -->
    <div v-if="showDialog" class="dialog-overlay">
      <div class="dialog">
        <h3>{{ editingUser ? '编辑用户' : '创建用户' }}</h3>
        <form @submit.prevent="saveUser">
          <input 
            v-model="userForm.name" 
            placeholder="姓名" 
            required 
          />
          <input 
            v-model="userForm.email" 
            type="email" 
            placeholder="邮箱" 
            required 
          />
          <div class="dialog-actions">
            <button type="button" @click="closeDialog">取消</button>
            <button type="submit" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { userApi } from '../api/user';

export default {
  name: 'UserManager',
  data() {
    return {
      users: [],
      loading: false,
      showDialog: false,
      saving: false,
      editingUser: null,
      userForm: {
        name: '',
        email: ''
      }
    };
  },

  async created() {
    await this.loadUsers();
  },

  methods: {
    async loadUsers() {
      this.loading = true;
      try {
        this.users = await userApi.getUserList({
          page: 1,
          limit: 20
        });
      } catch (error) {
        this.$message.error(`加载用户列表失败: ${error.message}`);
      } finally {
        this.loading = false;
      }
    },

    showCreateDialog() {
      this.editingUser = null;
      this.userForm = { name: '', email: '' };
      this.showDialog = true;
    },

    editUser(user) {
      this.editingUser = user;
      this.userForm = { ...user };
      this.showDialog = true;
    },

    closeDialog() {
      this.showDialog = false;
      this.editingUser = null;
      this.userForm = { name: '', email: '' };
    },

    async saveUser() {
      this.saving = true;
      try {
        if (this.editingUser) {
          // 更新用户
          await userApi.updateUserInfo({
            id: this.editingUser.id,
            ...this.userForm
          });
          this.$message.success('用户更新成功');
        } else {
          // 创建用户
          await userApi.createUser(this.userForm);
          this.$message.success('用户创建成功');
        }
        
        this.closeDialog();
        await this.loadUsers();
      } catch (error) {
        this.$message.error(`操作失败: ${error.message}`);
      } finally {
        this.saving = false;
      }
    },

    async deleteUser(userId) {
      if (!confirm('确定要删除这个用户吗？')) {
        return;
      }

      try {
        await userApi.deleteUser(userId);
        this.$message.success('用户删除成功');
        await this.loadUsers();
      } catch (error) {
        this.$message.error(`删除用户失败: ${error.message}`);
      }
    }
  }
};
</script>
```

### 6.4 文件上传功能

**utils/upload.js - 文件上传工具：**

```javascript
import api from '../api';

export class FileUploader {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '/api/upload';
    this.allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif'];
    this.maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB
  }

  // 验证文件
  validateFile(file) {
    if (!this.allowedTypes.includes(file.type)) {
      throw new Error('不支持的文件类型');
    }

    if (file.size > this.maxSize) {
      throw new Error('文件大小超出限制');
    }

    return true;
  }

  // 单文件上传
  async uploadFile(file, onProgress) {
    this.validateFile(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(this.baseURL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percent);
          }
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`上传失败: ${error.message}`);
    }
  }

  // 多文件上传
  async uploadMultipleFiles(files, onProgress) {
    const uploadPromises = Array.from(files).map(async (file, index) => {
      return this.uploadFile(file, (percent) => {
        if (onProgress) {
          onProgress(index, percent);
        }
      });
    });

    return Promise.all(uploadPromises);
  }
}

// 使用示例
export default new FileUploader({
  baseURL: '/api/upload',
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
  maxSize: 10 * 1024 * 1024 // 10MB
});
```

### 6.5 优化缓存和防抖

```javascript
// utils/cache.js
class RequestCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  // 生成缓存键
  generateKey(config) {
    return `${config.method}_${config.url}_${JSON.stringify(config.params)}`;
  }

  // 获取缓存或发起请求
  async request(config, cacheTime = 5 * 60 * 1000) {
    const key = this.generateKey(config);
    
    // 检查是否有正在进行的相同请求
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // 检查缓存
    if (this.cache.has(key)) {
      const { data, timestamp } = this.cache.get(key);
      if (Date.now() - timestamp < cacheTime) {
        return Promise.resolve(data);
      } else {
        this.cache.delete(key);
      }
    }

    // 发起新请求
    const requestPromise = api(config)
      .then(response => {
        // 缓存响应
        this.cache.set(key, {
          data: response,
          timestamp: Date.now()
        });
        
        // 清除待处理请求
        this.pendingRequests.delete(key);
        
        return response;
      })
      .catch(error => {
        // 清除待处理请求
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  // 清除缓存
  clearCache(pattern) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

export default new RequestCache();
```