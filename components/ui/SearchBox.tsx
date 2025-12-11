'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  totalCount: number;
  filteredCount: number;
}

export default function SearchBox({
  value,
  onChange,
  placeholder = '搜索商品名称...',
  totalCount,
  filteredCount,
}: SearchBoxProps) {
  const [inputValue, setInputValue] = useState(value);

  // 使用防抖来优化搜索性能
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(inputValue);
    }, 300); // 300ms延迟

    return () => clearTimeout(timer);
  }, [inputValue, onChange]);

  const handleClear = () => {
    setInputValue('');
    onChange('');
  };

  return (
    <div className="mb-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {inputValue && (
        <div className="mt-2 text-sm text-gray-600">
          找到 {filteredCount} 个结果（共 {totalCount} 个商品）
        </div>
      )}
    </div>
  );
}
