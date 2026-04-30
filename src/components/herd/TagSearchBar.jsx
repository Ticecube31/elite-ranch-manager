import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export default function TagSearchBar({ animals, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [disambiguate, setDisambiguate] = useState(null); // array of matches needing year pick
  const ref = useRef(null);

  const matches = query.trim().length === 0
    ? []
    : animals.filter(a =>
        a.tag_number?.toLowerCase().includes(query.trim().toLowerCase())
      ).slice(0, 20);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setDisambiguate(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (animal) => {
    onSelect(animal);
    setQuery(animal.tag_number);
    setOpen(false);
    setDisambiguate(null);
  };

  const handleSearchSubmit = () => {
    const exact = animals.filter(a => a.tag_number === query.trim());
    if (exact.length === 1) {
      handleSelect(exact[0]);
    } else if (exact.length > 1) {
      setDisambiguate(exact);
      setOpen(true);
    } else if (matches.length === 1) {
      handleSelect(matches[0]);
    } else if (matches.length > 1) {
      setOpen(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearchSubmit();
    if (e.key === 'Escape') { setOpen(false); setDisambiguate(null); }
  };

  const clearSearch = () => {
    setQuery('');
    setOpen(false);
    setDisambiguate(null);
  };

  const displayList = disambiguate ?? matches;
  const isDisambiguating = !!disambiguate;

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setDisambiguate(null); }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search by tag #…"
          className="w-full h-8 pl-8 pr-8 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        {query && (
          <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && displayList.length > 0 && (
        <div className="absolute top-full mt-1 left-0 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
          {isDisambiguating && (
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
              Multiple animals with tag #{query} — pick a year:
            </div>
          )}
          {displayList.map(animal => (
            <button
              key={animal.id}
              onClick={() => handleSelect(animal)}
              className="w-full text-left px-3 py-2.5 hover:bg-purple-50 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0"
            >
              <div>
                <span className="font-heading font-bold text-sm text-gray-800">#{animal.tag_number}</span>
                <span className="text-xs text-gray-500 ml-2">{animal.animal_type}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-gray-400">{animal.birth_year ?? '—'}</span>
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: animal.sex === 'Female'
                      ? (animal.status === 'Alive' ? '#F472B6' : '#FBCFE8')
                      : (animal.status === 'Alive' ? '#60A5FA' : '#BFDBFE')
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && displayList.length === 0 && (
        <div className="absolute top-full mt-1 left-0 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 px-3 py-3 text-sm text-gray-400">
          No animals found for "<span className="font-semibold text-gray-600">{query}</span>"
        </div>
      )}
    </div>
  );
}