// 报表相关类型定义

export interface FilterParams {
  shop?: string;
  salesperson?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface KPIMetrics {
  totalQuantity: number;
  totalSales: number;
  productCount: number;
  orderCount: number;
}

export interface RankingItem {
  rank: number;
  goodsName: string;
  goodsSpec: string;
  quantity?: number;
  salesAmount?: number;
  percentage: number;
  totalQuantity?: number;    // 全局销量（仅店长/店员返回）
  totalPercentage?: number;  // 全局占比（可选）
  shopRatio?: number;        // 门店销量占全公司比例（仅店长/店员返回）
}

export interface RankingResponse {
  rankings: RankingItem[];
}

export interface ShopItem {
  name: string;
  value: string;
}

export interface ShopListResponse {
  shops: ShopItem[];
}

export interface SalespeopleResponse {
  salespeople: string[];
}
