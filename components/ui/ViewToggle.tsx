'use client';

import { TableCellsIcon, ChartBarIcon } from '@heroicons/react/24/outline';

type ViewMode = 'table' | 'chart';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-white">
      <button
        onClick={() => onChange('table')}
        className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
          value === 'table'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <TableCellsIcon className="w-5 h-5" />
        <span className="text-sm font-medium">表格</span>
      </button>
      <button
        onClick={() => onChange('chart')}
        className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
          value === 'chart'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <ChartBarIcon className="w-5 h-5" />
        <span className="text-sm font-medium">图表</span>
      </button>
    </div>
  );
}
