import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Search, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FamilyTreeCanvas from '@/components/herd/FamilyTreeCanvas';
import TagSearchBar from '@/components/herd/TagSearchBar';

const PURPLE_DARK = '#4A1F40';

export default function HerdFamilyTree() {
  const navigate = useNavigate();

  const { data: animals = [], isLoading } = useQuery({
    queryKey: ['animals'],
    queryFn: () => base44.entities.Animals.list('-date_of_birth'),
    initialData: [],
  });

  // Year range derived from data
  const allYears = useMemo(() => {
    const years = [...new Set(animals.map(a => a.birth_year).filter(Boolean))].sort();
    return years;
  }, [animals]);

  const minYear = allYears[0] ?? new Date().getFullYear();
  const maxYear = allYears[allYears.length - 1] ?? new Date().getFullYear();

  const [fromYear, setFromYear] = useState(null);
  const [toYear, setToYear] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [zoom, setZoom] = useState(1);

  // Initialize year range once data loads
  useEffect(() => {
    if (allYears.length && fromYear === null) {
      setFromYear(Math.max(minYear, maxYear - 4));
      setToYear(maxYear);
    }
  }, [allYears]);

  const handleNavigateToAnimal = useCallback((id) => {
    navigate(`/herd?animal=${id}`);
  }, [navigate]);

  const handleSearchSelect = useCallback((animal) => {
    // Expand year range if needed
    const yr = animal.birth_year;
    if (yr) {
      setFromYear(prev => (prev === null || yr < prev ? yr : prev));
      setToYear(prev => (prev === null || yr > prev ? yr : prev));
    }
    setHighlightId(animal.id);
    setTimeout(() => setHighlightId(null), 3000);
  }, []);

  const filteredAnimals = useMemo(() => {
    if (fromYear === null || toYear === null) return [];
    return animals.filter(a => {
      const yr = a.birth_year;
      return yr >= fromYear && yr <= toYear;
    });
  }, [animals, fromYear, toYear]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-white/10"
        style={{ background: PURPLE_DARK }}
      >
        <button onClick={() => navigate('/herd')} className="text-white/80 hover:text-white p-1 -ml-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-heading font-black text-white text-lg flex-1">Herd Family Tree</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white/70 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(2, z + 0.15))}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white ml-1"
            title="Reset zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls bar */}
      <div className="sticky top-14 z-20 bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap gap-3 items-center shadow-sm">
        {/* Tag search */}
        <div className="flex-1 min-w-[200px] max-w-xs">
          <TagSearchBar
            animals={animals}
            onSelect={handleSearchSelect}
          />
        </div>

        {/* Year range */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500 font-medium">Years:</span>
          <input
            type="number"
            value={fromYear ?? ''}
            onChange={e => setFromYear(Number(e.target.value))}
            className="w-20 h-8 border border-gray-300 rounded-lg px-2 text-sm text-center"
            placeholder={String(minYear)}
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            value={toYear ?? ''}
            onChange={e => setToYear(Number(e.target.value))}
            className="w-20 h-8 border border-gray-300 rounded-lg px-2 text-sm text-center"
            placeholder={String(maxYear)}
          />
        </div>

        {/* Quick presets */}
        <div className="flex gap-1">
          {[3, 5, 10].map(n => (
            <button
              key={n}
              onClick={() => { setFromYear(maxYear - n + 1); setToYear(maxYear); }}
              className="px-2 h-8 rounded-lg text-xs font-semibold border border-gray-300 hover:bg-gray-100"
            >
              {n}yr
            </button>
          ))}
          <button
            onClick={() => { setFromYear(minYear); setToYear(maxYear); }}
            className="px-2 h-8 rounded-lg text-xs font-semibold border border-gray-300 hover:bg-gray-100"
          >
            All
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : filteredAnimals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <p className="text-4xl mb-3">🌳</p>
            <p className="font-semibold text-gray-600">No animals in this year range</p>
            <p className="text-sm mt-1">Try adjusting the year filter above.</p>
          </div>
        ) : (
          <FamilyTreeCanvas
            animals={filteredAnimals}
            allAnimals={animals}
            highlightId={highlightId}
            zoom={zoom}
            onNavigateToAnimal={handleNavigateToAnimal}
          />
        )}
      </div>

      {/* Legend */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-2 flex flex-wrap gap-4 text-xs text-gray-600 z-20">
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-pink-400" /><span>Female – Alive</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-pink-200" /><span>Female – Not Alive</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-blue-400" /><span>Male – Alive</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-blue-200" /><span>Male – Not Alive</span></div>
        <div className="flex items-center gap-1.5 ml-auto"><span className="text-gray-400">Tap a node to view details</span></div>
      </div>
    </div>
  );
}