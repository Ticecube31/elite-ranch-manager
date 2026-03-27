import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Download, FileText, Clock } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';

const PURPLE = '#6B2D5E';
const PURPLE_DARK = '#4A1F40';
const PURPLE_BG = '#F9F4F8';
const PURPLE_LIGHT = '#F3E8F0';
const RED = '#C2185B';

const DATE_RANGES = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 30d', value: '30d' },
  { label: 'Last 90d', value: '90d' },
  { label: 'This Year', value: 'year' },
];

// ── Horizontal mini bar chart ─────────────────────────────────────────────────
function MiniBar({ label, value, max, color = PURPLE }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-sm font-semibold text-gray-600 w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: '#F0EBF0' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}CC)`, minWidth: value > 0 ? 24 : 0 }}
        />
      </div>
      <span className="text-sm font-black w-8 text-right shrink-0" style={{ color: PURPLE_DARK }}>{value}</span>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function ReportCard({ number, title, icon, children }) {
  return (
    <div className="bg-white rounded-3xl border border-purple-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-purple-50" style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})` }}>
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">Card {number}</p>
          <p className="font-heading font-black text-white text-lg leading-tight">{title}</p>
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

// ── Big stat ──────────────────────────────────────────────────────────────────
function BigStat({ label, value, color, sub }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl py-5 px-3 text-center" style={{ background: PURPLE_LIGHT }}>
      <p className="font-heading font-black leading-none" style={{ fontSize: 48, color: color || PURPLE_DARK }}>{value}</p>
      <p className="text-sm font-bold text-gray-600 mt-1 leading-tight">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HerdReports({ onBack }) {
  const [dateRange, setDateRange] = useState('all');

  const { data: animals = [] } = useQuery({
    queryKey: ['animals'],
    queryFn: () => base44.entities.Animals.list('-created_date'),
    initialData: [],
  });

  const { data: pastures = [] } = useQuery({
    queryKey: ['pastures'],
    queryFn: () => base44.entities.Pastures.list(),
    initialData: [],
  });

  const { data: tagHistory = [] } = useQuery({
    queryKey: ['tag-history'],
    queryFn: () => base44.entities.TagHistory.list('-change_date'),
    initialData: [],
  });

  const getPastureName = (pid) => pastures.find(p => p.id === pid)?.pasture_name || 'Unassigned';

  // Date filter cutoff
  const cutoff = useMemo(() => {
    if (dateRange === '30d') return subDays(new Date(), 30);
    if (dateRange === '90d') return subDays(new Date(), 90);
    if (dateRange === 'year') return new Date(new Date().getFullYear(), 0, 1);
    return null;
  }, [dateRange]);

  const filteredAnimals = useMemo(() => {
    if (!cutoff) return animals;
    return animals.filter(a => a.created_date && new Date(a.created_date) >= cutoff);
  }, [animals, cutoff]);

  const filteredTagHistory = useMemo(() => {
    if (!cutoff) return tagHistory;
    return tagHistory.filter(h => h.change_date && new Date(h.change_date) >= cutoff);
  }, [tagHistory, cutoff]);

  // ── Card 1: Overview stats ────────────────────────────────
  const total = filteredAnimals.length;
  const alive = filteredAnimals.filter(a => a.status === 'Alive').length;
  const sold = filteredAnimals.filter(a => a.status === 'Sold').length;
  const died = filteredAnimals.filter(a => a.status === 'Died').length;
  const missing = filteredAnimals.filter(a => a.status === 'Missing').length;
  const archived = filteredAnimals.filter(a => a.is_archived).length;

  // ── Card 2: Breakdown by type ─────────────────────────────
  const typeCounts = [
    { label: 'Cows', value: filteredAnimals.filter(a => a.animal_type === 'Cow').length, color: RED },
    { label: '1st Calf Heifers', value: filteredAnimals.filter(a => a.animal_type === '1st Calf Heifer').length, color: PURPLE },
    { label: 'Calf - Heifers', value: filteredAnimals.filter(a => a.animal_type === 'Calf - Heifer').length, color: PURPLE },
    { label: 'Calf - Steers', value: filteredAnimals.filter(a => a.animal_type === 'Calf - Steer').length, color: '#1565C0' },
    { label: 'Bulls', value: filteredAnimals.filter(a => a.animal_type === 'Bull').length, color: '#2E7D32' },
  ];
  const maxType = Math.max(...typeCounts.map(t => t.value), 1);

  // ── Card 3: Tag change summary ────────────────────────────
  const uniqueAnimalsWithChanges = new Set(filteredTagHistory.map(h => h.animal_id)).size;
  const recentTagHistory = filteredTagHistory.slice(0, 10);

  // ── Card 4: Location summary ──────────────────────────────
  const locationMap = {};
  filteredAnimals.forEach(a => {
    const name = getPastureName(a.pasture_id);
    locationMap[name] = (locationMap[name] || 0) + 1;
  });
  const locationEntries = Object.entries(locationMap).sort((a, b) => b[1] - a[1]);
  const maxLocation = locationEntries.length > 0 ? locationEntries[0][1] : 1;
  const topLocation = locationEntries[0]?.[0];

  // ── Export CSV ────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Tag #', 'Sex', 'Type', 'Status', 'Mother Tag #', 'Date Tagged', 'Birth Year', 'Location', 'Notes', 'Archived', 'Created'];
    const rows = filteredAnimals.map(a => [
      a.tag_number, a.sex, a.animal_type, a.status,
      a.mother_animal_number || '',
      a.date_of_birth || '',
      a.birth_year || '',
      getPastureName(a.pasture_id),
      (a.notes || '').replace(/,/g, ' '),
      a.is_archived ? 'Yes' : 'No',
      a.created_date ? format(new Date(a.created_date), 'MM/dd/yyyy') : '',
    ]);

    const summaryRows = [
      [],
      ['--- HERD SUMMARY ---'],
      ['Total Animals', total],
      ['Alive', alive],
      ['Sold', sold],
      ['Died', died],
      ['Missing', missing],
      ['Archived', archived],
      [],
      ['--- BY TYPE ---'],
      ...typeCounts.map(t => [t.label, t.value]),
      [],
      ['--- BY LOCATION ---'],
      ...locationEntries.map(([name, cnt]) => [name, cnt]),
      [],
      ['--- TAG HISTORY ---'],
      ['Date', 'Old Tag', 'New Tag', 'Changed By', 'Reason'],
      ...tagHistory.map(h => [
        h.change_date ? format(new Date(h.change_date), 'MM/dd/yyyy') : '',
        h.old_tag_number || '(original)',
        h.new_tag_number,
        h.changed_by || '',
        h.reason || '',
      ]),
      [],
      ['--- FULL ANIMAL LIST ---'],
      headers,
      ...rows,
    ];

    const csv = summaryRows.map(r => Array.isArray(r) ? r.join(',') : r).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url;
    el.download = `herd-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    el.click();
    URL.revokeObjectURL(url);
  };

  // ── Export PDF (print-friendly) ───────────────────────────
  const exportPDF = () => {
    const win = window.open('', '_blank');
    const rangeLabel = DATE_RANGES.find(r => r.value === dateRange)?.label || 'All Time';
    win.document.write(`
      <html>
      <head>
        <title>Herd Report — ${format(new Date(), 'MMMM d, yyyy')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #1A1A1A; padding: 40px; }
          h1 { font-size: 32px; color: #4A1F40; margin-bottom: 4px; }
          .subtitle { font-size: 14px; color: #888; margin-bottom: 32px; }
          h2 { font-size: 18px; color: #6B2D5E; margin: 24px 0 12px; border-bottom: 2px solid #F3E8F0; padding-bottom: 6px; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
          .stat-box { background: #F9F4F8; border-radius: 12px; padding: 20px; text-align: center; }
          .stat-num { font-size: 40px; font-weight: 900; color: #4A1F40; }
          .stat-label { font-size: 12px; font-weight: 700; color: #666; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #4A1F40; color: white; padding: 8px 12px; text-align: left; }
          td { padding: 7px 12px; border-bottom: 1px solid #F3E8F0; }
          tr:nth-child(even) td { background: #FAFAFA; }
          .bar-row { display: flex; align-items: center; gap: 12px; margin: 8px 0; }
          .bar-label { width: 160px; font-size: 13px; font-weight: 600; }
          .bar-track { flex: 1; height: 20px; background: #F3E8F0; border-radius: 10px; overflow: hidden; }
          .bar-fill { height: 100%; border-radius: 10px; }
          .bar-val { width: 32px; font-size: 13px; font-weight: 900; text-align: right; }
          .top-badge { display: inline-block; background: #6B2D5E; color: white; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 700; margin-left: 8px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>🐄 Herd Report</h1>
        <p class="subtitle">Generated ${format(new Date(), 'MMMM d, yyyy')} · Range: ${rangeLabel}</p>

        <h2>1 — Herd Overview</h2>
        <div class="stats-grid">
          <div class="stat-box"><div class="stat-num">${total}</div><div class="stat-label">TOTAL ANIMALS</div></div>
          <div class="stat-box"><div class="stat-num" style="color:#2E7D32">${alive}</div><div class="stat-label">ALIVE</div></div>
          <div class="stat-box"><div class="stat-num" style="color:#1565C0">${sold}</div><div class="stat-label">SOLD</div></div>
          <div class="stat-box"><div class="stat-num" style="color:#C62828">${died}</div><div class="stat-label">DIED</div></div>
        </div>

        <h2>2 — Breakdown by Animal Type</h2>
        ${typeCounts.map(t => `
          <div class="bar-row">
            <span class="bar-label">${t.label}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${maxType > 0 ? Math.round(t.value / maxType * 100) : 0}%;background:${t.color}"></div></div>
            <span class="bar-val">${t.value}</span>
          </div>`).join('')}

        <h2>3 — Tag Change Summary</h2>
        <p style="font-size:14px;margin-bottom:12px">Animals with tag changes: <strong>${uniqueAnimalsWithChanges}</strong> · Total entries: <strong>${filteredTagHistory.length}</strong></p>
        <table>
          <tr><th>Date</th><th>Old Tag</th><th>New Tag</th><th>Changed By</th><th>Reason</th></tr>
          ${filteredTagHistory.slice(0, 20).map(h => `
            <tr>
              <td>${h.change_date ? format(new Date(h.change_date), 'MM/dd/yyyy') : '—'}</td>
              <td>${h.old_tag_number || '(original)'}</td>
              <td><strong>#${h.new_tag_number}</strong></td>
              <td>${h.changed_by || '—'}</td>
              <td>${h.reason || '—'}</td>
            </tr>`).join('')}
        </table>

        <h2>4 — Location Summary</h2>
        ${locationEntries.map(([name, cnt]) => `
          <div class="bar-row">
            <span class="bar-label">${name}${name === topLocation ? '<span class="top-badge">Top</span>' : ''}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${maxLocation > 0 ? Math.round(cnt / maxLocation * 100) : 0}%;background:#6B2D5E"></div></div>
            <span class="bar-val">${cnt}</span>
          </div>`).join('')}

        <h2>Full Animal List</h2>
        <table>
          <tr><th>Tag #</th><th>Sex</th><th>Type</th><th>Status</th><th>Mother #</th><th>Date Tagged</th><th>Location</th></tr>
          ${filteredAnimals.map(a => `
            <tr>
              <td><strong>#${a.tag_number}</strong></td>
              <td>${a.sex || '—'}</td>
              <td>${a.animal_type || '—'}</td>
              <td>${a.status || '—'}</td>
              <td>${a.mother_animal_number ? '#' + a.mother_animal_number : '—'}</td>
              <td>${a.date_of_birth ? format(new Date(a.date_of_birth), 'MM/dd/yyyy') : '—'}</td>
              <td>${getPastureName(a.pasture_id)}</td>
            </tr>`).join('')}
        </table>

        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="min-h-screen pb-36" style={{ background: PURPLE_BG }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20" style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})` }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={onBack} className="text-white/80 hover:text-white p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-xl">Herd Reports</h1>
          <div className="w-10" />
        </div>

        {/* Date range chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {DATE_RANGES.map(r => (
            <button key={r.value} onClick={() => setDateRange(r.value)}
              className={`shrink-0 h-8 px-4 rounded-full text-xs font-bold transition-all ${dateRange === r.value ? 'bg-white text-purple-900' : 'bg-white/20 text-white/80'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-5">

        {/* ── Card 1: Herd Overview ─────────────────────────── */}
        <ReportCard number="1" title="Herd Overview" icon="🐄">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <BigStat label="Total Animals" value={total} color={PURPLE_DARK} />
            <BigStat label="Active / Alive" value={alive} color="#2E7D32" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center justify-center rounded-2xl py-4 px-2 text-center bg-blue-50">
              <p className="font-heading font-black text-3xl text-blue-700">{sold}</p>
              <p className="text-xs font-bold text-blue-600 mt-1">Sold</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl py-4 px-2 text-center bg-red-50">
              <p className="font-heading font-black text-3xl text-red-700">{died}</p>
              <p className="text-xs font-bold text-red-600 mt-1">Died</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl py-4 px-2 text-center bg-yellow-50">
              <p className="font-heading font-black text-3xl text-yellow-700">{missing}</p>
              <p className="text-xs font-bold text-yellow-600 mt-1">Missing</p>
            </div>
          </div>
          {archived > 0 && (
            <p className="text-xs text-gray-400 font-semibold mt-3 text-center">{archived} archived (hidden from active lists)</p>
          )}
        </ReportCard>

        {/* ── Card 2: Breakdown by Type ─────────────────────── */}
        <ReportCard number="2" title="Breakdown by Animal Type" icon="📊">
          {typeCounts.map(t => (
            <MiniBar key={t.label} label={t.label} value={t.value} max={maxType} color={t.color} />
          ))}
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400 font-semibold">
            <span>Female: {filteredAnimals.filter(a => a.sex === 'Female').length}</span>
            <span>Male: {filteredAnimals.filter(a => a.sex === 'Male').length}</span>
            <span>Total: {total}</span>
          </div>
        </ReportCard>

        {/* ── Card 3: Tag Changes ───────────────────────────── */}
        <ReportCard number="3" title="Tag Changes Summary" icon="🏷️">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-2xl py-4 px-4 text-center" style={{ background: PURPLE_LIGHT }}>
              <p className="font-heading font-black text-3xl" style={{ color: PURPLE_DARK }}>{uniqueAnimalsWithChanges}</p>
              <p className="text-xs font-bold text-gray-500 mt-1">Animals w/ Changes</p>
            </div>
            <div className="rounded-2xl py-4 px-4 text-center" style={{ background: PURPLE_LIGHT }}>
              <p className="font-heading font-black text-3xl" style={{ color: PURPLE_DARK }}>{filteredTagHistory.length}</p>
              <p className="text-xs font-bold text-gray-500 mt-1">Total Log Entries</p>
            </div>
          </div>

          {recentTagHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No tag changes in this period</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Most Recent Changes</p>
              {recentTagHistory.map((h, i) => (
                <div key={h.id || i} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: i === 0 ? '#FFF8E1' : PURPLE_LIGHT }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-black text-sm" style={{ color: PURPLE_DARK }}>
                      <span className="line-through text-gray-400 text-xs">{h.old_tag_number || '(orig)'}</span>
                      <span className="text-gray-300">→</span>
                      <span>#{h.new_tag_number}</span>
                    </div>
                    {h.reason && <p className="text-xs text-gray-500 mt-0.5 truncate">{h.reason}</p>}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    {h.change_date && (
                      <p className="text-xs text-gray-400">{format(new Date(h.change_date), 'MM/dd/yy')}</p>
                    )}
                    {i === 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFF0C2', color: '#8A6A00' }}>Latest</span>}
                  </div>
                </div>
              ))}
              {filteredTagHistory.length > 10 && (
                <p className="text-xs text-gray-400 text-center pt-1">+{filteredTagHistory.length - 10} more in export</p>
              )}
            </div>
          )}
        </ReportCard>

        {/* ── Card 4: Location Summary ──────────────────────── */}
        <ReportCard number="4" title="Location Summary" icon="📍">
          {locationEntries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No location data available</p>
          ) : (
            <>
              {topLocation && (
                <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between"
                  style={{ background: `linear-gradient(135deg, ${PURPLE}20, ${PURPLE_LIGHT})` }}>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Most Animals</p>
                    <p className="font-heading font-black text-lg" style={{ color: PURPLE_DARK }}>📍 {topLocation}</p>
                  </div>
                  <p className="font-heading font-black text-4xl" style={{ color: PURPLE }}>{locationEntries[0][1]}</p>
                </div>
              )}
              {locationEntries.map(([name, cnt]) => (
                <MiniBar key={name} label={name} value={cnt} max={maxLocation} color={name === topLocation ? RED : PURPLE} />
              ))}
            </>
          )}
        </ReportCard>

      </div>

      {/* ── Export buttons ─────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3 bg-white border-t border-purple-100 shadow-2xl">
        <div className="max-w-lg mx-auto space-y-2">
          <button onClick={exportCSV}
            className="w-full h-14 rounded-2xl text-white font-heading font-black text-base shadow-md flex items-center justify-center gap-3"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}>
            <Download className="w-5 h-5" />
            Export Full Herd Report (CSV/Excel)
          </button>
          <button onClick={exportPDF}
            className="w-full h-14 rounded-2xl font-heading font-black text-base shadow-sm border-2 flex items-center justify-center gap-3 bg-white"
            style={{ borderColor: PURPLE, color: PURPLE }}>
            <FileText className="w-5 h-5" />
            Download Printable PDF Report
          </button>
        </div>
      </div>
    </div>
  );
}