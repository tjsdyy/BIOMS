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
  status?: 'red' | 'yellow' | 'green';  // 与公司排名对比的颜色状态
  lastYearSalesAmount?: number;  // 去年同期销售额
  yoyGrowthRate?: number;    // 同比增长率 (Year-over-Year Growth Rate)
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
