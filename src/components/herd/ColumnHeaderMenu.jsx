import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Filter, X } from 'lucide-react';

export default function ColumnHeaderMenu({ colKey, label, onSort, onFilter, onClear, sortCol, sortDir, activeFilters }) {
  const [showMenu, setShowMenu] = useState(false);
  const isSorted = sortCol === colKey;
  const isFiltered = activeFilters && activeFilters[colKey]?.length > 0;

  return (
    <div className="relative inline-flex items-center h-full">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
      >
        {label}
        <div className="flex items-center gap-0.5">
          {isSorted && (
            sortDir === 'asc' 
              ? <ChevronUp className="w-3 h-3" /> 
              : <ChevronDown className="w-3 h-3" />
          )}
          {isFiltered && (
            <Filter className="w-3 h-3 text-blue-500" />
          )}
          {!isSorted && !isFiltered && (
            <div className="w-3 h-3" />
          )}
        </div>
      </button>

      {showMenu && (
        <div className="absolute top-full left-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50 min-w-[160px] mt-1">
          {/* Sort options */}
          <button
            onClick={() => { onSort('asc'); setShowMenu(false); }}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded hover:bg-gray-100 flex items-center gap-2 ${
              isSorted && sortDir === 'asc' ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <ChevronUp className="w-3 h-3" /> Sort A-Z
          </button>
          <button
            onClick={() => { onSort('desc'); setShowMenu(false); }}
            className={`w-full text-left px-3 py-2 text-xs font-semibold rounded hover:bg-gray-100 flex items-center gap-2 ${
              isSorted && sortDir === 'desc' ? 'bg-blue-50 text-blue-700' : ''
            }`}
          >
            <ChevronDown className="w-3 h-3" /> Sort Z-A
          </button>

          {(isSorted || isFiltered) && (
            <>
              <div className="my-1 border-t" />
              <button
                onClick={() => { onClear(); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs font-semibold rounded hover:bg-gray-100 flex items-center gap-2 text-gray-600"
              >
                <X className="w-3 h-3" /> Clear Filters & Sort
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}