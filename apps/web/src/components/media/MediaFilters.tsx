/**
 * Media Filters
 *
 * Compact search and segmented type filter for the media library.
 * Apple-style design with inline controls.
 */

import { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SegmentedControl, type SegmentOption } from '@/components/ui';

type MediaType = '' | 'image' | 'video';

const typeOptions: SegmentOption<MediaType>[] = [
  { value: '', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
];

interface MediaFiltersProps {
  search: string;
  type: MediaType;
  onSearchChange: (search: string) => void;
  onTypeChange: (type: MediaType) => void;
  onClear: () => void;
}

export function MediaFilters({ search, type, onSearchChange, onTypeChange }: MediaFiltersProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  const handleClearSearch = useCallback(() => {
    onSearchChange('');
    inputRef.current?.focus();
  }, [onSearchChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && search) {
        e.preventDefault();
        handleClearSearch();
      }
    },
    [search, handleClearSearch]
  );

  return (
    <div className="flex items-center gap-4">
      {/* Type filter - Segmented Control */}
      <SegmentedControl options={typeOptions} value={type} onChange={onTypeChange} size="sm" />

      {/* Compact Search */}
      <div className="relative w-64">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          placeholder="Search files..."
          className="
            w-full h-8 pl-9 pr-8 text-sm
            bg-gray-100 border-0 rounded-lg
            text-gray-900 placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white
            transition-all duration-150
          "
          aria-label="Search media files"
        />
        {/* Clear button (inside input) - larger click target */}
        <AnimatePresence>
          {search && (
            <motion.button
              type="button"
              onClick={handleClearSearch}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="
                absolute right-1 top-1/2 -translate-y-1/2
                w-6 h-6 flex items-center justify-center
                text-gray-400 hover:text-gray-600 hover:bg-gray-200
                rounded-full
                transition-colors duration-150
              "
              aria-label="Clear search"
            >
              <ClearIcon className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
