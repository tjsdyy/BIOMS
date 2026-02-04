// 家居报表相关类型定义

export interface HomeFilterParams {
  shop?: string;
  salesperson?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface HomeKPIMetrics {
  totalQuantity: number;
  totalSales: number;
  brandCount: number;
  orderCount: number;
}

export interface HomeRankingItem {
  rank: number;
  name: string;
  quantity: number;
  salesAmount: number;
  percentage: number;
  orderCount?: number;
}

export interface HomeRankingResponse {
  rankings: HomeRankingItem[];
}

export type HomeRankingDimension = 'brand' | 'shop' | 'salesperson';
