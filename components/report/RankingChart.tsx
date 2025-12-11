'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { RankingItem } from '@/types/report';
import ProductDetailModal from './ProductDetailModal';

interface RankingChartProps {
  data: RankingItem[];
  valueLabel: string;
  valueFormat: (val: number) => string;
  shop?: string;
  startDate?: Date;
  endDate?: Date;
  type: 'quantity' | 'sales';
  startRank?: number;
}

export default function RankingChart({ data, valueLabel, valueFormat, shop, startDate, endDate, type, startRank = 1 }: RankingChartProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 柱子颜色：前三名特殊颜色
  const getBarColor = (rank: number) => {
    if (rank === 1) return '#fbbf24'; // 金色
    if (rank === 2) return '#9ca3af'; // 银色
    if (rank === 3) return '#fb923c'; // 铜色
    return '#3b82f6'; // 蓝色
  };

  const getValue = (item: RankingItem) => {
    return item.quantity !== undefined ? item.quantity : (item.salesAmount || 0);
  };

  // 查询商品明细 - 门店
  const { data: shopDetailData, isLoading: shopDetailLoading } = useQuery({
    queryKey: ['product-detail-shop', selectedProduct, shop, startDate, endDate, type],
    queryFn: async () => {
      if (!selectedProduct) return { details: [] };

      const params = new URLSearchParams({
        goodsName: selectedProduct,
        type,
        groupBy: 'shop',
        ...(shop && { shop }),
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() }),
      });

      const res = await fetch(`/api/report/product-detail?${params}`);
      return res.json();
    },
    enabled: !!selectedProduct && isModalOpen && !shop,
  });

  // 查询商品明细 - 销售员
  const { data: salespersonDetailData, isLoading: salespersonDetailLoading } = useQuery({
    queryKey: ['product-detail-salesperson', selectedProduct, shop, startDate, endDate, type],
    queryFn: async () => {
      if (!selectedProduct) return { details: [] };

      const params = new URLSearchParams({
        goodsName: selectedProduct,
        type,
        groupBy: 'salesperson',
        ...(shop && { shop }),
        ...(startDate && { startDate: startDate.toISOString() }),
        ...(endDate && { endDate: endDate.toISOString() }),
      });

      const res = await fetch(`/api/report/product-detail?${params}`);
      return res.json();
    },
    enabled: !!selectedProduct && isModalOpen,
  });

  // 格式化数据用于图表
  const chartData = data.map((item, index) => ({
    name: item.goodsName,
    goodsName: item.goodsName,
    value: getValue(item),
    rank: startRank + index,
    percentage: item.percentage,
  }));

  // 点击柱子事件
  const handleBarClick = (data: any) => {
    setSelectedProduct(data.goodsName);
    setIsModalOpen(true);
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-gray-900">排名: #{data.rank}</p>
          <p className="text-gray-700">{data.goodsName}</p>
          <p className="text-blue-600 font-semibold mt-1">
            {valueLabel}: {valueFormat(data.value)}
          </p>
          <p className="text-gray-600">
            占比: {data.percentage.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无数据
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: '600px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="goodsName"
            angle={-45}
            textAnchor="end"
            height={120}
            interval={0}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            label={{ value: valueLabel, angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            content={() => (
              <div className="flex justify-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }} />
                  <span className="text-sm">第1名</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#9ca3af' }} />
                  <span className="text-sm">第2名</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fb923c' }} />
                  <span className="text-sm">第3名</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
                  <span className="text-sm">其他</span>
                </div>
              </div>
            )}
          />
          <Bar
            dataKey="value"
            radius={[8, 8, 0, 0]}
            onClick={handleBarClick}
            cursor="pointer"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.rank)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <ProductDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        goodsName={selectedProduct || ''}
        shopDetails={shopDetailData?.details || []}
        salespersonDetails={salespersonDetailData?.details || []}
        showTabs={!shop}
        type={type}
        isLoading={shopDetailLoading || salespersonDetailLoading}
      />
    </div>
  );
}
