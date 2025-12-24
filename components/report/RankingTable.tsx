'use client';

import { Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge } from '@tremor/react';
import { RankingItem } from '@/types/report';

interface RankingTableProps {
  data: RankingItem[];
  valueLabel: string;
  valueFormat: (val: number) => string;
  startRank?: number;
  sortMode?: 'absolute' | 'ratio';
}

export default function RankingTable({ data, valueLabel, valueFormat, startRank = 1, sortMode = 'absolute' }: RankingTableProps) {
  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'yellow';
    if (rank === 2) return 'gray';
    if (rank === 3) return 'orange';
    return 'blue';
  };

  const getValue = (item: RankingItem) => {
    return item.quantity !== undefined ? item.quantity : (item.salesAmount || 0);
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

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="text-center w-20">排名</TableHeaderCell>
            <TableHeaderCell className="w-[300px]">商品名称</TableHeaderCell>
            <TableHeaderCell className="text-right">{valueLabel}</TableHeaderCell>
            <TableHeaderCell className="text-right w-24">
              {getRatioColumnLabel()}
            </TableHeaderCell>
            <TableHeaderCell className="w-48">占比可视化</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item, index) => {
            const actualRank = startRank + index;
            return (
              <TableRow key={item.rank}>
                <TableCell className="text-center">
                  <Badge color={getRankBadgeColor(actualRank)} size="lg">
                    {actualRank}
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
                <TableCell className="text-right text-gray-600">
                  {sortMode === 'ratio' && item.shopRatio
                    ? `${item.shopRatio.toFixed(2)}%`
                    : `${item.percentage.toFixed(2)}%`
                  }
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          sortMode === 'ratio' ? 'bg-purple-600' : 'bg-blue-600'
                        }`}
                        style={{
                          width: `${Math.min(
                            sortMode === 'ratio' ? (item.shopRatio || 0) : item.percentage,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>
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
