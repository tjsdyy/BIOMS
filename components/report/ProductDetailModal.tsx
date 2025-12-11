'use client';

import { Dialog, Transition, Tab } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ProductDetail {
  name: string;
  quantity: number;
  salesAmount: number;
  hasDisplay?: boolean;
  shopTotalSales?: number;
  personTotalSales?: number;
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
  const renderTable = (details: ProductDetail[], title: string, showDisplayColumn = false) => {
    // 计算总销售额（用于计算该商品在所有门店/销售员的占比）
    const totalSalesAmount = details.reduce((sum, item) => sum + item.salesAmount, 0);

    // 判断是否显示个人/门店总销售额占比
    const showTotalPercentage = details.some(item =>
      (item.shopTotalSales && item.shopTotalSales > 0) ||
      (item.personTotalSales && item.personTotalSales > 0)
    );

    return (
      <div className="mt-4">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                  排名
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  {title}
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  销量
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  销售额
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  销售额占比
                </th>
                {showTotalPercentage && (
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    占{title}销售额比
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
              {details.map((item, index) => {
                const percentage = totalSalesAmount > 0 ? (item.salesAmount / totalSalesAmount) * 100 : 0;

                // 计算占门店/销售员总销售额的占比
                const totalSales = item.shopTotalSales || item.personTotalSales || 0;
                const totalPercentage = totalSales > 0 ? (item.salesAmount / totalSales) * 100 : 0;

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-50 text-blue-800'
                      } font-semibold`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-700">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-semibold text-gray-900">
                      ¥{item.salesAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-blue-600 font-medium">
                      {percentage.toFixed(2)}%
                    </td>
                    {showTotalPercentage && (
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-purple-600 font-medium">
                        {totalPercentage.toFixed(2)}%
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
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
                        销售员排行
                      </Tab>
                    </Tab.List>
                    <Tab.Panels className="mt-2">
                      <Tab.Panel>
                        {renderTable(shopDetails, '门店', true)}
                      </Tab.Panel>
                      <Tab.Panel>
                        {renderTable(salespersonDetails, '销售员', false)}
                      </Tab.Panel>
                    </Tab.Panels>
                  </Tab.Group>
                ) : (
                  renderTable(salespersonDetails, '销售员')
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
