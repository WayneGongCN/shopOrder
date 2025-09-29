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

// 订单状态流转类型
export interface OrderStatusFlow {
  id: string
  orderId: string
  fromStatus: string
  toStatus: string
  operator: string
  remark: string
  createdAt: string
}

// 客户专属价格类型
export interface CustomerPrice {
  id: string
  customerId: string
  productId: string
  price: number
  createdAt: string
  updatedAt: string
}

// 查询参数类型
export interface ListParams {
  page?: number
  pageSize?: number
  keyword?: string
  [key: string]: any
}

// 统计分析类型
export interface SalesOverview {
  totalOrders: number
  totalAmount: number
  totalCustomers: number
  averageOrderAmount: number
}

export interface TrendData {
  date: string
  orders: number
  amount: number
}

export interface TopProduct {
  productId: string
  productName: string
  totalQuantity: number
  totalAmount: number
}
