'use client';

import { Dialog, Transition, Tab } from '@headlessui/react';
import { Fragment, useMemo, useState } from 'react';
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { isAdmin } from '@/lib/auth/permissions';

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

type SortField = 'rank' | 'name' | 'quantity' | 'salesAmount' | 'weightedAmount' | 'percentage' | 'totalPercentage';
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
}: ProductDetailModalProps) {
  // 排序状态 - 为门店和销售顾问分别维护
  const [shopSortField, setShopSortField] = useState<SortField>('rank');
  const [shopSortDirection, setShopSortDirection] = useState<SortDirection>('asc');
  const [salespersonSortField, setSalespersonSortField] = useState<SortField>('rank');
  const [salespersonSortDirection, setSalespersonSortDirection] = useState<SortDirection>('asc');

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

  const renderTable = (details: ProductDetail[], title: string, showDisplayColumn = false, isShopView = false) => {
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
                    <span>销售额</span>
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

				{!isShopView && (
                  <th
                    className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('companyTotalSales')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>个人总销售额</span>
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
                let totalSales = item.shopTotalSales || item.personTotalSales || 0;
				if (isShopView) {
					totalSales = item.companyTotalSales || 0;
				}else{
					totalSales = item.personTotalSales || 0;
				}
				let totalPercentage = 0;
				if (isShopView) {
					totalPercentage = item.shopTotalSales > 0 ? (item.salesAmount / item.shopTotalSales) * 100 : 0;
				}else{
					totalPercentage = item.personTotalSales > 0 ? (item.salesAmount / item.personTotalSales) * 100 : 0;
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
                      {item.name}
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

					{!isShopView && (
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-purple-600 font-medium">
                        {item.personTotalSales.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
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
                  <Tab.Group>
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
                    </Tab.List>
                    <Tab.Panels className="mt-2">
                      <Tab.Panel>
                        {renderTable(shopDetails, '门店', true, true)}
                      </Tab.Panel>
                      <Tab.Panel>
                        {renderTable(salespersonDetails, '销售顾问', false, false)}
                      </Tab.Panel>
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
