import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, X, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const GREEN = '#4CAF50';
const GREEN_DARK = '#2E7D32';
const GREEN_BG = '#F1F8F1';
const PAGE_SIZE = 50;

function exportCSV(calves, pastures) {
  const headers = ['Calf #', 'Mother #', 'Sex', 'Type', 'Date Tagged', 'Location', 'Status', 'Notes'];
  const getPastureName = (id) => id ? (pastures.find(p => p.id === id)?.pasture_name || 'Unknown') : 'Unknown';
  const rows = calves.map(a => [
    a.animal_number,
    a.mother_animal_number || '',
    a.sex,
    a.animal_type,
    a.date_of_birth || '',
    getPastureName(a.pasture_id),
    a.status,
    (a.notes || '').replace(/,/g, ' '),
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const el   = document.createElement('a');
  el.href = url; el.download = 'calves-export.csv'; el.click();
  URL.revokeObjectURL(url);
}

function CalfDetailSheet({ calf, pastures, onClose, onEditCalf }) {
  const pasture = pastures.find(p => p.id === calf.pasture_id);
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: GREEN_BG }}>
      <div className="flex items-center justify-between px-4 h-14 shrink-0" style={{ background: GREEN_DARK }}>
        <button onClick={onClose} className="text-white/80 hover:text-white p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-heading font-black text-white text-lg">Calf #{calf.animal_number}</h1>
        <button onClick={() => onEditCalf(calf)} className="text-white/90 text-sm font-semibold pr-1">Edit</button>
      </div>
      <div className="overflow-y-auto flex-1 px-5 py-6 space-y-4 max-w-lg mx-auto w-full">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-white text-base ${
          calf.sex === 'Male' ? 'bg-blue-500' : 'bg-pink-500'
        }`}>
          {calf.sex === 'Male' ? '♂' : '♀'} {calf.sex} · {calf.animal_type}
        </div>
        {[
          { label: 'Calf Tag #',   value: `#${calf.animal_number}` },
          { label: 'Mother Tag #', value: calf.mother_animal_number ? `#${calf.mother_animal_number}` : '—' },
          { label: 'Date Tagged',  value: calf.date_of_birth ? format(new Date(calf.date_of_birth), 'MMMM d, yyyy') : '—' },
          { label: 'Location',     value: pasture?.pasture_name || 'Unknown' },
          { label: 'Status',       value: calf.status || 'Alive' },
          { label: 'Created By',   value: calf.created_by || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl px-5 py-4 border border-green-100">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
          </div>
        ))}
        {calf.notes && (
          <div className="bg-white rounded-2xl px-5 py-4 border border-green-100">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Notes</p>
            <p className="text-base text-gray-700 mt-1 leading-relaxed">{calf.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AllCalvesView({ calves = [], pastures = [], seasons = [], onBack, onEditCalf }) {
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [detail, setDetail]           = useState(null);

  // Season filter: null = All, or a season id
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);

  // Sex filter: both on by default, at least one must stay on
  const [showMale, setShowMale]       = useState(true);
  const [showFemale, setShowFemale]   = useState(true);

  // Location filter: null = no filter, '__unknown__' = no pasture, or a pasture id
  const [locationFilter, setLocationFilter] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // All seasons from the CalvingSeasons entity, sorted newest first
  const seasonsWithCalves = useMemo(() => {
    return [...seasons].sort((a, b) => b.year - a.year);
  }, [seasons]);

  // Pastures that have calves (+ Unknown bucket)
  const pastureOptions = useMemo(() => {
    const calfList = calves.filter(a => ['Calf - Heifer', 'Calf - Steer'].includes(a.animal_type));
    const ids = new Set(calfList.map(a => a.pasture_id).filter(Boolean));
    const list = pastures.filter(p => ids.has(p.id));
    const hasUnknown = calfList.some(a => !a.pasture_id);
    return { list, hasUnknown };
  }, [calves, pastures]);

  const filtered = useMemo(() => {
    let list = calves.filter(a => ['Calf - Heifer', 'Calf - Steer'].includes(a.animal_type));

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a =>
        a.animal_number?.toLowerCase().includes(q) ||
        a.mother_animal_number?.toLowerCase().includes(q)
      );
    }

    // Season filter (null = All)
    if (selectedSeasonId) {
      list = list.filter(a => a.calving_season_id === selectedSeasonId);
    }

    // Sex filter (at least one always active)
    if (showMale && !showFemale) list = list.filter(a => a.sex === 'Male');
    else if (showFemale && !showMale) list = list.filter(a => a.sex === 'Female');
    // both on = show all sexes

    // Location filter
    if (locationFilter === '__unknown__') {
      list = list.filter(a => !a.pasture_id);
    } else if (locationFilter) {
      list = list.filter(a => a.pasture_id === locationFilter);
    }

    // Sort: newest first by date tagged
    return [...list].sort((a, b) => {
      const va = a.date_of_birth || a.created_date || '';
      const vb = b.date_of_birth || b.created_date || '';
      return vb.localeCompare(va);
    });
  }, [calves, search, selectedSeasonId, showMale, showFemale, locationFilter]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore   = paginated.length < filtered.length;

  const toggleMale = () => {
    if (showMale && !showFemale) return; // must keep at least one
    setShowMale(v => !v);
    setPage(1);
  };
  const toggleFemale = () => {
    if (showFemale && !showMale) return; // must keep at least one
    setShowFemale(v => !v);
    setPage(1);
  };

  const activeLocationLabel = useMemo(() => {
    if (!locationFilter) return null;
    if (locationFilter === '__unknown__') return 'Unknown';
    return pastures.find(p => p.id === locationFilter)?.pasture_name || 'Location';
  }, [locationFilter, pastures]);

  if (detail) {
    return (
      <CalfDetailSheet
        calf={detail}
        pastures={pastures}
        onClose={() => setDetail(null)}
        onEditCalf={(a) => { setDetail(null); onEditCalf(a); }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: GREEN_BG }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 shrink-0" style={{ background: GREEN_DARK }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={onBack} className="text-white/80 hover:text-white p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-xl">All Calves</h1>
          <button
            onClick={() => exportCSV(filtered, pastures)}
            className="flex items-center gap-1.5 text-white font-black text-sm px-3 py-2 rounded-xl active:scale-95 transition-all"
            style={{ background: 'rgba(255,255,255,0.22)' }}
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>

        {/* Large search bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by Calf # or Mother #"
              className="h-14 text-lg pl-5 pr-12 bg-white text-gray-800 border-0 rounded-2xl shadow focus-visible:ring-2 focus-visible:ring-green-300 placeholder:text-gray-400 placeholder:font-medium"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter chips ────────────────────────────────── */}
      <div className="bg-white border-b border-green-100 shrink-0">

        {/* Row 1: All / Season Year chips */}
        <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto no-scrollbar">
          {/* ALL chip */}
          <button
            onClick={() => { setSelectedSeasonId(null); setPage(1); }}
            className={`shrink-0 h-10 px-4 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
              selectedSeasonId === null ? 'text-white shadow' : 'bg-gray-100 text-gray-600'
            }`}
            style={selectedSeasonId === null ? { background: GREEN_DARK } : {}}
          >
            All
          </button>

          {/* Season year chips */}
          {seasonsWithCalves.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelectedSeasonId(s.id); setPage(1); }}
              className={`shrink-0 h-10 px-4 rounded-full text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                selectedSeasonId === s.id ? 'text-white shadow' : 'bg-gray-100 text-gray-600'
              }`}
              style={selectedSeasonId === s.id ? { background: GREEN_DARK } : {}}
            >
              {s.year}
              {s.status === 'Active' && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  selectedSeasonId === s.id ? 'bg-white/25 text-white' : 'bg-green-100 text-green-700'
                }`}>Active</span>
              )}
            </button>
          ))}
        </div>

        {/* Row 2: Sex + Location chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {/* Male chip */}
          <button
            onClick={toggleMale}
            className={`shrink-0 h-10 px-4 rounded-full text-sm font-bold transition-all whitespace-nowrap border-2 ${
              showMale
                ? 'bg-blue-500 text-white border-blue-500 shadow'
                : 'bg-white text-gray-400 border-gray-200'
            }`}
          >
            ♂ Male
          </button>

          {/* Female chip */}
          <button
            onClick={toggleFemale}
            className={`shrink-0 h-10 px-4 rounded-full text-sm font-bold transition-all whitespace-nowrap border-2 ${
              showFemale
                ? 'bg-pink-500 text-white border-pink-500 shadow'
                : 'bg-white text-gray-400 border-gray-200'
            }`}
          >
            ♀ Female
          </button>

          {/* Location chip */}
          <button
            onClick={() => setShowLocationPicker(true)}
            className={`shrink-0 h-10 px-4 rounded-full text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              locationFilter ? 'text-white shadow' : 'bg-gray-100 text-gray-600'
            }`}
            style={locationFilter ? { background: GREEN_DARK } : {}}
          >
            📍 {activeLocationLabel ? activeLocationLabel : 'By Location'}
            {locationFilter && (
              <span
                onClick={e => { e.stopPropagation(); setLocationFilter(null); setPage(1); }}
                className="ml-1 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-white text-xs font-black"
              >×</span>
            )}
          </button>
        </div>
      </div>

      {/* Location picker modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30">
          <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-4 pb-10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="font-heading font-black text-lg text-gray-900">Filter by Location</p>
              <button onClick={() => setShowLocationPicker(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {/* Unknown bucket */}
              {pastureOptions.hasUnknown && (
                <button
                  onClick={() => { setLocationFilter('__unknown__'); setPage(1); setShowLocationPicker(false); }}
                  className={`w-full text-left h-14 px-5 rounded-2xl font-bold text-base transition-all ${
                    locationFilter === '__unknown__' ? 'text-white' : 'bg-gray-50 text-gray-500 italic hover:bg-gray-100'
                  }`}
                  style={locationFilter === '__unknown__' ? { background: GREEN_DARK } : {}}
                >
                  Unknown (no location assigned)
                </button>
              )}
              {/* Named pastures */}
              {pastureOptions.list.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setLocationFilter(p.id); setPage(1); setShowLocationPicker(false); }}
                  className={`w-full text-left h-14 px-5 rounded-2xl font-bold text-base transition-all ${
                    locationFilter === p.id ? 'text-white' : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                  }`}
                  style={locationFilter === p.id ? { background: GREEN_DARK } : {}}
                >
                  {p.pasture_name}
                </button>
              ))}
              {!pastureOptions.hasUnknown && pastureOptions.list.length === 0 && (
                <p className="text-gray-400 text-center py-6">No locations assigned to calves yet.</p>
              )}
            </div>
            <button
              onClick={() => { setLocationFilter(null); setPage(1); setShowLocationPicker(false); }}
              className="w-full mt-4 h-12 rounded-2xl border-2 border-gray-200 text-gray-500 font-semibold"
            >
              Clear Location Filter
            </button>
          </div>
        </div>
      )}

      {/* ── Count ───────────────────────────────────────── */}
      <p className="px-4 pt-3 pb-1 text-sm text-gray-400 font-semibold shrink-0">
        {filtered.length} {filtered.length === 1 ? 'calf' : 'calves'}
      </p>

      {/* ── List ────────────────────────────────────────── */}
      <div className="flex-1 px-4 pb-10">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-green-100 px-5 py-16 text-center mt-2">
            <p className="text-5xl mb-4">🐄</p>
            <p className="font-bold text-gray-700 text-xl">No calves tagged yet.</p>
            <p className="text-base text-gray-400 mt-2 leading-relaxed">
              {search
                ? 'Try a different search term or clear the filter.'
                : 'Tap the big + Add New Calf button on the main screen to get started.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-green-100 overflow-hidden shadow-sm mt-2 divide-y divide-gray-50">
            {paginated.map(a => {
              const pasture = pastures.find(p => p.id === a.pasture_id);
              const locationLabel = pasture?.pasture_name || 'Unknown';
              return (
                <button
                  key={a.id}
                  onClick={() => setDetail(a)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-green-50 active:bg-green-100 transition-colors text-left"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0 ${
                    a.sex === 'Male' ? 'bg-blue-400' : 'bg-pink-400'
                  }`}>
                    {a.sex === 'Male' ? '♂' : '♀'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-heading font-black text-gray-900 text-lg leading-tight">
                        #{a.animal_number}
                      </span>
                      {a.mother_animal_number && (
                        <span className="text-sm text-gray-400 font-medium">Dam: #{a.mother_animal_number}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {a.date_of_birth && (
                        <span className="text-xs text-gray-400 font-medium">
                          {format(new Date(a.date_of_birth), 'MMM d, yyyy')}
                        </span>
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        pasture ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'
                      }`}>
                        {locationLabel}
                      </span>
                    </div>
                    {a.notes && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{a.notes}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-200 shrink-0" />
                </button>
              );
            })}
            {hasMore && (
              <div className="px-5 py-4">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="w-full py-3 rounded-2xl font-bold text-base border-2 border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                >
                  Load More ({filtered.length - paginated.length} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}