'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '@tremor/react';
import ViewToggle from '@/components/ui/ViewToggle';
import SearchBox from '@/components/ui/SearchBox';
import RangeFilter from '@/components/ui/RangeFilter';
import HomeRankingTable, { SortField, SortDirection } from './HomeRankingTable';
import HomeRankingChart from './HomeRankingChart';
import HomeDetailModal from './HomeDetailModal';
import { HomeRankingItem, HomeRankingDimension } from '@/types/home-report';
import { authFetch } from '@/lib/api/auth-fetch';

interface HomeRankingBlockProps {
  title: string;
  dimension: HomeRankingDimension;
  data: HomeRankingItem[];
  isLoading: boolean;
  nameColumnHeader: string;
  startDate?: Date;
  endDate?: Date;
  shop?: string;
}

export default function HomeRankingBlock({
  title,
  dimension,
  data,
  isLoading,
  nameColumnHeader,
  startDate,
  endDate,
  shop,
}: HomeRankingBlockProps) {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('chart');
  const [selectedRange, setSelectedRange] = useState({ start: 1, end: 20 });
  const [searchKeyword, setSearchKeyword] = useState('');

  // 表格列排序状态
  const [tableSortField, setTableSortField] = useState<SortField>('rank');
  const [tableSortDirection, setTableSortDirection] = useState<SortDirection>('asc');

  // 弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [modalData, setModalData] = useState<HomeRankingItem[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // 获取弹窗标题和列名
  const getModalConfig = useCallback((name: string) => {
    switch (dimension) {
      case 'brand':
        return {
          title: `${name} - 销售员销售排行`,
          subtitle: `按销售额倒序`,
          nameColumnHeader: '销售员',
          apiUrl: '/api/home-report/brand-detail',
          paramName: 'brandName',
        };
      case 'shop':
        return {
          title: `${name} - 销售员销售排行`,
          subtitle: `按销售额倒序`,
          nameColumnHeader: '销售员',
          apiUrl: '/api/home-report/shop-detail',
          paramName: 'shopName',
        };
      case 'salesperson':
        return {
          title: `${name} - 品牌销售排行`,
          subtitle: `按销售额倒序`,
          nameColumnHeader: '品牌',
          apiUrl: '/api/home-report/salesperson-detail',
          paramName: 'salespersonName',
        };
    }
  }, [dimension]);

  const [modalConfig, setModalConfig] = useState({
    title: '',
    subtitle: '',
    nameColumnHeader: '',
  });

  // 处理点击
  const handleItemClick = useCallback(async (name: string) => {
    const config = getModalConfig(name);
    setSelectedName(name);
    setModalConfig({
      title: config.title,
      subtitle: config.subtitle,
      nameColumnHeader: config.nameColumnHeader,
    });
    setIsModalOpen(true);
    setIsModalLoading(true);

    try {
      const params = new URLSearchParams();
      params.append(config.paramName, name);
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      if (shop && dimension === 'brand') params.append('shop', shop);

      const response = await authFetch(`${config.apiUrl}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch detail');
      }
      const result = await response.json();
      // 根据维度获取正确的数据字段
      const detailData = result.salespersonDetails || result.brandDetails || [];
      setModalData(detailData);
    } catch (error) {
      console.error('Error fetching detail:', error);
      setModalData([]);
    } finally {
      setIsModalLoading(false);
    }
  }, [dimension, startDate, endDate, shop, getModalConfig]);

  // 根据搜索关键词过滤数据
  const searchedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (!searchKeyword.trim()) return data;

    const keyword = searchKeyword.toLowerCase().trim();
    return data.filter(item =>
      item.name.toLowerCase().includes(keyword)
    );
  }, [data, searchKeyword]);

  // 获取数值的辅助函数
  const getValue = useCallback((item: HomeRankingItem, field: SortField) => {
    switch (field) {
      case 'rank':
        return item.rank;
      case 'name':
        return item.name.toLowerCase();
      case 'salesAmount':
        return item.salesAmount;
      case 'quantity':
        return item.quantity;
      case 'percentage':
        return item.percentage;
      case 'orderCount':
        return item.orderCount || 0;
      default:
        return item.rank;
    }
  }, []);

  // 根据排序模式处理数据
  const sortedData = useMemo(() => {
    if (!searchedData || searchedData.length === 0) return [];

    // 仅在表格视图时应用列排序（对全部数据排序）
    if (viewMode === 'table') {
      const tableSorted = [...searchedData].sort((a, b) => {
        const aValue = getValue(a, tableSortField);
        const bValue = getValue(b, tableSortField);

        // 字符串比较
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return tableSortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        // 数值比较
        return tableSortDirection === 'asc'
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      });
      return tableSorted;
    }

    return searchedData; // 图表视图使用原始排序
  }, [searchedData, viewMode, tableSortField, tableSortDirection, getValue]);

  // 处理表格排序变更
  const handleTableSortChange = useCallback((field: SortField, direction: SortDirection) => {
    setTableSortField(field);
    setTableSortDirection(direction);
    // 排序变更时重置到第一页
    setSelectedRange({ start: 1, end: 20 });
  }, []);

  // 当搜索关键词变化时，重置分页到第一页
  useEffect(() => {
    setSelectedRange({ start: 1, end: 20 });
  }, [searchKeyword]);

  // 当原始数据变化时，重置表格排序
  useEffect(() => {
    setTableSortField('rank');
    setTableSortDirection('asc');
  }, [data]);

  // 根据选择的范围过滤数据
  const filteredData = useMemo(() => {
    if (!sortedData || sortedData.length === 0) return [];
    return sortedData.slice(selectedRange.start - 1, selectedRange.end);
  }, [sortedData, selectedRange]);

  return (
    <>
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
          </div>
        ) : (
          <>
            {/* 搜索框 */}
            <SearchBox
              value={searchKeyword}
              onChange={setSearchKeyword}
              placeholder={`搜索${nameColumnHeader}...`}
              totalCount={data.length}
              filteredCount={searchedData.length}
            />

            {/* 分页筛选器 */}
            <RangeFilter
              totalCount={sortedData.length}
              selectedRange={selectedRange}
              onChange={setSelectedRange}
              pageSize={20}
            />

            {/* 表格或图表展示 */}
            {sortedData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchKeyword ? `未找到包含"${searchKeyword}"的${nameColumnHeader}` : '暂无数据'}
              </div>
            ) : (
              <div className="mt-6">
                {viewMode === 'table' && (
                  <HomeRankingTable
                    data={filteredData}
                    nameColumnHeader={nameColumnHeader}
                    sortField={tableSortField}
                    sortDirection={tableSortDirection}
                    onSortChange={handleTableSortChange}
                    onRowClick={handleItemClick}
                  />
                )}
                {viewMode === 'chart' && (
                  <HomeRankingChart
                    data={filteredData}
                    nameColumnHeader={nameColumnHeader}
                    onBarClick={handleItemClick}
                  />
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {/* 详情弹窗 */}
      <HomeDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        nameColumnHeader={modalConfig.nameColumnHeader}
        details={modalData}
        isLoading={isModalLoading}
      />
    </>
  );
}
