'use client';

import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge } from '@tremor/react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { RankingItem } from '@/types/report';

export type SortField = 'rank' | 'value' | 'percentage' | 'lastYearSalesAmount' | 'yoyGrowthRate' | 'quantity';
export type SortDirection = 'asc' | 'desc';

interface RankingTableProps {
  data: RankingItem[];
  valueLabel: string;
  valueFormat: (val: number) => string;
  startRank?: number;
  sortMode?: 'absolute' | 'ratio';
  type?: 'quantity' | 'sales';
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
}

export default function RankingTable({
  data,
  valueLabel,
  valueFormat,
  startRank = 1,
  sortMode = 'absolute',
  type = 'quantity',
  sortField = 'rank',
  sortDirection = 'asc',
  onSortChange,
}: RankingTableProps) {
  const isSalesType = type === 'sales';

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'yellow';
    if (rank === 2) return 'gray';
    if (rank === 3) return 'orange';
    return 'blue';
  };

  // 根据类型获取主要数值：销售额排行榜用 salesAmount，数量排行榜用 quantity
  const getValue = (item: RankingItem) => {
    if (isSalesType) {
      return item.salesAmount || 0;
    }
    return item.quantity !== undefined ? item.quantity : 0;
  };

  // 获取占比列的动态标签
  const getRatioColumnLabel = () => {
    if (typeof window === 'undefined') return '占比';
    const userStr = localStorage.getItem('user');
    if (!userStr) return '占比';

    try {
      const user = JSON.parse(userStr);
      const isEmployee = user.shopId !== 0 && user.roleIdTotal !== 41;

      if (sortMode === 'ratio') {
        return isEmployee ? '个人占全公司' : '门店占全公司';
      }
      return '占比';
    } catch {
      return '占比';
    }
  };

  // 处理列头点击排序
  const handleSort = (field: SortField) => {
    if (!onSortChange) return;

    if (sortField === field) {
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, field === 'rank' ? 'asc' : 'desc');
    }
  };

  // 渲染排序图标
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-300">↕</span>;
    }
    return sortDirection === 'asc'
      ? <ChevronUpIcon className="w-4 h-4 ml-1 inline" />
      : <ChevronDownIcon className="w-4 h-4 ml-1 inline" />;
  };

  // 格式化同比增长率
  const formatGrowthRate = (rate: number | undefined) => {
    if (rate === undefined || rate === null) return '新品';
    if (!isFinite(rate)) return '新品';
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(2)}%`;
  };

  // 获取增长率颜色：红色表示增长，绿色表示降低
  const getGrowthRateColor = (rate: number | undefined) => {
    if (rate === undefined || rate === null || !isFinite(rate)) return 'text-gray-500';
    if (rate > 0) return 'text-red-600';
    if (rate < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell
              className="text-center w-20 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => handleSort('rank')}
            >
              排名{renderSortIcon('rank')}
            </TableHeaderCell>
            <TableHeaderCell className="w-[300px]">商品名称</TableHeaderCell>
            <TableHeaderCell
              className="text-right cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => handleSort('value')}
            >
              {valueLabel}{renderSortIcon('value')}
            </TableHeaderCell>
            {isSalesType && (
              <>
                <TableHeaderCell
                  className="text-right cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('quantity')}
                >
                  销量{renderSortIcon('quantity')}
                </TableHeaderCell>
                <TableHeaderCell
                  className="text-right cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('lastYearSalesAmount')}
                >
                  去年同期{renderSortIcon('lastYearSalesAmount')}
                </TableHeaderCell>
                <TableHeaderCell
                  className="text-right cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('yoyGrowthRate')}
                >
                  同比增长率{renderSortIcon('yoyGrowthRate')}
                </TableHeaderCell>
              </>
            )}
            <TableHeaderCell
              className="text-right w-24 cursor-pointer hover:bg-gray-100 select-none"
              onClick={() => handleSort('percentage')}
            >
              {getRatioColumnLabel()}{renderSortIcon('percentage')}
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item, index) => {
            return (
              <TableRow key={`${item.goodsName}-${index}`}>
                <TableCell className="text-center">
                  <Badge color={getRankBadgeColor(item.rank)} size="lg">
                    {item.rank}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium w-[300px]">
                  <div className="truncate max-w-[300px]" title={item.goodsName}>
                    {item.goodsName}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {valueFormat(getValue(item))}
                </TableCell>
                {isSalesType && (
                  <>
                    <TableCell className="text-right text-gray-600">
                      {(item.quantity || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-gray-600">
                      ¥{(item.lastYearSalesAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${getGrowthRateColor(item.yoyGrowthRate)}`}>
                      {formatGrowthRate(item.yoyGrowthRate)}
                    </TableCell>
                  </>
                )}
                <TableCell className="text-right text-gray-600">
                  {sortMode === 'ratio' && item.shopRatio
                    ? `${item.shopRatio.toFixed(2)}%`
                    : `${item.percentage.toFixed(2)}%`
                  }
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {data.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          暂无数据
        </div>
      )}
    </div>
  );
}
