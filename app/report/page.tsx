'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightOnRectangleIcon, UserIcon } from '@heroicons/react/24/outline';
import FilterBar from '@/components/report/FilterBar';
import KPICards from '@/components/report/KPICards';
import RankingSection from '@/components/report/RankingSection';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/context';
import { createApiClient } from '@/lib/api/client';
import { getUserRoleName } from '@/lib/auth/permissions';

export default function ReportPage() {
  const { user, logout } = useAuth();
  const [filters, setFilters] = useState({
    shop: '',
    salesperson: '',
    startDate: new Date(new Date().getFullYear() - 1, 0, 1),
    endDate: new Date(new Date().getFullYear() - 1, 11, 31),
  });

  // 创建带权限验证的API客户端
  const apiClient = useMemo(() => {
    return user ? createApiClient(user) : null;
  }, [user]);

  console.log('[ReportPage] user:', user);
  console.log('[ReportPage] apiClient:', apiClient);

  // 查询KPI数据
  const { data: kpiData, isLoading: kpiLoading, error: kpiError } = useQuery({
    queryKey: ['kpi', filters, user?.id],
    queryFn: async () => {
      console.log('[Query KPI] 开始执行查询, apiClient:', !!apiClient);
      if (!apiClient) throw new Error('用户未登录');
      try {
        const result = await apiClient.getKPIMetrics({
          shop: filters.shop || undefined,
          salesperson: filters.salesperson || undefined,
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
        console.log('[Query KPI] 查询成功，结果:', result);
        return result;
      } catch (error) {
        console.error('[Query KPI] 查询失败:', error);
        throw error;
      }
    },
    enabled: !!apiClient,
  });

  console.log('[ReportPage] KPI查询状态 - enabled:', !!apiClient, 'isLoading:', kpiLoading, 'hasData:', !!kpiData, 'error:', kpiError);

  // 查询销售额排行
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['ranking-sales', filters, user?.id],
    queryFn: async () => {
      if (!apiClient) throw new Error('用户未登录');
      const result = await apiClient.getSalesRanking({
        shop: filters.shop || undefined,
        salesperson: filters.salesperson || undefined,
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
        {/* 顶部导航栏 */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">商品销售排行榜</h1>
                <p className="text-sm text-gray-600 mt-1">基于门店和销售员的商品销售数据分析</p>
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
        {user && <FilterBar filters={filters} onChange={setFilters} user={user} />}

        {/* KPI指标卡片 */}
        <KPICards data={kpiData} isLoading={kpiLoading} />


        {/* 销售额排行榜 */}
        <RankingSection
          title="商品销售金额排行榜"
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
    </ProtectedRoute>
  );
}
