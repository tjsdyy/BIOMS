'use client';

import { useState } from 'react';
import { Card } from '@tremor/react';
import ViewToggle from '@/components/ui/ViewToggle';
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
          {viewMode === 'table' && (
            <RankingTable
              data={data}
              valueLabel={valueLabel}
              valueFormat={valueFormat}
            />
          )}
          {viewMode === 'chart' && (
            <RankingChart
              data={data}
              valueLabel={valueLabel}
              valueFormat={valueFormat}
              shop={shop}
              startDate={startDate}
              endDate={endDate}
              type={type}
            />
          )}
        </>
      )}
    </Card>
  );
}
