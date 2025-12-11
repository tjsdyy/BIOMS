'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card } from '@tremor/react';
import ViewToggle from '@/components/ui/ViewToggle';
import SearchBox from '@/components/ui/SearchBox';
import RangeFilter from '@/components/ui/RangeFilter';
import RankingTable from './RankingTable';
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

  // 根据搜索关键词过滤数据
  const searchedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (!searchKeyword.trim()) return data;

    const keyword = searchKeyword.toLowerCase().trim();
    return data.filter(item =>
      item.goodsName.toLowerCase().includes(keyword)
    );
  }, [data, searchKeyword]);

  // 当搜索关键词变化时，重置分页到第一页
  useEffect(() => {
    setSelectedRange({ start: 1, end: 20 });
  }, [searchKeyword]);

  // 根据选择的范围过滤数据
  const filteredData = useMemo(() => {
    if (!searchedData || searchedData.length === 0) return [];
    return searchedData.slice(selectedRange.start - 1, selectedRange.end);
  }, [searchedData, selectedRange]);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
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

          {/* 分页筛选器 */}
          <RangeFilter
            totalCount={searchedData.length}
            selectedRange={selectedRange}
            onChange={setSelectedRange}
            pageSize={20}
          />

          {/* 表格或图表展示 */}
          {searchedData.length === 0 ? (
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
                />
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
