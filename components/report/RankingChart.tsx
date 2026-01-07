'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
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
import { authFetch } from '@/lib/api/auth-fetch';
import { isEmployee } from '@/lib/auth/permissions';

interface RankingChartProps {
  data: RankingItem[];
  valueLabel: string;
  valueFormat: (val: number) => string;
  shop?: string;
  startDate?: Date;
  endDate?: Date;
  type: 'quantity' | 'sales';
  startRank?: number;
  sortMode?: 'absolute' | 'ratio';
}

export default function RankingChart({ data, valueLabel, valueFormat, shop, startDate, endDate, type, startRank = 1, sortMode = 'absolute' }: RankingChartProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 获取用户信息并判断是否为员工
  const userIsEmployee = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    try {
      const user = JSON.parse(userStr);
      return isEmployee(user);
    } catch {
      return false;
    }
  }, []);

  // 柱子颜色：前三名特殊颜色
  const getBarColor = (entry: any) => {
	console.log(entry);
	let status = entry.status;
	if (status === 'green') return '#008000'; // 绿色
	if (status === 'yellow') return '#ffa500'; // 黄色
	if (status === 'red') return '#ff0000'; // 红色

	let rank = entry.rank;
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

      const res = await authFetch(`/api/report/product-detail?${params}`);
      return res.json();
    },
    enabled: !!selectedProduct && isModalOpen,
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

      const res = await authFetch(`/api/report/product-detail?${params}`);
      return res.json();
    },
    enabled: !!selectedProduct && isModalOpen,
  });

  // 获取角色信息用于动态文案
  const getRatioLabel = useMemo(() => {
    if (typeof window === 'undefined') return '占比 (%)';
    const userStr = localStorage.getItem('user');
    if (!userStr) return '占比 (%)';

    try {
      const user = JSON.parse(userStr);
      const isAdmin = user.shopId === 0;
      const isManager = user.roleIdTotal === 41;
      const isEmployee = !isAdmin && !isManager;

      return isEmployee ? '个人占比 (%)' : '门店占比 (%)';
    } catch {
      return '占比 (%)';
    }
  }, []);

  // 格式化数据用于图表
  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: item.goodsName,
      goodsName: item.goodsName,
      // 在占比模式下，bar高度显示全公司销量；否则显示本店销量
      value: sortMode === 'ratio' ? (item.totalQuantity || 0) : getValue(item),
      originalValue: getValue(item), // 保留原始销量用于Tooltip
      totalValue: item.totalQuantity, // 全局数值
      rank: item.rank, // 使用 item 自带的排名（已经根据 sortMode 重新计算）
      percentage: item.percentage,
      status: item.status,

      shopRatio: item.shopRatio || 0, // 门店占比（用于折线图）
    }));
  }, [data, sortMode]);

  // 点击柱子事件
  const handleBarClick = (data: any) => {
    setSelectedProduct(data.goodsName);
    setIsModalOpen(true);
  };

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      // 获取角色信息
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      let ratioLabel = '占比';
      let salesLabel = '销量';
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const isEmployee = user.shopId !== 0 && user.roleIdTotal !== 41;
          ratioLabel = isEmployee ? '个人占全公司' : '门店占全公司';
          salesLabel = isEmployee ? '个人销量' : '本店销量';
        } catch {}
      }

      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-gray-900">排名: #{data.rank}</p>
          <p className="text-gray-700">{data.goodsName}</p>
          {sortMode === 'ratio' ? (
            <>
              <p className="text-blue-600 font-semibold mt-1">
                全公司销量: {data.totalValue?.toLocaleString() || 0}
              </p>
              <p className="text-green-600">
                {salesLabel}: {data.originalValue?.toLocaleString() || 0}
              </p>
              <p className="text-purple-600 font-semibold">
                {ratioLabel}: {data.shopRatio.toFixed(2)}%
              </p>
            </>
          ) : (
            <>
              <p className="text-blue-600 font-semibold mt-1">
                {valueLabel}: {valueFormat(data.originalValue)}
              </p>
              {data.shopRatio > 0 && (
                <p className="text-purple-600 font-semibold">
                  {ratioLabel}: {data.shopRatio.toFixed(2)}%
                </p>
              )}
            </>
          )}
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
      {chartData.length > 0 ? (
        <ResponsiveContainer key={`${sortMode}-${chartData[0]?.goodsName || ''}`} width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 60, left: 20, bottom: 100 }}
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
          {/* 左侧Y轴：显示销量 */}
          <YAxis
            yAxisId="left"
            label={{
              value: sortMode === 'ratio' ? '全公司销量' : valueLabel,
              angle: -90,
              position: 'insideLeft'
            }}
            tick={{ fontSize: 12 }}
          />
          {/* 右侧Y轴：显示占比（仅在占比模式下） */}
          {sortMode === 'ratio' && (
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{
                value: getRatioLabel,
                angle: 90,
                position: 'insideRight'
              }}
              tick={{ fontSize: 12 }}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend
            content={() => (
              <div className="flex justify-center gap-4 mt-4">
                {sortMode === 'ratio' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="text-sm">全公司销量</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#a855f7' }} />
                      <span className="text-sm">门店占比</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ff0000' }} />
                      <span className="text-sm">高于平均</span>	
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ffa500' }} />
                      <span className="text-sm">等于平均</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#008000' }} />
                      <span className="text-sm">低于平均 </span>
                    </div>
                  </>
                )}
              </div>
            )}
          />
          {/* 柱状图 */}
          <Bar
            yAxisId="left"
            dataKey="value"
            radius={[8, 8, 0, 0]}
            onClick={handleBarClick}
            cursor="pointer"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={sortMode === 'ratio' ? '#3b82f6' : getBarColor(entry)}
              />
            ))}
          </Bar>
          {/* 折线图（仅在占比模式下显示） */}
          {sortMode === 'ratio' && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="shopRatio"
              stroke="#a855f7"
              strokeWidth={3}
              dot={{ r: 4, fill: '#a855f7' }}
              activeDot={{ r: 6 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      ) : (
        <div className="text-center py-12 text-gray-500">
          暂无数据
        </div>
      )}

      <ProductDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        goodsName={selectedProduct || ''}
        shopDetails={shopDetailData?.details || []}
        salespersonDetails={salespersonDetailData?.details || []}
        showTabs={!userIsEmployee}
        type={type}
        isLoading={shopDetailLoading || salespersonDetailLoading}
        startDate={startDate?.toISOString()}
        endDate={endDate?.toISOString()}
        shop={shop}
      />
    </div>
  );
}
