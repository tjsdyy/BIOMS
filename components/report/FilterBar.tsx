'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, endOfDay, subMonths } from 'date-fns';
import { User } from '@/lib/auth/context';
import { createApiClient } from '@/lib/api/client';
import { isEmployee } from '@/lib/auth/permissions';

interface FilterBarProps {
  filters: {
    shop: string;
    salesperson: string;
    startDate: Date;
    endDate: Date;
  };
  onChange: (filters: any) => void;
  user: User;
}

export default function FilterBar({ filters, onChange, user }: FilterBarProps) {
  const [selectedQuickDate, setSelectedQuickDate] = useState<string>('lastYear');
  const apiClient = useMemo(() => createApiClient(user), [user]);

  // 判断是否为销售员角色
  const isSalesperson = useMemo(() => isEmployee(user), [user]);

  // 获取门店列表
  const { data: shopsData } = useQuery({
    queryKey: ['shops', user.id],
    queryFn: () => apiClient.getShops(),
    enabled: !!user,
  });

  // 获取销售顾问列表（根据门店和时间范围联动）
  const { data: salespeopleData } = useQuery({
    queryKey: ['salespeople', filters.shop, filters.startDate, filters.endDate, user.id],
    queryFn: () => apiClient.getSalespeople({
      shop: filters.shop || undefined,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    enabled: !!user,
  });

  const handleQuickDate = (type: string) => {
    setSelectedQuickDate(type);
    const now = new Date();
    const today = endOfDay(now);

    switch (type) {
      case 'today':
        onChange({ ...filters, startDate: new Date(now.setHours(0, 0, 0, 0)), endDate: today, salesperson: '' });
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        onChange({ ...filters, startDate: weekAgo, endDate: today, salesperson: '' });
        break;
      case 'month':
        onChange({ ...filters, startDate: startOfMonth(now), endDate: endOfDay(now), salesperson: '' });
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        onChange({ ...filters, startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth), salesperson: '' });
        break;
      case 'lastLastMonth':
        const lastLastMonth = subMonths(now, 2);
        onChange({ ...filters, startDate: startOfMonth(lastLastMonth), endDate: endOfMonth(lastLastMonth), salesperson: '' });
        break;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        onChange({ ...filters, startDate: yearStart, endDate: endOfDay(now), salesperson: '' });
        break;
      case 'lastYear':
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
        onChange({ ...filters, startDate: lastYearStart, endDate: endOfDay(lastYearEnd), salesperson: '' });
        break;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">筛选条件</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 门店选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            门店
          </label>
          <select
            value={filters.shop}
            onChange={(e) => onChange({ ...filters, shop: e.target.value, salesperson: '' })}
            disabled={isSalesperson}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isSalesperson ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
            }`}
          >
            <option value="">全部门店</option>
            {shopsData?.shops?.map((shop: { name: string; value: string }) => (
              <option key={shop.value} value={shop.name}>{shop.name}</option>
            ))}
          </select>
        </div>

        {/* 销售顾问选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            销售顾问
          </label>
          <select
            value={filters.salesperson}
            onChange={(e) => onChange({ ...filters, salesperson: e.target.value })}
            disabled={isSalesperson}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isSalesperson ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
            }`}
          >
            <option value="">全部销售顾问</option>
            {salespeopleData?.salespeople?.map((person: string) => (
              <option key={person} value={person}>{person}</option>
            ))}
          </select>
        </div>

        {/* 开始日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            开始日期
          </label>
          <input
            type="date"
            value={new Date(filters.startDate.getTime() - filters.startDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]}
            onChange={(e) => {
              setSelectedQuickDate('');
              onChange({ ...filters, startDate: new Date(e.target.value), salesperson: '' });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 结束日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            结束日期
          </label>
          <input
            type="date"
            value={new Date(filters.endDate.getTime() - filters.endDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]}
            onChange={(e) => {
              setSelectedQuickDate('');
              onChange({ ...filters, endDate: new Date(e.target.value), salesperson: '' });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 快捷日期选择 */}
      <div className="flex gap-2 pt-2 flex-wrap">
        <span className="text-sm text-gray-600 self-center">快捷选择:</span>
        
        
        <button
          type="button"
          onClick={() => handleQuickDate('lastMonth')}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
            selectedQuickDate === 'lastMonth'
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
          }`}
        >
          上月
        </button>
        
        <button
          type="button"
          onClick={() => handleQuickDate('year')}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
            selectedQuickDate === 'year'
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
          }`}
        >
          今年
        </button>
        <button
          type="button"
          onClick={() => handleQuickDate('lastYear')}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
            selectedQuickDate === 'lastYear'
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
          }`}
        >
          去年
        </button>
      </div>
    </div>
  );
}
