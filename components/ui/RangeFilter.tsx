'use client';

import { useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

interface RangeFilterProps {
  totalCount: number;
  selectedRange: { start: number; end: number };
  onChange: (range: { start: number; end: number }) => void;
  pageSize?: number;
}

export default function RangeFilter({
  totalCount,
  selectedRange,
  onChange,
  pageSize = 20,
}: RangeFilterProps) {
  // 计算总页数和当前页码
  const totalPages = Math.ceil(totalCount / pageSize);
  const currentPage = Math.floor((selectedRange.start - 1) / pageSize) + 1;

  // 生成页码数组（带省略号逻辑）
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];

    if (totalPages <= 7) {
      // 页数少于7页，全部显示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 页数多，显示: 1 ... 当前页-1 当前页 当前页+1 ... 最后页
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // 显示当前页及其前后页
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      pages.push(totalPages);
    }

    return pages;
  }, [totalPages, currentPage]);

  const handlePageChange = (page: number) => {
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalCount);
    onChange({ start, end });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  // 如果只有一页或没有数据，不显示分页器
  if (totalPages <= 1 || totalCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between pb-4 border-b border-gray-200">
      <span className="text-sm text-gray-600">
        共 {totalCount} 条数据，第 {currentPage}/{totalPages} 页
      </span>

      <div className="flex items-center gap-1">
        {/* 上一页按钮 */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className={`
            p-2 rounded-lg border transition-all duration-200
            ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
            }
          `}
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>

        {/* 页码按钮 */}
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-gray-500"
              >
                ...
              </span>
            );
          }

          const isActive = page === currentPage;

          return (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`
                min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 ring-2 ring-blue-300 ring-offset-1'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {page}
            </button>
          );
        })}

        {/* 下一页按钮 */}
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className={`
            p-2 rounded-lg border transition-all duration-200
            ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
            }
          `}
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
