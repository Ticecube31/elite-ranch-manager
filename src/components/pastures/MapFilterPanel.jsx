import React, { useState, useRef, useEffect } from 'react';

const WATER_TYPES = ['Water Tank', 'Pond', 'Dam', 'Lake'];

export default function MapFilterPanel({ viewMode, setViewMode, filters, setFilters, pastures }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const toggle = (key, value) => {
    setFilters(prev => {
      const set = new Set(prev[key]);
      set.has(value) ? set.delete(value) : set.add(value);
      return { ...prev, [key]: set };
    });
  };

  const activeCount = () => {
    let count = 0;
    if (viewMode !== 'satellite') count++;
    WATER_TYPES.forEach(t => { if (!filters.waterTypes.has(t)) count++; });
    if (!filters.showGates) count++;
    pastures.forEach(p => { if (!filters.pastures.has(p.id)) count++; });
    return count;
  };

  const count = activeCount();

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="h-9 px-3 rounded-xl text-xs font-bold text-white shadow-lg flex items-center gap-1.5"
        style={{ background: open ? '#0e4a72' : '#1E5F8E' }}
      >
        🎛 Filters
        {count > 0 && (
          <span className="bg-white text-[#1E5F8E] rounded-full text-[10px] font-black w-4 h-4 flex items-center justify-center leading-none">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-11 right-0 z-[2000] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-64"
          style={{ maxHeight: '70vh', overflowY: 'auto' }}
        >
          {/* Map View */}
          <Section title="Map View">
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              {['satellite', 'outlines'].map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className="flex-1 py-2 text-xs font-bold transition-all"
                  style={{
                    background: viewMode === v ? '#1E5F8E' : '#f9fafb',
                    color: viewMode === v ? '#fff' : '#374151',
                  }}
                >
                  {v === 'satellite' ? '🛰 Satellite' : '🗺 Outlines'}
                </button>
              ))}
            </div>
          </Section>

          {/* Gates */}
          <Section title="Features">
            <Toggle
              label="🚧 Gates"
              checked={filters.showGates}
              onChange={() => setFilters(f => ({ ...f, showGates: !f.showGates }))}
            />
          </Section>

          {/* Water Sources */}
          <Section title="Water Sources">
            {WATER_TYPES.map(t => (
              <Toggle
                key={t}
                label={`${{ 'Water Tank': '🪣', 'Pond': '💧', 'Dam': '🏗️', 'Lake': '🌊' }[t]} ${t}`}
                checked={filters.waterTypes.has(t)}
                onChange={() => toggle('waterTypes', t)}
              />
            ))}
          </Section>

          {/* Pastures */}
          {pastures.length > 0 && (
            <Section title="Pastures">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setFilters(f => ({ ...f, pastures: new Set(pastures.map(p => p.id)) }))}
                  className="text-[11px] font-bold text-[#1E5F8E]"
                >All</button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setFilters(f => ({ ...f, pastures: new Set() }))}
                  className="text-[11px] font-bold text-gray-400"
                >None</button>
              </div>
              {pastures.map(p => (
                <Toggle
                  key={p.id}
                  label={p.pasture_name}
                  checked={filters.pastures.has(p.id)}
                  onChange={() => toggle('pastures', p.id)}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1 px-2 rounded-xl hover:bg-gray-50">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div
        onClick={onChange}
        className="w-9 h-5 rounded-full relative transition-colors"
        style={{ background: checked ? '#1E5F8E' : '#d1d5db' }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
          style={{ left: checked ? '18px' : '2px' }}
        />
      </div>
    </label>
  );
}