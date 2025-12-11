'use client';

import { Card, Metric, Text } from '@tremor/react';
import { KPIMetrics } from '@/types/report';

interface KPICardsProps {
  data?: KPIMetrics;
  isLoading: boolean;
}

export default function KPICards({ data, isLoading }: KPICardsProps) {
  const kpis = [
    {
      title: '总销量',
      value: data?.totalQuantity.toLocaleString() || '0',
      unit: '件',
    },
    {
      title: '总销售额',
      value: `¥${data?.totalSales.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
      unit: '',
    },
    {
      title: '商品种类数',
      value: data?.productCount.toLocaleString() || '0',
      unit: '种',
    },
    {
      title: '订单数',
      value: data?.orderCount.toLocaleString() || '0',
      unit: '单',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, index) => (
        <Card key={index} decoration="top" decorationColor="blue">
          <Text>{kpi.title}</Text>
          <Metric className="mt-2">
            {kpi.value}
            {kpi.unit && <span className="text-lg ml-1 text-gray-500">{kpi.unit}</span>}
          </Metric>
        </Card>
      ))}
    </div>
  );
}
