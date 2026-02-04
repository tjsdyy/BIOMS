'use client';

import { HomeRankingItem } from '@/types/home-report';

export type SortField = 'rank' | 'name' | 'salesAmount' | 'quantity' | 'percentage' | 'orderCount';
export type SortDirection = 'asc' | 'desc';

interface HomeRankingTableProps {
  data: HomeRankingItem[];
  nameColumnHeader: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  onRowClick?: (name: string) => void;
}

export default function HomeRankingTable({
  data,
  nameColumnHeader,
  sortField,
  sortDirection,
  onSortChange,
  onRowClick,
}: HomeRankingTableProps) {
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, field === 'rank' ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-400 text-yellow-900';
      case 2:
        return 'bg-gray-300 text-gray-800';
      case 3:
        return 'bg-orange-400 text-orange-900';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('rank')}
            >
              排名 {getSortIcon('rank')}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('name')}
            >
              {nameColumnHeader} {getSortIcon('name')}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('salesAmount')}
            >
              销售额 {getSortIcon('salesAmount')}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('quantity')}
            >
              销量 {getSortIcon('quantity')}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('percentage')}
            >
              占比 {getSortIcon('percentage')}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('orderCount')}
            >
              订单数 {getSortIcon('orderCount')}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <tr
              key={`${item.rank}-${item.name}`}
              className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item.name)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${getRankBadgeColor(item.rank)}`}>
                  {item.rank}
                </span>
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${onRowClick ? 'text-blue-600 hover:text-blue-800' : 'text-gray-900'}`}>
                {item.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                ¥{item.salesAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                {item.quantity.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                {item.percentage.toFixed(2)}%
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                {item.orderCount?.toLocaleString() || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
