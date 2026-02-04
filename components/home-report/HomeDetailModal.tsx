'use client';

import { Dialog, Transition, Tab } from '@headlessui/react';
import { Fragment, useState, useMemo } from 'react';
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { HomeRankingItem } from '@/types/home-report';

type SortField = 'rank' | 'name' | 'salesAmount' | 'quantity' | 'percentage' | 'orderCount';
type SortDirection = 'asc' | 'desc';

interface TabData {
  label: string;
  nameColumnHeader: string;
  data: HomeRankingItem[];
}

interface HomeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  tabs: TabData[];
  isLoading: boolean;
}

function RankingTable({
  data,
  nameColumnHeader,
}: {
  data: HomeRankingItem[];
  nameColumnHeader: string;
}) {
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // 处理排序
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'rank' ? 'asc' : 'desc');
    }
  };

  // 排序数据
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      switch (sortField) {
        case 'rank':
          aValue = a.rank;
          bValue = b.rank;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'salesAmount':
          aValue = a.salesAmount;
          bValue = b.salesAmount;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'percentage':
          aValue = a.percentage;
          bValue = b.percentage;
          break;
        case 'orderCount':
          aValue = a.orderCount || 0;
          bValue = b.orderCount || 0;
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue, 'zh-CN')
          : bValue.localeCompare(aValue, 'zh-CN');
      }
      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [data, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-gray-300 ml-1">↕</span>;
    }
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="w-4 h-4 ml-1 inline" />
    ) : (
      <ChevronDownIcon className="w-4 h-4 ml-1 inline" />
    );
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

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无数据
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      <div className="overflow-x-auto max-h-[500px]">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th
                className="py-3.5 pl-4 pr-3 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('rank')}
              >
                排名 <SortIcon field="rank" />
              </th>
              <th
                className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                {nameColumnHeader} <SortIcon field="name" />
              </th>
              <th
                className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('salesAmount')}
              >
                销售额 <SortIcon field="salesAmount" />
              </th>
              <th
                className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('quantity')}
              >
                销量 <SortIcon field="quantity" />
              </th>
              <th
                className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('percentage')}
              >
                占比 <SortIcon field="percentage" />
              </th>
              <th
                className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('orderCount')}
              >
                订单数 <SortIcon field="orderCount" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {sortedData.map((item) => (
              <tr key={`${item.rank}-${item.name}`} className="hover:bg-gray-50">
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-center">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${getRankBadgeColor(item.rank)}`}>
                    {item.rank}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-center text-gray-900 max-w-[200px] truncate" title={item.name}>
                  {item.name}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-center font-semibold text-gray-900">
                  ¥{item.salesAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-700">
                  {item.quantity.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-blue-600 font-medium">
                  {item.percentage.toFixed(2)}%
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-700">
                  {item.orderCount?.toLocaleString() || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HomeDetailModal({
  isOpen,
  onClose,
  title,
  subtitle,
  tabs,
  isLoading,
}: HomeDetailModalProps) {
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
                      {title}
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 mt-1">
                      {subtitle}
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
                  </div>
                ) : tabs.length === 1 ? (
                  // 单个tab时不显示tab栏
                  <div className="mt-4">
                    <RankingTable
                      data={tabs[0].data}
                      nameColumnHeader={tabs[0].nameColumnHeader}
                    />
                  </div>
                ) : (
                  // 多个tab时显示tab栏
                  <Tab.Group>
                    <Tab.List className="flex space-x-1 rounded-xl bg-green-900/20 p-1">
                      {tabs.map((tab, index) => (
                        <Tab
                          key={index}
                          className={({ selected }) =>
                            `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                            ${
                              selected
                                ? 'bg-white text-green-700 shadow'
                                : 'text-green-600 hover:bg-white/[0.12] hover:text-green-700'
                            }`
                          }
                        >
                          {tab.label}
                        </Tab>
                      ))}
                    </Tab.List>
                    <Tab.Panels className="mt-4">
                      {tabs.map((tab, index) => (
                        <Tab.Panel key={index}>
                          <RankingTable
                            data={tab.data}
                            nameColumnHeader={tab.nameColumnHeader}
                          />
                        </Tab.Panel>
                      ))}
                    </Tab.Panels>
                  </Tab.Group>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
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
