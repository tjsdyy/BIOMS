'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { HomeRankingItem } from '@/types/home-report';

interface HomeRankingChartProps {
  data: HomeRankingItem[];
  nameColumnHeader: string;
  onBarClick?: (name: string) => void;
}

export default function HomeRankingChart({ data, nameColumnHeader, onBarClick }: HomeRankingChartProps) {
  // 计算Y轴最大值
  const yAxisMax = useMemo(() => {
    if (!data || data.length === 0) return 100000;
    const maxSales = Math.max(...data.map(item => item.salesAmount || 0));
    // 增加10%余量，并向上取整到合适的数值
    return Math.ceil(maxSales * 1.1);
  }, [data]);

  const percentageMax = useMemo(() => {
    if (!data || data.length === 0) return 100;
    const maxPercentage = Math.max(...data.map(item => item.percentage || 0));
    return Math.ceil(maxPercentage * 1.2);
  }, [data]);

  // 根据排名获取颜色
  const getBarColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#fbbf24'; // 金色
      case 2:
        return '#9ca3af'; // 银色
      case 3:
        return '#fb923c'; // 铜色
      default:
        return '#3b82f6'; // 蓝色
    }
  };

  // 格式化金额
  const formatSalesAmount = (value: number) => {
    if (value >= 10000) {
      return `¥${(value / 10000).toFixed(1)}万`;
    }
    return `¥${value.toLocaleString()}`;
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as HomeRankingItem;
      return (
        <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{item.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">
              排名: <span className="font-medium text-gray-900">{item.rank}</span>
            </p>
            <p className="text-gray-600">
              销售额: <span className="font-medium text-gray-900">
                ¥{item.salesAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
            <p className="text-gray-600">
              销量: <span className="font-medium text-gray-900">{item.quantity.toLocaleString()}</span>
            </p>
            <p className="text-gray-600">
              占比: <span className="font-medium text-gray-900">{item.percentage.toFixed(2)}%</span>
            </p>
            {item.orderCount !== undefined && (
              <p className="text-gray-600">
                订单数: <span className="font-medium text-gray-900">{item.orderCount.toLocaleString()}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            interval={0}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            height={100}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            type="number"
            domain={[0, yAxisMax]}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={formatSalesAmount}
            label={{ value: '销售额', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            type="number"
            domain={[0, percentageMax]}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
            label={{ value: '占比', angle: 90, position: 'insideRight', style: { fontSize: 12, fill: '#6b7280' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              if (value === 'salesAmount') return '销售额';
              if (value === 'percentage') return '占比';
              return value;
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="salesAmount"
            name="salesAmount"
            radius={[4, 4, 0, 0]}
            cursor={onBarClick ? 'pointer' : 'default'}
            onClick={(data) => {
              if (onBarClick && data?.name) {
                onBarClick(data.name);
              }
            }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.rank)} />
            ))}
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="percentage"
            name="percentage"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
