import { User } from '@/lib/auth/context';
import type { HomeKPIMetrics, HomeRankingResponse } from '@/types/home-report';

/**
 * 创建带用户认证信息的fetch请求头
 * @param user 用户信息
 * @returns 包含用户认证信息的请求头
 */
function createAuthHeaders(user: User): HeadersInit {
  const userInfoBase64 = btoa(encodeURIComponent(JSON.stringify(user)));
  return {
    'Content-Type': 'application/json',
    'x-user-info': userInfoBase64,
  };
}

/**
 * 家居报表API客户端
 * @param user 用户信息
 * @returns API客户端函数
 */
export function createHomeApiClient(user: User) {
  const headers = createAuthHeaders(user);

  return {
    /**
     * 获取家居KPI指标
     */
    async getKPIMetrics(params: {
      shop?: string;
      salesperson?: string;
      startDate?: Date;
      endDate?: Date;
    }): Promise<HomeKPIMetrics> {
      const searchParams = new URLSearchParams();
      if (params.shop) searchParams.set('shop', params.shop);
      if (params.salesperson) searchParams.set('salesperson', params.salesperson);
      if (params.startDate) searchParams.set('startDate', params.startDate.toISOString());
      if (params.endDate) searchParams.set('endDate', params.endDate.toISOString());

      const response = await fetch(`/api/home-report/kpi?${searchParams}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch home KPI metrics');
      return response.json();
    },

    /**
     * 获取品牌排行榜
     */
    async getBrandRanking(params: {
      shop?: string;
      salesperson?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }): Promise<HomeRankingResponse> {
      const searchParams = new URLSearchParams();
      if (params.shop) searchParams.set('shop', params.shop);
      if (params.salesperson) searchParams.set('salesperson', params.salesperson);
      if (params.startDate) searchParams.set('startDate', params.startDate.toISOString());
      if (params.endDate) searchParams.set('endDate', params.endDate.toISOString());
      if (params.limit) searchParams.set('limit', params.limit.toString());

      const response = await fetch(`/api/home-report/ranking-brand?${searchParams}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch brand ranking');
      return response.json();
    },

    /**
     * 获取门店排行榜
     */
    async getShopRanking(params: {
      salesperson?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }): Promise<HomeRankingResponse> {
      const searchParams = new URLSearchParams();
      if (params.salesperson) searchParams.set('salesperson', params.salesperson);
      if (params.startDate) searchParams.set('startDate', params.startDate.toISOString());
      if (params.endDate) searchParams.set('endDate', params.endDate.toISOString());
      if (params.limit) searchParams.set('limit', params.limit.toString());

      const response = await fetch(`/api/home-report/ranking-shop?${searchParams}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch shop ranking');
      return response.json();
    },

    /**
     * 获取销售员排行榜
     */
    async getSalespersonRanking(params: {
      shop?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }): Promise<HomeRankingResponse> {
      const searchParams = new URLSearchParams();
      if (params.shop) searchParams.set('shop', params.shop);
      if (params.startDate) searchParams.set('startDate', params.startDate.toISOString());
      if (params.endDate) searchParams.set('endDate', params.endDate.toISOString());
      if (params.limit) searchParams.set('limit', params.limit.toString());

      const response = await fetch(`/api/home-report/ranking-salesperson?${searchParams}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch salesperson ranking');
      return response.json();
    },

    /**
     * 获取门店列表（复用现有接口）
     */
    async getShops() {
      const response = await fetch('/api/filters/shops', { headers });
      if (!response.ok) throw new Error('Failed to fetch shops');
      return response.json();
    },

    /**
     * 获取销售员列表（家居报表专用）
     */
    async getSalespeople(params?: {
      shop?: string;
      startDate?: Date;
      endDate?: Date;
    }) {
      const searchParams = new URLSearchParams();
      if (params?.shop) searchParams.set('shop', params.shop);
      if (params?.startDate) searchParams.set('startDate', params.startDate.toISOString());
      if (params?.endDate) searchParams.set('endDate', params.endDate.toISOString());

      const response = await fetch(`/api/home-report/salespeople?${searchParams}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch salespeople');
      return response.json();
    },
  };
}
