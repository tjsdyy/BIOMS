import { User } from '@/lib/auth/context'

/**
 * 创建带用户认证信息的fetch请求头
 * @param user 用户信息
 * @returns 包含用户认证信息的请求头
 */
function createAuthHeaders(user: User): HeadersInit {
  // 使用 base64 编码避免中文字符导致的 HTTP 头部错误
  const userInfoBase64 = btoa(encodeURIComponent(JSON.stringify(user)))
  return {
    'Content-Type': 'application/json',
    'x-user-info': userInfoBase64
  }
}

/**
 * 带权限验证的API客户端
 * @param user 用户信息
 * @returns API客户端函数
 */
export function createApiClient(user: User) {
  const headers = createAuthHeaders(user)

  return {
    /**
     * 获取KPI指标
     */
    async getKPIMetrics(params: {
      shop?: string
      salesperson?: string
      startDate?: Date
      endDate?: Date
    }) {
      const searchParams = new URLSearchParams()
      if (params.shop) searchParams.set('shop', params.shop)
      if (params.salesperson) searchParams.set('salesperson', params.salesperson)
      if (params.startDate) searchParams.set('startDate', params.startDate.toISOString())
      if (params.endDate) searchParams.set('endDate', params.endDate.toISOString())

      const url = `/api/report/kpi?${searchParams}`
      console.log('[API Client] 准备发送 KPI 请求:', url)
      console.log('[API Client] 请求头:', headers)

      const response = await fetch(url, { headers })
      console.log('[API Client] KPI 响应状态:', response.status)

      if (!response.ok) throw new Error('Failed to fetch KPI metrics')
      const data = await response.json()
      console.log('[API Client] KPI 响应数据:', data)
      return data
    },

    /**
     * 获取销售额排行
     */
    async getSalesRanking(params: {
      shop?: string
      salesperson?: string
      startDate?: Date
      endDate?: Date
      limit?: number
    }) {
      const searchParams = new URLSearchParams()
      if (params.shop) searchParams.set('shop', params.shop)
      if (params.salesperson) searchParams.set('salesperson', params.salesperson)
      if (params.startDate) searchParams.set('startDate', params.startDate.toISOString())
      if (params.endDate) searchParams.set('endDate', params.endDate.toISOString())
      if (params.limit) searchParams.set('limit', params.limit.toString())

      const response = await fetch(`/api/report/ranking-sales?${searchParams}`, { headers })
      if (!response.ok) throw new Error('Failed to fetch sales ranking')
      return response.json()
    },

    /**
     * 获取门店列表
     */
    async getShops() {
      const response = await fetch('/api/filters/shops', { headers })
      if (!response.ok) throw new Error('Failed to fetch shops')
      return response.json()
    },

    /**
     * 获取销售员列表
     */
    async getSalespeople(params?: {
      shop?: string
      startDate?: Date
      endDate?: Date
    }) {
      const searchParams = new URLSearchParams()
      if (params?.shop) searchParams.set('shop', params.shop)
      if (params?.startDate) searchParams.set('startDate', params.startDate.toISOString())
      if (params?.endDate) searchParams.set('endDate', params.endDate.toISOString())

      const response = await fetch(`/api/filters/salespeople?${searchParams}`, { headers })
      if (!response.ok) throw new Error('Failed to fetch salespeople')
      return response.json()
    }
  }
}