'use client';

import { useState, useEffect } from 'react';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PercentageRangeFilterProps {
  value: { min: number | null; max: number | null };
  onChange: (range: { min: number | null; max: number | null }) => void;
  label?: string;
}

export default function PercentageRangeFilter({
  value,
  onChange,
  label = '占比',
}: PercentageRangeFilterProps) {
  const [minInput, setMinInput] = useState<string>(value.min?.toString() || '');
  const [maxInput, setMaxInput] = useState<string>(value.max?.toString() || '');

  // 同步外部值变化
  useEffect(() => {
    setMinInput(value.min?.toString() || '');
    setMaxInput(value.max?.toString() || '');
  }, [value.min, value.max]);

  const handleApply = () => {
    const min = minInput.trim() !== '' ? parseFloat(minInput) : null;
    const max = maxInput.trim() !== '' ? parseFloat(maxInput) : null;

    // 验证输入
    if (min !== null && isNaN(min)) return;
    if (max !== null && isNaN(max)) return;

    onChange({ min, max });
  };

  const handleClear = () => {
    setMinInput('');
    setMaxInput('');
    onChange({ min: null, max: null });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  const hasFilter = value.min !== null || value.max !== null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1 text-gray-600">
        <FunnelIcon className="w-4 h-4" />
        <span>{label}筛选:</span>
      </div>

      <div className="flex items-center gap-1">
        <input
          type="number"
          placeholder="最小"
          value={minInput}
          onChange={(e) => setMinInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          step="0.1"
          min="0"
          max="100"
        />
        <span className="text-gray-500">%</span>
        <span className="text-gray-400 mx-1">~</span>
        <input
          type="number"
          placeholder="最大"
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          step="0.1"
          min="0"
          max="100"
        />
        <span className="text-gray-500">%</span>
      </div>

      <button
        onClick={handleApply}
        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
      >
        筛选
      </button>

      {hasFilter && (
        <button
          onClick={handleClear}
          className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="清除筛选"
        >
          <XMarkIcon className="w-4 h-4" />
          <span>清除</span>
        </button>
      )}

      {hasFilter && (
        <span className="text-blue-600 font-medium">
          已筛选: {value.min ?? 0}% ~ {value.max ?? 100}%
        </span>
      )}
    </div>
  );
}
