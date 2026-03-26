import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronRight, ChevronUp, ChevronDown, Download, X, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

const GREEN = '#4CAF50';
const GREEN_DARK = '#2E7D32';
const GREEN_BG = '#F1F8F1';

const PAGE_SIZE = 50;

function exportCSV(calves, pastures) {
  const headers = ['Calf #', 'Mother #', 'Sex', 'Type', 'Date Tagged', 'Location', 'Status', 'Notes', 'Animal ID', 'Season ID', 'Created By'];
  const getPastureName = (id) => pastures.find(p => p.id === id)?.pasture_name || '';
  const rows = calves.map(a => [
    a.animal_number,
    a.mother_animal_number || '',
    a.sex,
    a.animal_type,
    a.date_of_birth || '',
    getPastureName(a.pasture_id),
    a.status,
    (a.notes || '').replace(/,/g, ' '),
    a.id,
    a.calving_season_id || '',
    a.created_by || '',
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'calves-export.csv'; a.click();
  URL.revokeObjectURL(url);
}

function CalfDetailSheet({ calf, pastures, onClose, onEditCalf }) {
  const pasture = pastures.find(p => p.id === calf.pasture_id);
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: GREEN_BG }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0" style={{ background: GREEN_DARK }}>
        <button onClick={onClose} className="text-white/80 hover:text-white p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-heading font-black text-white text-lg">Calf #{calf.animal_number}</h1>
        <button
          onClick={() => onEditCalf(calf)}
          className="text-white/90 text-sm font-semibold pr-1"
        >
          Edit
        </button>
      </div>

      <div className="overflow-y-auto flex-1 px-5 py-6 space-y-4 max-w-lg mx-auto w-full">
        {/* Sex badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-white text-base ${
          calf.sex === 'Male' ? 'bg-blue-500' : 'bg-pink-500'
        }`}>
          {calf.sex === 'Male' ? '♂' : '♀'} {calf.sex} · {calf.animal_type}
        </div>

        {/* Detail rows */}
        {[
          { label: 'Calf Tag #',    value: `#${calf.animal_number}` },
          { label: 'Mother Tag #',  value: calf.mother_animal_number ? `#${calf.mother_animal_number}` : '—' },
          { label: 'Date Tagged',   value: calf.date_of_birth ? format(new Date(calf.date_of_birth), 'MMMM d, yyyy') : '—' },
          { label: 'Location',      value: pasture?.pasture_name || '—' },
          { label: 'Status',        value: calf.status || 'Alive' },
          { label: 'Created By',    value: calf.created_by || '—' },
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
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');   // all | Male | Female | season | year
  const [sortKey, setSortKey] = useState('date');  // date | calf | mother
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage]       = useState(1);
  const [detail, setDetail]   = useState(null);

  const currentYear = new Date().getFullYear();

  const activeSeason = seasons.find(s => s.status === 'Active');

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

    // Filter chips
    if (filter === 'Male')   list = list.filter(a => a.sex === 'Male');
    if (filter === 'Female') list = list.filter(a => a.sex === 'Female');
    if (filter === 'season' && activeSeason)
      list = list.filter(a => a.calving_season_id === activeSeason.id);
    if (filter === 'year')
      list = list.filter(a => a.birth_year === currentYear || new Date(a.date_of_birth || '').getFullYear() === currentYear);

    // Sort
    list = [...list].sort((a, b) => {
      let va, vb;
      if (sortKey === 'date')   { va = a.date_of_birth || a.created_date || ''; vb = b.date_of_birth || b.created_date || ''; }
      if (sortKey === 'calf')   { va = a.animal_number || ''; vb = b.animal_number || ''; }
      if (sortKey === 'mother') { va = a.mother_animal_number || ''; vb = b.mother_animal_number || ''; }
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    return list;
  }, [calves, search, filter, sortKey, sortDir, activeSeason, currentYear]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore   = paginated.length < filtered.length;

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 text-gray-300 inline ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-green-600 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-green-600 inline ml-1" />;
  };

  const chips = [
    { key: 'all',    label: 'All' },
    { key: 'Male',   label: '♂ Male' },
    { key: 'Female', label: '♀ Female' },
    { key: 'season', label: 'This Season' },
    { key: 'year',   label: 'This Year' },
  ];

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

      {/* Header */}
      <div className="sticky top-0 z-10 shrink-0" style={{ background: GREEN_DARK }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={onBack} className="text-white/80 hover:text-white p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-lg">All Calves</h1>
          <button
            onClick={() => exportCSV(filtered, pastures)}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-bold px-3 py-1.5 rounded-xl transition-all"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by Calf # or Mother #..."
              className="h-11 pl-4 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-xl focus-visible:ring-0 focus-visible:border-white/50"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-white/70" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar shrink-0">
        {chips.map(c => (
          <button
            key={c.key}
            onClick={() => { setFilter(c.key); setPage(1); }}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
              filter === c.key
                ? 'text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
            style={filter === c.key ? { background: GREEN_DARK } : {}}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="px-4 text-sm text-gray-500 font-medium mb-2 shrink-0">
        {filtered.length} {filtered.length === 1 ? 'calf' : 'calves'} found
      </p>

      {/* Table */}
      <div className="flex-1 px-4 pb-8">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-green-100 px-5 py-16 text-center">
            <p className="text-4xl mb-3">🐄</p>
            <p className="font-bold text-gray-700 text-lg">No calves found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'Try a different search term.' : 'No calves tagged yet. Tap + Add New Calf to get started.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-green-100 overflow-hidden shadow-sm">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-0 border-b border-gray-100 bg-gray-50">
              <button onClick={() => toggleSort('calf')}  className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                Calf # <SortIcon k="calf" />
              </button>
              <button onClick={() => toggleSort('mother')} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                Mother # <SortIcon k="mother" />
              </button>
              <div className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Sex</div>
              <button onClick={() => toggleSort('date')} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                Date <SortIcon k="date" />
              </button>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-50">
              {paginated.map(a => {
                const pasture = pastures.find(p => p.id === a.pasture_id);
                return (
                  <button
                    key={a.id}
                    onClick={() => setDetail(a)}
                    className="w-full grid grid-cols-[1fr_1fr_auto_auto] gap-0 items-center hover:bg-green-50 active:bg-green-100 transition-colors text-left"
                  >
                    <div className="px-4 py-4">
                      <p className="font-heading font-black text-gray-900 text-base">#{a.animal_number}</p>
                      {pasture && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[90px]">{pasture.pasture_name}</p>}
                    </div>
                    <div className="px-4 py-4">
                      <p className="text-gray-700 font-semibold text-sm">
                        {a.mother_animal_number ? `#${a.mother_animal_number}` : <span className="text-gray-300">—</span>}
                      </p>
                      {a.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[90px]">{a.notes}</p>
                      )}
                    </div>
                    <div className="px-3 py-4">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold text-white ${
                        a.sex === 'Male' ? 'bg-blue-400' : 'bg-pink-400'
                      }`}>
                        {a.sex === 'Male' ? '♂' : '♀'}
                      </span>
                    </div>
                    <div className="px-4 py-4 flex items-center gap-2">
                      <p className="text-xs text-gray-400">
                        {a.date_of_birth ? format(new Date(a.date_of_birth), 'MMM d') : '—'}
                      </p>
                      <ChevronRight className="w-4 h-4 text-gray-200 shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="px-4 py-4 border-t border-gray-100">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="w-full h-12 rounded-xl font-bold text-sm border-2 border-green-200 text-green-700 hover:bg-green-50 transition-colors"
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