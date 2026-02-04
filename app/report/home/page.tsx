'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightOnRectangleIcon, UserIcon } from '@heroicons/react/24/outline';
import ReportNavBar from '@/components/common/ReportNavBar';
import HomeFilterBar from '@/components/home-report/HomeFilterBar';
import HomeKPICards from '@/components/home-report/HomeKPICards';
import HomeRankingBlock from '@/components/home-report/HomeRankingBlock';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/context';
import { createHomeApiClient } from '@/lib/api/home-client';
import { getUserRoleName } from '@/lib/auth/permissions';

export default function HomeReportPage() {
  const { user, logout } = useAuth();
  const [filters, setFilters] = useState({
    shop: '',
    salesperson: '',
    startDate: new Date(new Date().getFullYear() - 1, 0, 1),
    endDate: new Date(new Date().getFullYear() - 1, 11, 31),
  });

  // 创建带权限验证的API客户端
  const apiClient = useMemo(() => {
    return user ? createHomeApiClient(user) : null;
  }, [user]);

  // 查询KPI数据
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['home-kpi', filters, user?.id],
    queryFn: async () => {
      if (!apiClient) throw new Error('用户未登录');
      return apiClient.getKPIMetrics({
        shop: filters.shop || undefined,
        salesperson: filters.salesperson || undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    },
    enabled: !!apiClient,
  });

  // 查询品牌排行榜
  const { data: brandRankingData, isLoading: brandLoading } = useQuery({
    queryKey: ['home-ranking-brand', filters, user?.id],
    queryFn: async () => {
      if (!apiClient) throw new Error('用户未登录');
      const result = await apiClient.getBrandRanking({
        shop: filters.shop || undefined,
        salesperson: filters.salesperson || undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      return result.rankings;
    },
    enabled: !!apiClient,
  });

  // 查询门店排行榜
  const { data: shopRankingData, isLoading: shopLoading } = useQuery({
    queryKey: ['home-ranking-shop', filters, user?.id],
    queryFn: async () => {
      if (!apiClient) throw new Error('用户未登录');
      const result = await apiClient.getShopRanking({
        salesperson: filters.salesperson || undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      return result.rankings;
    },
    enabled: !!apiClient,
  });

  // 查询销售员排行榜
  const { data: salespersonRankingData, isLoading: salespersonLoading } = useQuery({
    queryKey: ['home-ranking-salesperson', filters, user?.id],
    queryFn: async () => {
      if (!apiClient) throw new Error('用户未登录');
      const result = await apiClient.getSalespersonRanking({
        shop: filters.shop || undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      return result.rankings;
    },
    enabled: !!apiClient,
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* 报表导航栏 */}
        <ReportNavBar />

        {/* 顶部导航栏 */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">家居销售报表</h1>
                <p className="text-sm text-gray-600 mt-1">基于品牌、门店和销售员的家居销售数据分析</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-gray-600">
                  <UserIcon className="w-5 h-5" />
                  <div className="text-sm">
                    <span>欢迎, {user?.userId}</span>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>角色: {user ? getUserRoleName(user) : ''}</div>
                      {user?.shopId && user.shopId !== 0 && (
                        <div>门店: {user.shopId}</div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  <span>登出</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 主内容区 */}
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          {/* 筛选条件 */}
          {user && <HomeFilterBar filters={filters} onChange={setFilters} user={user} />}

          {/* KPI指标卡片 */}
          <HomeKPICards data={kpiData} isLoading={kpiLoading} />

          {/* 品牌排行榜 */}
          <HomeRankingBlock
            title="品牌排行榜"
            dimension="brand"
            data={brandRankingData || []}
            isLoading={brandLoading}
            nameColumnHeader="品牌"
            startDate={filters.startDate}
            endDate={filters.endDate}
            shop={filters.shop}
          />

          {/* 门店排行榜 */}
          <HomeRankingBlock
            title="门店排行榜"
            dimension="shop"
            data={shopRankingData || []}
            isLoading={shopLoading}
            nameColumnHeader="门店"
            startDate={filters.startDate}
            endDate={filters.endDate}
          />

          {/* 销售员排行榜 */}
          <HomeRankingBlock
            title="销售员排行榜"
            dimension="salesperson"
            data={salespersonRankingData || []}
            isLoading={salespersonLoading}
            nameColumnHeader="销售员"
            startDate={filters.startDate}
            endDate={filters.endDate}
            shop={filters.shop}
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
    </ProtectedRoute>
  );
}
