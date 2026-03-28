
'use client';

import { TrendingUp, Clock } from 'lucide-react';
import { SortType } from '@/types';

interface SortToggleProps {
  sortType: SortType;
  onChange: (sort: SortType) => void;
  disabled?: boolean;
}

export function SortToggle({ sortType, onChange, disabled }: SortToggleProps) {
  return (
    <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      <button
        onClick={() => onChange('popular')}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
          sortType === 'popular'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <TrendingUp className="w-4 h-4" />
        Most Popular
      </button>
      <button
        onClick={() => onChange('latest')}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
          sortType === 'latest'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Clock className="w-4 h-4" />
        Latest
      </button>
    </div>
  );
}
