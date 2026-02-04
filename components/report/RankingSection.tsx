'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '@tremor/react';
import ViewToggle from '@/components/ui/ViewToggle';
import SearchBox from '@/components/ui/SearchBox';
import RangeFilter from '@/components/ui/RangeFilter';
import PercentageRangeFilter from '@/components/ui/PercentageRangeFilter';
import RankingTable, { SortField, SortDirection } from './RankingTable';
import RankingChart from './RankingChart';
import { RankingItem } from '@/types/report';

interface RankingSectionProps {
  title: string;
  data: RankingItem[];
  isLoading: boolean;
  valueLabel: string;
  valueFormat?: (val: number) => string;
  shop?: string;
  startDate?: Date;
  endDate?: Date;
  type: 'quantity' | 'sales';
}

export default function RankingSection({
  title,
  data,
  isLoading,
  valueLabel,
  valueFormat = (val) => val.toString(),
  shop,
  startDate,
  endDate,
  type,
}: RankingSectionProps) {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('chart');
  const [selectedRange, setSelectedRange] = useState({ start: 1, end: 20 });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortMode, setSortMode] = useState<'absolute' | 'ratio'>('absolute');

  // 表格列排序状态
  const [tableSortField, setTableSortField] = useState<SortField>('rank');
  const [tableSortDirection, setTableSortDirection] = useState<SortDirection>('asc');

  // 占比范围筛选状态
  const [percentageFilter, setPercentageFilter] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  });

  // 判断是否显示切换按钮
  const shouldShowSortToggle = useMemo(() => {
    // 前置条件：必须是数量排行榜
    if (type !== 'quantity') return false;

    if (typeof window === 'undefined') return false;
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;

    try {
      const user = JSON.parse(userStr);

      // 判断角色
      const isAdmin = user.shopId === 0;
      const isManager = user.roleIdTotal === 41;
      const isEmployee = !isAdmin && !isManager;

      // 是否有门店筛选
      const hasShopFilter = shop && shop !== '';

      // 员工：总是显示（数据是个人的，显示个人占比）
      if (isEmployee) {
        return true;
      }

      // 店长：总是显示（数据是门店的，显示门店占比）
      if (isManager) {
        return true;
      }

      // 管理员：只有选择了门店时才显示（显示门店占比）
      if (isAdmin && hasShopFilter) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, [type, shop]);

  // 获取切换按钮的文案
  const getRatioModeLabel = useMemo(() => {
    if (typeof window === 'undefined') return '占比';
    const userStr = localStorage.getItem('user');
    if (!userStr) return '占比';

    try {
      const user = JSON.parse(userStr);
      const isAdmin = user.shopId === 0;
      const isManager = user.roleIdTotal === 41;
      const isEmployee = !isAdmin && !isManager;

      // 员工显示"个人占比"，其他角色显示"门店占比"
      return isEmployee ? '个人占比' : '门店占比';
    } catch {
      return '占比';
    }
  }, []);

  // 当门店筛选改变时，重置为默认模式
  useEffect(() => {
    setSortMode('absolute');
  }, [shop]);

  // 根据搜索关键词过滤数据
  const searchedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (!searchKeyword.trim()) return data;

    const keyword = searchKeyword.toLowerCase().trim();
    return data.filter(item =>
      item.goodsName.toLowerCase().includes(keyword)
    );
  }, [data, searchKeyword]);

  // 根据占比范围筛选数据（仅表格视图时生效）
  const percentageFilteredData = useMemo(() => {
    if (!searchedData || searchedData.length === 0) return [];
    if (viewMode !== 'table') return searchedData;
    if (percentageFilter.min === null && percentageFilter.max === null) return searchedData;

    return searchedData.filter(item => {
      // 根据当前排序模式选择占比字段
      const percentage = sortMode === 'ratio' ? (item.shopRatio || 0) : item.percentage;
      const min = percentageFilter.min ?? 0;
      const max = percentageFilter.max ?? 100;
      return percentage >= min && percentage <= max;
    });
  }, [searchedData, percentageFilter, sortMode, viewMode]);

  // 获取数值的辅助函数：销售额排行榜用 salesAmount，数量排行榜用 quantity
  const getValue = useCallback((item: RankingItem) => {
    if (type === 'sales') {
      return item.salesAmount || 0;
    }
    return item.quantity !== undefined ? item.quantity : 0;
  }, [type]);

  // 根据排序模式处理数据
  const sortedData = useMemo(() => {
    if (!percentageFilteredData || percentageFilteredData.length === 0) return [];

    let baseData = percentageFilteredData;

    if (sortMode === 'ratio' && type === 'quantity') {
      // 第一步：过滤出全公司销量前30的商品
      const top30ByTotal = [...percentageFilteredData]
        .sort((a, b) => {
          const totalA = a.totalQuantity || 0;
          const totalB = b.totalQuantity || 0;
          return totalB - totalA; // 按全公司销量降序
        })
        .slice(0, 30); // 只取前30名

      // 第二步：对这30个商品按本店销量排序
      const sorted = top30ByTotal.sort((a, b) => {
        const quantityA = a.quantity || 0;
        const quantityB = b.quantity || 0;
        return quantityB - quantityA; // 按本店销量降序
      });

      // 重新分配排名
      baseData = sorted.map((item, index) => ({
        ...item,
        rank: index + 1
      }));
    }

    // 仅在表格视图时应用列排序（对全部数据排序）
    if (viewMode === 'table') {
      const tableSorted = [...baseData].sort((a, b) => {
        let aValue: number;
        let bValue: number;

        switch (tableSortField) {
          case 'rank':
            aValue = a.rank;
            bValue = b.rank;
            break;
          case 'value':
            aValue = getValue(a);
            bValue = getValue(b);
            break;
          case 'percentage':
            aValue = sortMode === 'ratio' ? (a.shopRatio || 0) : a.percentage;
            bValue = sortMode === 'ratio' ? (b.shopRatio || 0) : b.percentage;
            break;
          case 'lastYearSalesAmount':
            aValue = a.lastYearSalesAmount || 0;
            bValue = b.lastYearSalesAmount || 0;
            break;
          case 'yoyGrowthRate':
            // 未定义的增长率排在最后
            aValue = a.yoyGrowthRate ?? (tableSortDirection === 'asc' ? Infinity : -Infinity);
            bValue = b.yoyGrowthRate ?? (tableSortDirection === 'asc' ? Infinity : -Infinity);
            break;
          case 'quantity':
            aValue = a.quantity || 0;
            bValue = b.quantity || 0;
            break;
          default:
            aValue = a.rank;
            bValue = b.rank;
        }

        return tableSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      });
      return tableSorted;
    }

    return baseData; // 图表视图使用原始排序
  }, [percentageFilteredData, sortMode, type, viewMode, tableSortField, tableSortDirection, getValue]);

  // 处理表格排序变更
  const handleTableSortChange = useCallback((field: SortField, direction: SortDirection) => {
    setTableSortField(field);
    setTableSortDirection(direction);
    // 排序变更时重置到第一页
    setSelectedRange({ start: 1, end: 20 });
  }, []);

  // 当搜索关键词变化时，重置分页到第一页
  useEffect(() => {
    setSelectedRange({ start: 1, end: 20 });
  }, [searchKeyword]);

  // 当排序模式变化时，重置分页到第一页和表格排序
  useEffect(() => {
    setSelectedRange({ start: 1, end: 20 });
    setTableSortField('rank');
    setTableSortDirection('asc');
  }, [sortMode]);

  // 当原始数据变化时，重置表格排序和占比筛选
  useEffect(() => {
    setTableSortField('rank');
    setTableSortDirection('asc');
    setPercentageFilter({ min: null, max: null });
  }, [data]);

  // 当占比筛选变化时，重置分页到第一页
  useEffect(() => {
    setSelectedRange({ start: 1, end: 20 });
  }, [percentageFilter]);

  // 处理占比筛选变更
  const handlePercentageFilterChange = useCallback((range: { min: number | null; max: number | null }) => {
    setPercentageFilter(range);
  }, []);

  // 根据选择的范围过滤数据
  const filteredData = useMemo(() => {
    if (!sortedData || sortedData.length === 0) return [];
    return sortedData.slice(selectedRange.start - 1, selectedRange.end);
  }, [sortedData, selectedRange]);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>

          {/* 排序模式切换按钮 - 仅数量排行榜且满足条件时显示 */}
          {shouldShowSortToggle && (
            <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-white">
              <button
                onClick={() => setSortMode('absolute')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  sortMode === 'absolute'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                绝对销量
              </button>
              <button
                onClick={() => setSortMode('ratio')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  sortMode === 'ratio'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {getRatioModeLabel}
              </button>
            </div>
          )}
        </div>

        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          {/* 搜索框 */}
          <SearchBox
            value={searchKeyword}
            onChange={setSearchKeyword}
            placeholder="搜索商品名称..."
            totalCount={data.length}
            filteredCount={searchedData.length}
          />

          {/* 占比范围筛选器 - 仅表格视图显示 */}
          {viewMode === 'table' && (
            <div className="py-3 border-b border-gray-200">
              <PercentageRangeFilter
                value={percentageFilter}
                onChange={handlePercentageFilterChange}
                label={sortMode === 'ratio' ? (type === 'quantity' ? '门店占比' : '占比') : '占比'}
              />
            </div>
          )}

          {/* 分页筛选器 */}
          <RangeFilter
            totalCount={sortedData.length}
            selectedRange={selectedRange}
            onChange={setSelectedRange}
            pageSize={20}
          />

          {/* 表格或图表展示 */}
          {sortedData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchKeyword ? `未找到包含"${searchKeyword}"的商品` : '暂无数据'}
            </div>
          ) : (
            <div className="mt-6">
              {viewMode === 'table' && (
                <RankingTable
                  data={filteredData}
                  valueLabel={valueLabel}
                  valueFormat={valueFormat}
                  startRank={selectedRange.start}
                  sortMode={sortMode}
                  type={type}
                  sortField={tableSortField}
                  sortDirection={tableSortDirection}
                  onSortChange={handleTableSortChange}
                />
              )}
              {viewMode === 'chart' && (
                <RankingChart
                  data={filteredData}
                  valueLabel={valueLabel}
                  valueFormat={valueFormat}
                  shop={shop}
                  startDate={startDate}
                  endDate={endDate}
                  type={type}
                  startRank={selectedRange.start}
                  sortMode={sortMode}
                />
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
