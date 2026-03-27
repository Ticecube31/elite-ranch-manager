import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Download, Search, X, ChevronUp, ChevronDown, Trash2, CheckSquare, Square, Save } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';

const PURPLE = '#6B2D5E';
const PURPLE_DARK = '#4A1F40';
const PURPLE_BG = '#F9F4F8';
const PURPLE_LIGHT = '#F3E8F0';

function CellText({ value, onCommit, placeholder = '—' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  if (editing) return (
    <textarea
      autoFocus
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { setEditing(false); onCommit(val); }}
      onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
      className="w-full px-1 text-sm border border-purple-400 rounded outline-none bg-white resize-none"
      style={{ minWidth: 60 }}
      rows={3}
    />
  );
  return (
    <button onClick={() => { setVal(value || ''); setEditing(true); }}
      className="w-full text-left text-sm whitespace-normal px-1 py-1 rounded hover:bg-purple-50 active:bg-purple-100 overflow-hidden">
      {value || <span className="text-gray-300">{placeholder}</span>}
    </button>
  );
}

function CellNumber({ value, onCommit }) {
  const [editing, setEditing] = useState(false);
  if (editing) return (
    <input
      autoFocus
      type="number"
      defaultValue={value || ''}
      onBlur={e => { setEditing(false); onCommit(parseInt(e.target.value) || null); }}
      onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
      className="w-full h-8 px-1 text-sm border border-purple-400 rounded outline-none bg-white"
    />
  );
  return (
    <button onClick={() => setEditing(true)}
      className="w-full text-left text-sm px-1 py-1 rounded hover:bg-purple-50 active:bg-purple-100 overflow-hidden">
      {value || <span className="text-gray-300">—</span>}
    </button>
  );
}

function DeleteConfirm({ year, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-heading font-bold text-lg mb-2">Delete Year {year}?</h3>
        <p className="text-sm text-gray-500 mb-6">This will permanently remove this calving season and cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-12 rounded-xl border-2 border-gray-200 font-semibold text-gray-600">Cancel</button>
          <button onClick={onConfirm} className="flex-1 h-12 rounded-xl bg-red-500 text-white font-bold">Delete</button>
        </div>
      </div>
    </div>
  );
}

function AddRowModal({ onSave, onClose, existingYears }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!year) { toast.error('Year required'); return; }
    if (existingYears.includes(year)) { toast.error(`Year ${year} already exists`); return; }
    setSaving(true);
    await onSave({ year, label: `Calving Season ${year}`, notes });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-0 pb-0">
      <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-xl" style={{ color: PURPLE_DARK }}>Add Calving Season</h3>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-400" /></button>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Year *</label>
          <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-full h-12 border border-gray-200 rounded-xl px-3 mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full h-20 border border-gray-200 rounded-xl px-3 mt-1 resize-none" placeholder="Season notes..." />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-13 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 h-13 py-3 rounded-xl text-white font-bold" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}>
            {saving ? 'Saving...' : 'Add Season'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CalvingSeasonSpreadsheet({ onBack }) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('year');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [visibleCols, setVisibleCols] = useState(new Set(['year', 'label', 'total_animals', 'notes']));
  const [showColMenu, setShowColMenu] = useState(false);
  const [colOrder, setColOrder] = useState(['year', 'label', 'total_animals', 'notes']);
  const [colWidths, setColWidths] = useState({});
  const [draggedCol, setDraggedCol] = useState(null);
  const [resizing, setResizing] = useState(null);

  const queryClient = useQueryClient();

  const { data: seasons = [], isLoading } = useQuery({
    queryKey: ['calving-seasons'],
    queryFn: () => base44.entities.CalvingSeasons.list('-year'),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalvingSeasons.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calving-seasons'] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CalvingSeasons.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['calving-seasons'] }); toast.success('Season added!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CalvingSeasons.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['calving-seasons'] }); toast.success('Season deleted'); },
  });

  const handleCellUpdate = async (season, field, newValue) => {
    if (newValue === season[field]) return;
    await updateMutation.mutateAsync({ id: season.id, data: { [field]: newValue } });
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    setSelected(prev => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
  };

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(s => s.id)));

  const filtered = useMemo(() => {
    let list = seasons.filter(s => {
      const q = search.toLowerCase();
      return !q || [s.year, s.label, s.notes].some(v => v?.toString().toLowerCase().includes(q));
    });

    list = [...list].sort((a, b) => {
      const va = a[sortCol] || '';
      const vb = b[sortCol] || '';
      const cmp = va.toString().localeCompare(vb.toString());
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [seasons, search, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const getColWidth = (key) => colWidths[key] || (COLS.find(c => c.key === key)?.defaultWidth || 120);

  const handleColResize = (colKey, newWidth) => {
    setColWidths(prev => ({ ...prev, [colKey]: Math.max(80, newWidth) }));
  };

  const handleColDragStart = (e, colKey) => {
    setDraggedCol(colKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleColDrop = (e, targetKey) => {
    e.preventDefault();
    if (!draggedCol || draggedCol === targetKey) { setDraggedCol(null); return; }
    const dragIdx = colOrder.indexOf(draggedCol);
    const dropIdx = colOrder.indexOf(targetKey);
    const newOrder = [...colOrder];
    newOrder.splice(dragIdx, 1);
    newOrder.splice(dropIdx, 0, draggedCol);
    setColOrder(newOrder);
    setDraggedCol(null);
  };

  const handleSaveLayout = () => {
    const layout = { colOrder, colWidths, visibleCols: Array.from(visibleCols) };
    localStorage.setItem('calving-season-layout', JSON.stringify(layout));
    toast.success('Layout saved!');
  };

  const toggleColVisibility = (key) => {
    const n = new Set(visibleCols);
    n.has(key) ? n.delete(key) : n.add(key);
    setVisibleCols(n);
  };

  const handleDragEnd = (result) => {
    // drag-drop for rows if needed
  };

  const exportCSV = (rows) => {
    const headers = ['Year', 'Label', 'Total Animals', 'Notes'];
    const data = rows.map(s => [s.year, s.label || '', s.total_animals || 0, (s.notes || '').replace(/,/g, ' ')]);
    const csv = [headers, ...data].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url; el.download = 'calving-seasons.csv'; el.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ col }) => sortCol === col
    ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)
    : <span className="w-3 h-3 inline-block" />;

  const COLS = [
    { key: 'year', label: 'Year', defaultWidth: 120 },
    { key: 'label', label: 'Label', defaultWidth: 150 },
    { key: 'total_animals', label: 'Total Animals', defaultWidth: 140 },
    { key: 'notes', label: 'Notes', defaultWidth: 200 },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: PURPLE_BG }}>
      {/* Header */}
      <div className="sticky top-0 z-30 shrink-0" style={{ background: PURPLE_DARK }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={onBack} className="text-white/80 hover:text-white p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-xl">Calving Seasons</h1>
          <button onClick={() => exportCSV(filtered)} title="Export CSV" className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <Download className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-11 pl-9 pr-9 rounded-xl text-sm bg-white border-0 outline-none"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
          </div>
        </div>
      </div>

      {/* Count + Add */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <p className="text-xs font-semibold text-gray-400">{filtered.length} seasons{selected.size > 0 ? ` · ${selected.size} selected` : ''}</p>
        <div className="flex gap-2">
          <button
            onClick={handleSaveLayout}
            className="h-9 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-gray-100 border border-gray-200"
            title="Save layout as default"
          >
            <Save className="w-4 h-4" /> Save Layout
          </button>
          <div className="relative">
            <button onClick={() => setShowColMenu(!showColMenu)} className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold hover:bg-gray-100 border border-gray-200" title="Show/hide columns">
              ⚙️
            </button>
            {showColMenu && (
              <div className="absolute top-10 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 w-48">
                {COLS.map(col => (
                  <label key={col.key} className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-50 rounded text-xs">
                    <input type="checkbox" checked={visibleCols.has(col.key)} onChange={() => toggleColVisibility(col.key)} className="w-4 h-4 rounded" />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-white text-sm font-bold shadow-md" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-2 pb-16 flex flex-col">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: `${PURPLE}30`, borderTopColor: PURPLE }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📅</p>
            <p className="font-semibold text-gray-600">No seasons found</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-y-auto bg-white border border-gray-300">
            {/* Header row */}
            <div className="flex items-center bg-gray-50 sticky top-0 z-10" style={{ borderBottom: '2px solid #999' }}>
              <div style={{ width: 40, minWidth: 40, maxWidth: 40, borderRight: '1px solid #ccc' }} className="flex items-center justify-center px-2 py-3 shrink-0">
                <button onClick={toggleAll}>
                  {selected.size === filtered.length && filtered.length > 0
                    ? <CheckSquare className="w-5 h-5" style={{ color: PURPLE }} />
                    : <Square className="w-5 h-5 text-gray-300" />}
                </button>
              </div>
              {colOrder.map(colKey => {
                const col = COLS.find(c => c.key === colKey);
                if (!col || !visibleCols.has(col.key)) return null;
                const width = getColWidth(col.key);
                return (
                  <div
                    key={col.key}
                    style={{ width, minWidth: width, maxWidth: width, borderRight: '1px solid #ccc', opacity: draggedCol === col.key ? 0.5 : 1 }}
                    className="relative shrink-0 group flex items-center cursor-move select-none"
                    draggable
                    onDragStart={(e) => handleColDragStart(e, col.key)}
                    onDragOver={handleColDragOver}
                    onDrop={(e) => handleColDrop(e, col.key)}
                  >
                    <button
                      onClick={() => handleSort(col.key)}
                      className="w-full text-left text-xs font-bold px-2 py-3 uppercase tracking-wide overflow-hidden cursor-pointer hover:bg-gray-100"
                      style={{ color: PURPLE_DARK }}
                    >
                      {col.label} <SortIcon col={col.key} />
                    </button>
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setResizing(col.key);
                        const startX = e.clientX;
                        const startW = width;

                        const onMove = (e) => {
                          const delta = e.clientX - startX;
                          handleColResize(col.key, startW + delta);
                        };

                        const onUp = () => {
                          document.removeEventListener('mousemove', onMove);
                          document.removeEventListener('mouseup', onUp);
                          setResizing(null);
                        };

                        document.addEventListener('mousemove', onMove);
                        document.addEventListener('mouseup', onUp);
                      }}
                      className="absolute right-0 top-0 h-full w-1 bg-gray-400 hover:bg-purple-500 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                );
              })}
              <div style={{ width: 40, minWidth: 40, maxWidth: 40, borderRight: '1px solid #ccc' }} className="shrink-0" />
            </div>

            {/* Rows */}
            <Droppable droppableId="seasons-list">
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
            {filtered.map((season, idx) => (
              <Draggable key={season.id} draggableId={season.id} index={idx}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`flex transition-all ${snapshot.isDragging ? 'bg-blue-100 shadow-lg' : selected.has(season.id) ? 'bg-purple-100' : 'bg-white'}`}
                    style={{ borderBottom: '1px solid #ccc', ...provided.draggableProps.style }}
                  >
                    <div style={{ width: 40, minWidth: 40, maxWidth: 40, borderRight: '1px solid #ccc' }} className="flex items-center justify-center shrink-0 py-2">
                      <button onClick={() => toggleSelect(season.id)}>
                        {selected.has(season.id) ? <CheckSquare className="w-5 h-5" style={{ color: PURPLE }} /> : <Square className="w-5 h-5 text-gray-200" />}
                      </button>
                    </div>

                    {visibleCols.has('year') && (
                      <div style={{ width: getColWidth('year'), minWidth: getColWidth('year'), maxWidth: getColWidth('year'), borderRight: '1px solid #ccc', color: PURPLE_DARK }} className="px-2 py-2 shrink-0 font-bold text-sm overflow-hidden flex items-center">
                        <CellNumber value={season.year} onCommit={v => handleCellUpdate(season, 'year', v)} />
                      </div>
                    )}
                    {visibleCols.has('label') && (
                      <div style={{ width: getColWidth('label'), minWidth: getColWidth('label'), maxWidth: getColWidth('label'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                        <CellText value={season.label} onCommit={v => handleCellUpdate(season, 'label', v)} />
                      </div>
                    )}
                    {visibleCols.has('total_animals') && (
                      <div style={{ width: getColWidth('total_animals'), minWidth: getColWidth('total_animals'), maxWidth: getColWidth('total_animals'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                        <span className="text-sm">{season.total_animals || 0}</span>
                      </div>
                    )}
                    {visibleCols.has('notes') && (
                      <div style={{ width: getColWidth('notes'), minWidth: getColWidth('notes'), maxWidth: getColWidth('notes'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                        <CellText value={season.notes} onCommit={v => handleCellUpdate(season, 'notes', v)} />
                      </div>
                    )}

                    <div style={{ width: 40, minWidth: 40, maxWidth: 40, borderRight: '1px solid #ccc' }} className="flex items-center justify-center shrink-0">
                      <button onClick={() => setDeleteTarget(season)} className="p-1.5 hover:bg-gray-100">
                        <Trash2 className="w-4 h-4 text-red-300 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
          </DragDropContext>
        )}
      </div>

      {/* Modals */}
      {deleteTarget && (
        <DeleteConfirm year={deleteTarget.year} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
      {showAddModal && (
        <AddRowModal
          existingYears={seasons.map(s => s.year)}
          onSave={async (data) => { await createMutation.mutateAsync(data); setShowAddModal(false); }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}