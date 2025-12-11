'use client';

interface Option {
  label: string;
  value: string;
}

interface ButtonGroupProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function ButtonGroup({ options, value, onChange, label }: ButtonGroupProps) {
  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              value === option.value
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
