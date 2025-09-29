# API 封装方案设计

## 项目概述

基于微信小程序云托管 `wx.cloud.callContainer` 的API封装方案，提供统一的接口调用抽象层，便于后续切换部署方式而不影响业务代码。

## 架构设计

### 分层结构
```
业务层 (Pages/Components)
    ↓
API服务层 (api/index.js)
    ↓ 
请求封装层 (utils/cloudApi.js)
    ↓
微信云托管 (wx.cloud.callContainer)
```

## 实现方案

### 1. 基础请求封装 (utils/cloudApi.js)

```javascript
// 云托管API基础封装
class CloudApiClient {
  constructor(options = {}) {
    this.config = {
      env: options.env || 'prod-9gpdq2xv2fe20268',
      service: options.service || 'express-qnde',
      timeout: options.timeout || 10000,
      ...options.config
    }
    
    // 默认请求头
    this.defaultHeaders = {
      'X-WX-SERVICE': this.config.service,
      'Content-Type': 'application/json',
      ...this.config.headers
    }
  }

  /**
   * 通用请求方法
   * @param {Object} options 请求配置
   * @returns {Promise} 请求Promise
   */
  async request(options = {}) {
    const {
      path,
      method = 'GET',
      data,
      headers = {},
      timeout = this.config.timeout
    } = options

    const requestOptions = {
      config: {
        env: this.config.env,
        timeout
      },
      header: {
        ...this.defaultHeaders,
        ...headers
      },
      path,
      method: method.toUpperCase(),
      ...(data && { data })
    }

    try {
      console.log(`[API Request] ${method.toUpperCase()} ${path}`, data)
      
      const response = await new Promise((resolve, reject) => {
        wx.cloud.callContainer(requestOptions)
          .then(resolve)
          .catch(reject)
      })

      console.log(`[API Response] ${method.toUpperCase()} ${path}`, response)
      return this.handleResponse(response)
      
    } catch (error) {
      console.error(`[API Error] ${method.toUpperCase()} ${path}`, error)
      throw this.handleError(error)
    }
  }

  /**
   * 处理响应数据
   * @param {Object} response 原始响应
   * @returns {Object} 处理后数据
   */
  handleResponse(response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return {
        success: true,
        data: response.data?.data || response.data,
        message: response.data?.message || 'success',
        code: response.data?.code || response.statusCode
      }
    } else {
      throw new Error(response.data?.message || `请求失败: ${response.statusCode}`)
    }
  }

  /**
   * 处理错误信息
   * @param {Error} error 错误对象
   * @returns {Error} 处理后的错误
   */
  handleError(error) {
    if (error.errMsg && error.errMsg.includes('timeout')) {
      return new Error('请求超时，请检查网络连接')
    }
    
    if (error.errMsg && error.errMsg.includes('fail')) {
      return new Error('网络请求失败，请稍后重试')
    }

    return error.message ? error : new Error('未知错误')
  }

  /**
   * GET请求
   * @param {string} path 请求路径
   * @param {Object} params 查询参数
   * @param {Object} options 请求配置
   */
  async get(path, params = {}, options = {}) {
    // 将参数拼接到URL
    const queryString = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
    
    const fullPath = queryString ? `${path}?${queryString}` : path
    
    return this.request({
      path: fullPath,
      method: 'GET',
      ...options
    })
  }

  /**
   * POST请求
   * @param {string} path 请求路径
   * @param {Object} data 请求数据
   * @param {Object} options 请求配置
   */
  async post(path, data = {}, options = {}) {
    return this.request({
      path,
      method: 'POST',
      data,
      ...options
    })
  }

  /**
   * PUT请求
   * @param {string} path 请求路径
   * @param {Object} data 请求数据
   * @param {Object} options 请求配置
   */
  async put(path, data = {}, options = {}) {
    return this.request({
      path,
      method: 'PUT',
      data,
      ...options
    })
  }

  /**
   * DELETE请求
   * @param {string} path 请求路径
   * @param {Object} options 请求配置
   */
  async delete(path, options = {}) {
    return this.request({
      path,
      method: 'DELETE',
      ...options
    })
  }
}

// 创建默认实例
const apiClient = new CloudApiClient()

export default apiClient
export { CloudApiClient }
```

### 2. 业务API封装 (api/index.js)

```javascript
import apiClient from '../utils/cloudApi.js'

// 基础API配置
const API_BASE = '/api'

/**
 * 商品相关API
 */
export const productApi = {
  // 创建商品
  create: (data) => apiClient.post(`${API_BASE}/products`, data),

  // 获取商品列表
  getList: (params = {}) => apiClient.get(`${API_BASE}/products`, params),

  // 获取商品详情
  getDetail: (id) => apiClient.get(`${API_BASE}/products/${id}`),

  // 更新商品
  update: (id, data) => apiClient.put(`${API_BASE}/products/${id}`, data),

  // 删除商品
  delete: (id) => apiClient.delete(`${API_BASE}/products/${id}`)
}

/**
 * 客户相关API
 */
export const customerApi = {
  // 创建客户
  create: (data) => apiClient.post(`${API_BASE}/customers`, data),

  // 获取客户列表
  getList: (params = {}) => apiClient.get(`${API_BASE}/customers`, params),

  // 获取客户详情
  getDetail: (id) => apiClient.get(`${API_BASE}/customers/${id}`),

  // 更新客户
  update: (id, data) => apiClient.put(`${API_BASE}/customers/${id}`, data),

  // 删除客户
  delete: (id) => apiClient.delete(`${API_BASE}/customers/${id}`),

  // 获取客户专属价格
  getPrices: (customerId, params = {}) => 
    apiClient.get(`${API_BASE}/customers/${customerId}/prices`, params),

  // 设置客户专属价格
  setPrice: (customerId, data) => 
    apiClient.post(`${API_BASE}/customers/${customerId}/prices`, data)
}

/**
 * 订单相关API
 */
export const orderApi = {
  // 创建订单
  create: (data) => apiClient.post(`${API_BASE}/orders`, data),

  // 获取订单列表
  getList: (params = {}) => apiClient.get(`${API_BASE}/orders`, params),

  // 获取订单详情
  getDetail: (id, params = {}) => apiClient.get(`${API_BASE}/orders/${id}`, params),

  // 更新订单状态
  updateStatus: (id, data) => apiClient.put(`${API_BASE}/orders/${id}/status`, data),

  // 获取订单状态流转记录
  getStatusFlows: (id) => apiClient.get(`${API_BASE}/orders/${id}/status-flows`)
}

/**
 * 统计分析API
 */
export const analyticsApi = {
  // 销售概览
  getOverview: (params = {}) => apiClient.get(`${API_BASE}/analytics/overview`, params),

  // 销售趋势
  getTrend: (params = {}) => apiClient.get(`${API_BASE}/analytics/trend`, params),

  // 热销商品排行
  getTopProducts: (params = {}) => apiClient.get(`${API_BASE}/analytics/top-products`, params),

  // 客户分析
  getCustomers: (params = {}) => apiClient.get(`${API_BASE}/analytics/customers`, params)
}

/**
 * 通用API工具
 */
export const apiUtils = {
  // 处理分页参数
  formatPageParams: (page = 1, pageSize = 20) => ({
    page: Math.max(1, parseInt(page)),
    pageSize: Math.min(100, Math.max(1, parseInt(pageSize)))
  }),

  // 处理搜索参数
  formatSearchParams: (keyword) => ({
    ...(keyword && keyword.trim() && { keyword: keyword.trim() })
  }),

  // 处理日期范围参数
  formatDateRangeParams: (startDate, endDate) => ({
    ...(startDate && { startDate }),
    ...(endDate && { endDate })
  })
}
```

### 3. 数据类型定义 (api/types.js)

```typescript
// API响应类型定义
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message: string
  code: number
}

// 分页响应类型
export interface PageResponse<T = any> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 商品类型
export interface Product {
  id: string
  name: string
  globalPrice: number
  unit: string
  createdAt: string
  updatedAt: string
}

export interface CreateProductData {
  name: string
  globalPrice: number
  unit: string
}

// 客户类型
export interface Customer {
  id: string
  name: string
  phone?: string
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerData {
  name: string
  phone?: string
}

// 订单类型
export interface Order {
  id: string
  orderNo: string
  customerId: string
  totalAmount: number
  status: string
  remark?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  unit: string
  quantity: number
  unitPrice: number
  totalPrice: number
  remark?: string
}

export interface CreateOrderData {
  customerId: string
  items: Array<{
    productId: string
    quantity: number
    unit?: string
    unitPrice: number
    remark?: string
  }>
  remark?: string
}

// 查询参数类型
export interface ListParams {
  page?: number
  pageSize?: number
  keyword?: string
  [key: string]: any
}
```

## 使用示例

### 在页面中使用

```javascript
// pages/products/product-list.js
import { productApi, apiUtils } from '../../api/index.js'

Page({
  data: {
    products: [],
    loading: false,
    page: 1,
    pageSize: 20,
    total: 0,
    keyword: ''
  },

  onLoad() {
    this.loadProducts()
  },

  // 加载商品列表
  async loadProducts(page = 1) {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const params = {
        ...apiUtils.formatPageParams(page, this.data.pageSize),
        ...apiUtils.formatSearchParams(this.data.keyword)
      }
      
      const response = await productApi.getList(params)
      
      if (response.success) {
        const { list, total, page: currentPage } = response.data
        
        this.setData({
          products: page === 1 ? list : [...this.data.products, ...list],
          total,
          page: currentPage
        })
      }
      
    } catch (error) {
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 搜索
  onSearchInput(e) {
    this.setData({
      keyword: e.detail.value
    })
  },

  async onSearchConfirm() {
    this.setData({ page: 1 })
    await this.loadProducts(1)
  },

  // 删除商品
  async onDeleteProduct(e) {
    const { id } = e.currentTarget.dataset
    const product = this.data.products.find(p => p.id === id)
    
    if (!product) return
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除商品"${product.name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const response = await productApi.delete(id)
            
            if (response.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              
              // 重新加载列表
              await this.loadProducts(1)
            }
          } catch (error) {
            wx.showToast({
              title: error.message || '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 创建订单
  async createOrder(orderData) {
    try {
      wx.showLoading({ title: '创建中...' })
      
      const response = await orderApi.create(orderData)
      
      if (response.success) {
        wx.showToast({
          title: '订单创建成功',
          icon: 'success'
        })
        
        return response.data
      }
      
    } catch (error) {
      wx.showToast({
        title: error.message || '创建失败',
        icon: 'none'
      })
      throw error
    } finally {
      wx.hideLoading()
    }
  }
})
```

### 在组件中使用

```javascript
// components/product-selector/product-selector.js
import { productApi } from '../../api/index.js'

Component({
  data: {
    products: [],
    selectedProducts: {},
    loading: false
  },

  methods: {
    // 加载商品列表
    async loadProducts() {
      if (this.data.loading) return
      
      this.setData({ loading: true })
      
      try {
        const response = await productApi.getList({ pageSize: 100 })
        
        if (response.success) {
          this.setData({
            products: response.data.list
          })
        }
        
      } catch (error) {
        wx.showToast({
          title: '加载商品失败',
          icon: 'none'
        })
      } finally {
        this.setData({ loading: false })
      }
    },

    // 选择商品
    onSelectProduct(e) {
      const { product } = e.currentTarget.dataset
      const { selectedProducts } = this.data
      
      const newSelectedProducts = {
        ...selectedProducts,
        [product.id]: {
          product,
          quantity: 1,
          unitPrice: product.globalPrice,
          unit: product.unit
        }
      }
      
      this.setData({
        selectedProducts: newSelectedProducts
      })
      
      this.triggerEvent('products-change', {
        selectedProducts: newSelectedProducts
      })
    }
  },

  lifetimes: {
    attached() {
      this.loadProducts()
    }
  }
})
```

## 高级特性

### 1. 请求拦截器

```javascript
// utils/cloudApi.js - 在CloudApiClient类中添加

class CloudApiClient {
  constructor(options = {}) {
    // ... 现有代码
    
    this.requestInterceptors = []
    this.responseInterceptors = []
  }

  // 添加请求拦截器
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor)
  }

  // 添加响应拦截器
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor)
  }

  async request(options = {}) {
    // 应用请求拦截器
    let modifiedOptions = options
    for (const interceptor of this.requestInterceptors) {
      modifiedOptions = await interceptor(modifiedOptions)
    }

    // 执行请求
    const response = await new Promise((resolve, reject) => {
      wx.cloud.callContainer({
        config: {
          env: this.config.env,
          timeout: modifiedOptions.timeout || this.config.timeout
        },
        header: {
          ...this.defaultHeaders,
          ...modifiedOptions.headers
        },
        path: modifiedOptions.path,
        method: modifiedOptions.method?.toUpperCase() || 'GET',
        ...(modifiedOptions.data && { data: modifiedOptions.data })
      }).then(resolve).catch(reject)
    })

    // 应用响应拦截器
    let processedResponse = this.handleResponse(response)
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor(processedResponse)
    }

    return processedResponse
  }
}

// 使用拦截器
apiClient.addRequestInterceptor(async (options) => {
  // 添加认证token
  const token = wx.getStorageSync('auth_token')
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  }
  return options
})

apiClient.addResponseInterceptor(async (response) => {
  // 统一处理错误码
  if (response.code === 401) {
    wx.showToast({
      title: '登录已过期，请重新登录',
      icon: 'none'
    })
    // 跳转到登录页面
    wx.navigateTo({
      url: '/pages/login/login'
    })
  }
  return response
})
```

### 2. 请求缓存

```javascript
// utils/cache.js
class ApiCache {
  constructor(options = {}) {
    this.cache = new Map()
    this.defaultTTL = options.defaultTTL || 300000 // 5分钟
  }

  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expiration: Date.now() + ttl
    })
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expiration) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }

  generateKey(method, path, data) {
    return `${method.toUpperCase()}:${path}:${JSON.stringify(data || {})}`
  }
}

// 在API封装中使用缓存
const cache = new ApiCache()

// 为GET请求添加缓存
class CloudApiClient {
  async get(path, params = {}, options = {}) {
    const cacheKey = cache.generateKey('GET', path, params)
    const cached = cache.get(cacheKey)
    
    if (cached) {
      console.log(`[Cache Hit] GET ${path}`)
      return cached
    }

    const queryString = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
    
    const fullPath = queryString ? `${path}?${queryString}` : path
    
    const result = await this.request({
      path: fullPath,
      method: 'GET',
      ...options
    })

    // 缓存结果
    if (options.useCache !== false) {
      cache.set(cacheKey, result, options.cacheTTL)
    }

    return result
  }
}
```

## 配置管理

### 环境配置

```javascript
// config/api.js
const config = {
  development: {
    env: 'dev-abc123',
    service: 'express-dev',
    timeout: 10000
  },
  production: {
    env: 'prod-9gpdq2xv2fe20268',
    service: 'express-qnde',
    timeout: 15000
  }
}

// 获取当前环境配置
const getConfig = () => {
  // 可以根据实际情况切换环境
  const env = wx.getStorageSync('API_ENV') || 'production'
  return config[env]
}

export default getConfig
```

## 部署优势

### 1. 灵活切换
- **微信云托管**: 当前使用 `wx.cloud.callContainer`
- **HTTP API**: 可切换为 `wx.request`
- **云函数**: 可切换为 `wx.cloud.callFunction`
- **第三方服务**: 可轻松适配其他后端服务

### 2. 统一接口
- 业务代码无需修改
- 统一的错误处理
- 统一的响应格式

### 3. 易于测试
- 可以Mock API层进行单元测试
- 支持本地开发调试

### 4. 性能优化
- 请求缓存
- 请求去重
- 并发控制

## 总结

此封装方案提供了：

✅ **抽象层隔离**: 业务代码与具体实现解耦  
✅ **统一接口**: 所有API调用使用相同的调用方式  
✅ **错误处理**: 统一的错误处理和用户提示  
✅ **类型安全**: TypeScript类型定义支持  
✅ **缓存机制**: 提升用户体验和性能  
✅ **拦截器**: 支持认证、日志等横切关注点  
✅ **易于测试**: 支持单元测试和Mock  

通过这种设计，当您需要更换后端服务时，只需要修改 `utils/cloudApi.js` 中的实现，业务层的代码完全不需要改动。
