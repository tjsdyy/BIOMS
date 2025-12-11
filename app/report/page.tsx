'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfDay } from 'date-fns';
import FilterBar from '@/components/report/FilterBar';
import KPICards from '@/components/report/KPICards';
import RankingSection from '@/components/report/RankingSection';

export default function ReportPage() {
  const [filters, setFilters] = useState({
    shop: '',
    salesperson: '',
    startDate: startOfMonth(new Date()),
    endDate: endOfDay(new Date()),
  });

  // 查询KPI数据
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['kpi', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(filters.shop && { shop: filters.shop }),
        ...(filters.salesperson && { salesperson: filters.salesperson }),
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
      });
      const res = await fetch(`/api/report/kpi?${params}`);
      if (!res.ok) throw new Error('Failed to fetch KPI data');
      return res.json();
    },
  });

  // 查询销量排行
  const { data: quantityData, isLoading: quantityLoading } = useQuery({
    queryKey: ['ranking-quantity', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(filters.shop && { shop: filters.shop }),
        ...(filters.salesperson && { salesperson: filters.salesperson }),
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
      });
      const res = await fetch(`/api/report/ranking-quantity?${params}`);
      if (!res.ok) throw new Error('Failed to fetch quantity ranking');
      const data = await res.json();
      return data.rankings;
    },
  });

  // 查询销售额排行
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['ranking-sales', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(filters.shop && { shop: filters.shop }),
        ...(filters.salesperson && { salesperson: filters.salesperson }),
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
      });
      const res = await fetch(`/api/report/ranking-sales?${params}`);
      if (!res.ok) throw new Error('Failed to fetch sales ranking');
      const data = await res.json();
      return data.rankings;
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">商品销售排行榜</h1>
          <p className="text-sm text-gray-600 mt-1">基于门店和销售员的商品销售数据分析</p>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* 筛选条件 */}
        <FilterBar filters={filters} onChange={setFilters} />

        {/* KPI指标卡片 */}
        <KPICards data={kpiData} isLoading={kpiLoading} />

        {/* 销量排行榜 */}
        <RankingSection
          title="商品销售数量排行榜 TOP 20"
          data={quantityData || []}
          isLoading={quantityLoading}
          valueLabel="销量"
          valueFormat={(val) => val.toLocaleString()}
          shop={filters.shop}
          startDate={filters.startDate}
          endDate={filters.endDate}
          type="quantity"
        />

        {/* 销售额排行榜 */}
        <RankingSection
          title="商品销售金额排行榜 TOP 20"
          data={salesData || []}
          isLoading={salesLoading}
          valueLabel="销售额"
          valueFormat={(val) => `¥${val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          shop={filters.shop}
          startDate={filters.startDate}
          endDate={filters.endDate}
          type="sales"
        />
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <p className="text-center text-sm text-gray-500">
            BI报表系统 © 2024
          </p>
        </div>
      </footer>
    </div>
  );
}
