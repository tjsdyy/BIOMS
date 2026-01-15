'use client';

import { Dialog, Transition, Tab } from '@headlessui/react';
import { Fragment, useMemo, useState, useEffect, useCallback } from 'react';
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { isAdmin } from '@/lib/auth/permissions';
import { authFetch } from '@/lib/api/auth-fetch';
import * as XLSX from 'xlsx';

interface ProductDetail {
  name: string;
  quantity: number;
  salesAmount: number;
  hasDisplay?: boolean;
  shopTotalSales?: number;
  personTotalSales?: number;
  rank?: number;  // 全局排名
  rankWeight?: number;  // 基于 weightedAmount 的分档排名（10人一档）
  shopName?: string;  // 销售顾问所在门店
  companyTotalSales?: number;  // 公司总销售额
  weightedAmount?: number;  // 加权金额
  lastYearSalesAmount?: number;  // 去年同期销售额
}

interface OrderDetail {
  payTime: Date;
  orderSn: string;
  doneSales1Name: string;
  shopNameDone: string;
  goodsBom: string;
  goodsName: string;
  goodsSpec: string;
  goodsNum: number;
  goodsPrice: number;
}

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  goodsName: string;
  shopDetails: ProductDetail[];
  salespersonDetails: ProductDetail[];
  showTabs: boolean;
  type: 'quantity' | 'sales';
  isLoading: boolean;
  startDate?: string;
  endDate?: string;
  shop?: string;
}

// 颜色档位配置 - 销售顾问（10个一档）
const RANK_COLORS = [
  { bgStyle: { backgroundColor: 'rgba(255, 0, 0, 0.1)' }, textStyle: { color: 'rgb(200, 0, 0)' }, colorStyle: { backgroundColor: 'rgb(255, 0, 0)' }, name: '第1-10名', emoji: '🔴' },
  { bgStyle: { backgroundColor: 'rgba(255, 165, 0, 0.1)' }, textStyle: { color: 'rgb(200, 100, 0)' }, colorStyle: { backgroundColor: 'rgb(255, 165, 0)' }, name: '第11-20名', emoji: '🟠' },
  { bgStyle: { backgroundColor: 'rgba(255, 255, 0, 0.1)' }, textStyle: { color: 'rgb(180, 180, 0)' }, colorStyle: { backgroundColor: 'rgb(255, 255, 0)' }, name: '第21-30名', emoji: '🟡' },
  { bgStyle: { backgroundColor: 'rgba(0, 128, 0, 0.1)' }, textStyle: { color: 'rgb(0, 100, 0)' }, colorStyle: { backgroundColor: 'rgb(0, 128, 0)' }, name: '第31-40名', emoji: '🟢' },
  { bgStyle: { backgroundColor: 'rgba(0, 255, 255, 0.1)' }, textStyle: { color: 'rgb(0, 180, 180)' }, colorStyle: { backgroundColor: 'rgb(0, 255, 255)' }, name: '第41-50名', emoji: '🟦' },
  { bgStyle: { backgroundColor: 'rgba(0, 0, 255, 0.1)' }, textStyle: { color: 'rgb(0, 0, 200)' }, colorStyle: { backgroundColor: 'rgb(0, 0, 255)' }, name: '第51-60名', emoji: '🔵' },
  { bgStyle: { backgroundColor: 'rgba(128, 0, 128, 0.1)' }, textStyle: { color: 'rgb(100, 0, 100)' }, colorStyle: { backgroundColor: 'rgb(128, 0, 128)' }, name: '第61-70名', emoji: '🟣' },
];

// 颜色档位配置 - 门店（2个一档）
const SHOP_RANK_COLORS = [
  { bgStyle: { backgroundColor: 'rgba(255, 0, 0, 0.1)' }, textStyle: { color: 'rgb(200, 0, 0)' }, colorStyle: { backgroundColor: 'rgb(255, 0, 0)' }, name: '第1-2名', emoji: '🔴' },
  { bgStyle: { backgroundColor: 'rgba(255, 165, 0, 0.1)' }, textStyle: { color: 'rgb(200, 100, 0)' }, colorStyle: { backgroundColor: 'rgb(255, 165, 0)' }, name: '第3-4名', emoji: '🟠' },
  { bgStyle: { backgroundColor: 'rgba(255, 255, 0, 0.1)' }, textStyle: { color: 'rgb(180, 180, 0)' }, colorStyle: { backgroundColor: 'rgb(255, 255, 0)' }, name: '第5-6名', emoji: '🟡' },
  { bgStyle: { backgroundColor: 'rgba(0, 128, 0, 0.1)' }, textStyle: { color: 'rgb(0, 100, 0)' }, colorStyle: { backgroundColor: 'rgb(0, 128, 0)' }, name: '第7-8名', emoji: '🟢' },
  { bgStyle: { backgroundColor: 'rgba(0, 255, 255, 0.1)' }, textStyle: { color: 'rgb(0, 180, 180)' }, colorStyle: { backgroundColor: 'rgb(0, 255, 255)' }, name: '第9-10名', emoji: '🟦' },
  { bgStyle: { backgroundColor: 'rgba(0, 0, 255, 0.1)' }, textStyle: { color: 'rgb(0, 0, 200)' }, colorStyle: { backgroundColor: 'rgb(0, 0, 255)' }, name: '第11-12名', emoji: '🔵' },
  { bgStyle: { backgroundColor: 'rgba(128, 0, 128, 0.1)' }, textStyle: { color: 'rgb(100, 0, 100)' }, colorStyle: { backgroundColor: 'rgb(128, 0, 128)' }, name: '第13-14名', emoji: '🟣' },
];

function getRankColor(rank: number, isShopView: boolean = false) {
  const colors = isShopView ? SHOP_RANK_COLORS : RANK_COLORS;
  const divisor = isShopView ? 2 : 10; // 门店2个一档，销售顾问10个一档
  const colorIndex = Math.floor((rank - 1) / divisor);
  if (colorIndex >= colors.length) {
    return { bgStyle: { backgroundColor: 'rgba(200, 200, 200, 0.1)' }, textStyle: { color: 'rgb(120, 120, 120)' }, emoji: '⚪' };
  }
  return colors[colorIndex];
}

// 根据 rankWeight（加权排名档位）获取颜色
function getRankWeightColor(rankWeight?: number) {
  if (!rankWeight) {
    return { bgStyle: { backgroundColor: 'rgba(200, 200, 200, 0.1)' }, textStyle: { color: 'rgb(120, 120, 120)' }, emoji: '⚪' };
  }
  const colorIndex = rankWeight - 1; // rankWeight 已经是档位号（1, 2, 3...），直接用作索引
  if (colorIndex >= RANK_COLORS.length) {
    return { bgStyle: { backgroundColor: 'rgba(200, 200, 200, 0.1)' }, textStyle: { color: 'rgb(120, 120, 120)' }, emoji: '⚪' };
  }
  return RANK_COLORS[colorIndex];
}

type SortField = 'rank' | 'name' | 'quantity' | 'salesAmount' | 'weightedAmount' | 'percentage' | 'totalPercentage' | 'personTotalSales' | 'lastYearSalesAmount' | 'yoyGrowth';
type SortDirection = 'asc' | 'desc';

export default function ProductDetailModal({
  isOpen,
  onClose,
  goodsName,
  shopDetails,
  salespersonDetails,
  showTabs,
  type,
  isLoading,
  startDate,
  endDate,
  shop,
}: ProductDetailModalProps) {
  // 排序状态 - 为门店和销售顾问分别维护
  const [shopSortField, setShopSortField] = useState<SortField>('rank');
  const [shopSortDirection, setShopSortDirection] = useState<SortDirection>('asc');
  const [salespersonSortField, setSalespersonSortField] = useState<SortField>('rank');
  const [salespersonSortDirection, setSalespersonSortDirection] = useState<SortDirection>('asc');

  // 门店筛选和tab切换状态
  const [selectedShop, setSelectedShop] = useState<string>('all');
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);

  // 订单明细状态
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // 获取用户信息并判断是否为管理员
  const userIsAdmin = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    try {
      const user = JSON.parse(userStr);
      return isAdmin(user);
    } catch {
      return false;
    }
  }, []);

  // 获取所有唯一的门店列表
  const shopList = useMemo(() => {
    const shops = salespersonDetails
      .map(item => item.shopName)
      .filter((name): name is string => !!name);
    return Array.from(new Set(shops)).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [salespersonDetails]);

  // 获取订单明细数据
  const fetchOrderDetails = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const params = new URLSearchParams();
      params.append('goodsName', goodsName);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (shop) params.append('shop', shop);

      const response = await authFetch(`/api/report/product-order-details?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      const data = await response.json();
      setOrderDetails(data.orderDetails || []);
    } catch (error) {
      console.error('Error fetching order details:', error);
      setOrderDetails([]);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [goodsName, startDate, endDate, shop]);

  useEffect(() => {
    if (isOpen && selectedTabIndex === 2) {
      fetchOrderDetails();
    }
  }, [isOpen, selectedTabIndex, fetchOrderDetails]);

  // 根据选中的门店筛选销售顾问数据
  const filteredSalespersonDetails = useMemo(() => {
    if (selectedShop === 'all') {
      return salespersonDetails;
    }
    return salespersonDetails.filter(item => item.shopName === selectedShop);
  }, [salespersonDetails, selectedShop]);

  // 处理门店单元格点击
  const handleShopClick = (shopName: string) => {
    setSelectedShop(shopName);
    setSelectedTabIndex(1); // 切换到销售顾问排行tab
  };

  // 导出Excel函数
  const exportToExcel = () => {
    if (orderDetails.length === 0) {
      alert('没有数据可以导出');
      return;
    }

    // 格式化数据
    const exportData = orderDetails.map(item => ({
      '付款时间': new Date(item.payTime).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }),
      '订单号': item.orderSn,
      '销售员': item.doneSales1Name,
      '门店': item.shopNameDone,
      '商品编码': item.goodsBom,
      '商品名称': item.goodsName,
      '商品规格': item.goodsSpec,
      '数量': item.goodsNum,
      '单价': item.goodsPrice,
      '金额': item.goodsNum * item.goodsPrice,
    }));

    // 创建工作簿
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '订单明细');

    // 设置列宽
    const colWidths = [
      { wch: 20 }, // 付款时间
      { wch: 20 }, // 订单号
      { wch: 12 }, // 销售员
      { wch: 15 }, // 门店
      { wch: 15 }, // 商品编码
      { wch: 25 }, // 商品名称
      { wch: 20 }, // 商品规格
      { wch: 8 },  // 数量
      { wch: 10 }, // 单价
      { wch: 12 }, // 金额
    ];
    ws['!cols'] = colWidths;

    // 下载文件
    const fileName = `${goodsName}-订单明细-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const renderTable = (details: ProductDetail[], title: string, showDisplayColumn = false, isShopView = false, onShopClick?: (shopName: string) => void) => {
    // 获取当前表格的排序状态
    const sortField = isShopView ? shopSortField : salespersonSortField;
    const sortDirection = isShopView ? shopSortDirection : salespersonSortDirection;
    const setSortField = isShopView ? setShopSortField : setSalespersonSortField;
    const setSortDirection = isShopView ? setShopSortDirection : setSalespersonSortDirection;

    // 计算总销售额（用于计算该商品在所有门店/销售顾问的占比）
    const totalSalesAmount = details.reduce((sum, item) => sum + item.salesAmount, 0);

    // 判断是否显示个人/门店总销售额占比
    const showTotalPercentage = details.some(item =>
      (item.shopTotalSales && item.shopTotalSales > 0) ||
      (item.personTotalSales && item.personTotalSales > 0)
    );

    // 处理排序
    const handleSort = (field: SortField) => {
      if (sortField === field) {
        // 如果点击同一列，切换排序方向
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        // 如果点击不同列，设置新列并默认升序
        setSortField(field);
        setSortDirection('asc');
      }
    };

    // 排序数据
    const sortedDetails = [...details].sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      // 计算比较值
      if (sortField === 'rank') {
        aValue = a.rank || 0;
        bValue = b.rank || 0;
      } else if (sortField === 'name') {
        aValue = a.name;
        bValue = b.name;
      } else if (sortField === 'quantity') {
        aValue = a.quantity;
        bValue = b.quantity;
      } else if (sortField === 'salesAmount') {
        aValue = a.salesAmount;
        bValue = b.salesAmount;
      } else if (sortField === 'weightedAmount') {
        aValue = a.weightedAmount || 0;
        bValue = b.weightedAmount || 0;
      } else if (sortField === 'percentage') {
        aValue = totalSalesAmount > 0 ? (a.salesAmount / totalSalesAmount) * 100 : 0;
        bValue = totalSalesAmount > 0 ? (b.salesAmount / totalSalesAmount) * 100 : 0;
      } else if (sortField === 'totalPercentage') {
        const aTotalSales = a.shopTotalSales || a.personTotalSales || 0;
        const bTotalSales = b.shopTotalSales || b.personTotalSales || 0;
        aValue = aTotalSales > 0 ? (a.salesAmount / aTotalSales) * 100 : 0;
        bValue = bTotalSales > 0 ? (b.salesAmount / bTotalSales) * 100 : 0;
      } else if (sortField === 'lastYearSalesAmount') {
        aValue = a.lastYearSalesAmount || 0;
        bValue = b.lastYearSalesAmount || 0;
      } else if (sortField === 'yoyGrowth') {
        // 同比增长率排序：去年为0时排在最后
        const aLastYear = a.lastYearSalesAmount || 0;
        const bLastYear = b.lastYearSalesAmount || 0;
        aValue = aLastYear > 0 ? ((a.salesAmount - aLastYear) / aLastYear) * 100 : -Infinity;
        bValue = bLastYear > 0 ? ((b.salesAmount - bLastYear) / bLastYear) * 100 : -Infinity;
      }

      // 比较逻辑
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue, 'zh-CN')
          : bValue.localeCompare(aValue, 'zh-CN');
      } else {
        return sortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    // 排序图标组件
    const SortIcon = ({ field }: { field: SortField }) => {
      if (sortField !== field) {
        return <div className="w-4 h-4" />; // 占位符
      }
      return sortDirection === 'asc' ? (
        <ChevronUpIcon className="w-4 h-4" />
      ) : (
        <ChevronDownIcon className="w-4 h-4" />
      );
    };

    return (
      <div className="mt-4">
        {/* 颜色图例 */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold text-gray-700 mb-2">排名颜色说明：</p>
          <div className="flex flex-wrap gap-3">
            {(isShopView ? SHOP_RANK_COLORS : RANK_COLORS).map((color, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-lg">{color.emoji}</span>
                <span className="text-xs text-gray-600">{color.name}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="text-lg">⚪</span>
              <span className="text-xs text-gray-600">第{isShopView ? '15' : '71'}名及以后</span>
            </div>
          </div>
        </div>



        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="py-3.5 pl-4 pr-3 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('rank')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>排名</span>
                    <SortIcon field="rank" />
                  </div>
                </th>
                <th
                  className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{title}</span>
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>销量</span>
                    <SortIcon field="quantity" />
                  </div>
                </th>
                <th
                  className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('salesAmount')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>销售额(目录价)</span>
                    <SortIcon field="salesAmount" />
                  </div>
                </th>
                {!isShopView && userIsAdmin && (
                  <th
                    className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('percentage')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>销售额占比</span>
                      <SortIcon field="percentage" />
                    </div>
                  </th>
                )}
                {!isShopView && (
                  <th
                    className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('weightedAmount')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>加权排名档位</span>
                      <SortIcon field="weightedAmount" />
                    </div>
                  </th>
                )}
                {showTotalPercentage && (
                  <th
                    className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('totalPercentage')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>占{title}销售额比</span>
                      <SortIcon field="totalPercentage" />
                    </div>
                  </th>
                )}
                <th
                  className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('yoyGrowth')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>同比增长率</span>
                    <SortIcon field="yoyGrowth" />
                  </div>
                </th>
				{!isShopView && (
                  <th
                    className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('personTotalSales')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>个人总销售额(目录价)</span>
                      <SortIcon field="personTotalSales" />
                    </div>
                  </th>
                )}

                {showDisplayColumn && (
                  <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                    是否摆场
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedDetails.map((item, index) => {
                const percentage = totalSalesAmount > 0 ? (item.salesAmount / totalSalesAmount) * 100 : 0;

                // 计算占门店/销售顾问总销售额的占比
				let totalPercentage = 0;
				if (isShopView) {
					const shopTotalSales = item.shopTotalSales ?? 0;
					totalPercentage = shopTotalSales > 0 ? (item.salesAmount / shopTotalSales) * 100 : 0;
				}else{
					const personTotalSales = item.personTotalSales ?? 0;
					totalPercentage = personTotalSales > 0 ? (item.salesAmount / personTotalSales) * 100 : 0;
				}

                // 使用全局排名，如果没有则使用索引
                const rank = item.rank || (index + 1);
                // 获取排名颜色
                const rankColor = getRankColor(rank, isShopView);

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-center">
                      <div className="flex items-center justify-center">
                        <span className="text-lg">{rankColor.emoji}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-center text-gray-900">
                      {isShopView && onShopClick ? (
                        <button
                          onClick={() => onShopClick(item.name)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {item.name}
                        </button>
                      ) : (
                        item.name
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-700">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-center font-semibold text-gray-900">
                      ¥{item.salesAmount.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                    </td>
                    {!isShopView && userIsAdmin && (
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-blue-600 font-medium">
                        {percentage.toFixed(2)}%
                      </td>
                    )}
                    {!isShopView && (
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                        {(() => {
                          const rankWeightColor = getRankWeightColor(item.rankWeight);
                          return (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-lg">{rankWeightColor.emoji}</span>
                            </div>
                          );
                        })()}
                      </td>
                    )}
                    {showTotalPercentage && (
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-purple-600 font-medium">
                        {totalPercentage.toFixed(2)}%
                      </td>
                    )}
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-center font-medium">
                      {(() => {
                        const lastYear = item.lastYearSalesAmount ?? 0;
                        if (lastYear === 0) {
                          return <span className="text-gray-400">--</span>;
                        }
                        const growth = ((item.salesAmount - lastYear) / lastYear) * 100;
                        const isPositive = growth >= 0;
                        return (
                          <span className={isPositive ? 'text-red-600' : 'text-green-600'}>
                            {isPositive ? '+' : ''}{Math.round(growth)}%
                          </span>
                        );
                      })()}
                    </td>
					{!isShopView && (
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-purple-600 font-medium">
                        {(item.personTotalSales ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                      </td>
                    )}
                    {showDisplayColumn && (
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.hasDisplay ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.hasDisplay ? '是' : '否'}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {details.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无数据
          </div>
        )}
      </div>
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900"
                    >
                      {goodsName}
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 mt-1">
                      {type === 'quantity' ? '按销量倒序' : '按销售额倒序'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                  </div>
                ) : showTabs ? (
                  <Tab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
                    <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
                      <Tab
                        className={({ selected }) =>
                          `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                          ${
                            selected
                              ? 'bg-white text-blue-700 shadow'
                              : 'text-blue-600 hover:bg-white/[0.12] hover:text-blue-700'
                          }`
                        }
                      >
                        门店排行
                      </Tab>
                      <Tab
                        className={({ selected }) =>
                          `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                          ${
                            selected
                              ? 'bg-white text-blue-700 shadow'
                              : 'text-blue-600 hover:bg-white/[0.12] hover:text-blue-700'
                          }`
                        }
                      >
                        销售顾问排行
                      </Tab>
                      {userIsAdmin && (
                        <Tab
                          className={({ selected }) =>
                            `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                            ${
                              selected
                                ? 'bg-white text-blue-700 shadow'
                                : 'text-blue-600 hover:bg-white/[0.12] hover:text-blue-700'
                            }`
                          }
                        >
                          订单明细
                        </Tab>
                      )}
                    </Tab.List>
                    <Tab.Panels className="mt-2">
                      <Tab.Panel>
                        {renderTable(shopDetails, '门店', true, true, handleShopClick)}
                      </Tab.Panel>
                      <Tab.Panel>
                        {/* 门店筛选下拉框 */}
                        <div className="mb-4 flex items-center gap-3">
                          <label htmlFor="shop-filter" className="text-sm font-medium text-gray-700">
                            门店筛选：
                          </label>
                          <select
                            id="shop-filter"
                            value={selectedShop}
                            onChange={(e) => setSelectedShop(e.target.value)}
                            className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          >
                            <option value="all">全部门店</option>
                            {shopList.map((shop) => (
                              <option key={shop} value={shop}>
                                {shop}
                              </option>
                            ))}
                          </select>
                          {selectedShop !== 'all' && (
                            <button
                              onClick={() => setSelectedShop('all')}
                              className="text-sm text-blue-600 hover:text-blue-800 underline"
                            >
                              清除筛选
                            </button>
                          )}
                        </div>
                        {renderTable(filteredSalespersonDetails, '销售顾问', false, false)}
                      </Tab.Panel>
                      {userIsAdmin && (
                        <Tab.Panel>
                          {/* 订单明细表格 */}
                          <div className="mt-4">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-semibold text-gray-700">
                              共 {orderDetails.length} 条订单记录
                            </h4>
                            <button
                              onClick={exportToExcel}
                              disabled={orderDetails.length === 0}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                              导出Excel
                            </button>
                          </div>

                          {isLoadingOrders ? (
                            <div className="flex justify-center items-center h-64">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                            </div>
                          ) : orderDetails.length > 0 ? (
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                              <div className="overflow-x-auto max-h-[500px]">
                                <table className="min-w-full divide-y divide-gray-300">
                                  <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                      <th className="py-3.5 pl-4 pr-3 text-center text-sm font-semibold text-gray-900">
                                        付款时间
                                      </th>
                                      <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                                        订单号
                                      </th>
                                      <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                                        销售员
                                      </th>
                                      <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                                        门店
                                      </th>
                                      <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                                        商品编码
                                      </th>
                                      <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                                        商品名称
                                      </th>
                                      <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                                        商品规格
                                      </th>
                                      <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                                        数量
                                      </th>
                                      <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                                        单价
                                      </th>
                                      <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                                        金额
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 bg-white">
                                    {orderDetails.map((order, index) => (
                                      <tr key={index} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-center text-gray-700">
                                          {new Date(order.payTime).toLocaleString('zh-CN', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false
                                          })}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-700">
                                          {order.orderSn}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-900 font-medium">
                                          {order.doneSales1Name}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-700">
                                          {order.shopNameDone}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-700">
                                          {order.goodsBom}
                                        </td>
                                        <td className="px-3 py-4 text-sm text-center text-gray-900">
                                          {order.goodsName}
                                        </td>
                                        <td className="px-3 py-4 text-sm text-center text-gray-700">
                                          {order.goodsSpec}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-700">
                                          {order.goodsNum}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-700">
                                          ¥{order.goodsPrice.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center font-semibold text-gray-900">
                                          ¥{(order.goodsNum * order.goodsPrice).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-12 text-gray-500">
                              暂无订单数据
                            </div>
                          )}
                        </div>
                      </Tab.Panel>
                      )}
                    </Tab.Panels>
                  </Tab.Group>
                ) : (
                  renderTable(salespersonDetails, '销售顾问', false, false)
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    关闭
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
