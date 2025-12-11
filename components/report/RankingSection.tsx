'use client';

import { useState, useMemo } from 'react';
import { Card } from '@tremor/react';
import ViewToggle from '@/components/ui/ViewToggle';
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

  // 根据选择的范围过滤数据
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.slice(selectedRange.start - 1, selectedRange.end);
  }, [data, selectedRange]);

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
          {/* 数据调试信息 */}
          {data.length > 0 && (
            <div className="mb-4 text-sm text-gray-600">
              数据总数: {data.length} 条
            </div>
          )}

          {/* 分页筛选器 */}
          <RangeFilter
            totalCount={data.length}
            selectedRange={selectedRange}
            onChange={setSelectedRange}
            pageSize={20}
          />

          {/* 表格或图表展示 */}
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
        </>
      )}
    </Card>
  );
}
