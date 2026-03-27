import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Download, Upload, Search, X, ChevronUp, ChevronDown,
  Trash2, CheckSquare, Square, Camera, AlertTriangle, ExternalLink
} from 'lucide-react';
import AnimalDetailView from '@/components/herd/AnimalDetailView';
import ImportWizard from '@/components/herd/ImportWizard';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { logTagHistory } from '@/lib/tagHistoryLogger';

const PURPLE = '#6B2D5E';
const PURPLE_DARK = '#4A1F40';
const PURPLE_BG = '#F9F4F8';
const PURPLE_LIGHT = '#F3E8F0';

const ANIMAL_TYPES = ['Cow', '1st Calf Heifer', 'Calf - Heifer', 'Bull', 'Calf - Steer'];
const STATUSES = ['Alive', 'Sold', 'Died', 'Missing'];

const SEX_FOR_TYPE = {
  'Cow': 'Female', '1st Calf Heifer': 'Female', 'Calf - Heifer': 'Female',
  'Bull': 'Male', 'Calf - Steer': 'Male',
};

// ── Inline cell editors ───────────────────────────────────────────────────────

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

function CellSelect({ value, options, onCommit }) {
  const [editing, setEditing] = useState(false);
  if (editing) return (
    <select
      autoFocus
      value={value || ''}
      onChange={e => { onCommit(e.target.value); setEditing(false); }}
      onBlur={() => setEditing(false)}
      className="w-full h-8 px-1 text-sm border border-purple-400 rounded outline-none bg-white"
    >
      <option value="">—</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  return (
    <button onClick={() => setEditing(true)}
      className="w-full text-left text-sm whitespace-normal px-1 py-1 rounded hover:bg-purple-50 active:bg-purple-100 overflow-hidden">
      {value || <span className="text-gray-300">—</span>}
    </button>
  );
}

function CellDate({ value, onCommit }) {
  const [editing, setEditing] = useState(false);
  if (editing) return (
    <input
      autoFocus
      type="date"
      defaultValue={value || ''}
      onBlur={e => { setEditing(false); onCommit(e.target.value); }}
      onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
      className="w-full h-8 px-1 text-sm border border-purple-400 rounded outline-none bg-white"
    />
  );
  return (
    <button onClick={() => setEditing(true)}
      className="w-full text-left text-sm truncate px-1 py-1 rounded hover:bg-purple-50 active:bg-purple-100 min-h-[32px]">
      {value ? format(new Date(value), 'MM/dd/yy') : <span className="text-gray-300">—</span>}
    </button>
  );
}

function CellPhoto({ value, onCommit }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onCommit(file_url);
    setUploading(false);
  };
  return (
    <div className="flex items-center justify-center">
      <button onClick={() => inputRef.current?.click()} className="relative">
        {value ? (
          <img src={value} alt="" className="w-8 h-8 rounded object-cover border border-purple-200" />
        ) : (
          <div className="w-8 h-8 rounded flex items-center justify-center bg-purple-50 border border-purple-100">
            <Camera className="w-4 h-4" style={{ color: PURPLE }} />
          </div>
        )}
        {uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded"><div className="w-4 h-4 border-2 border-t-purple-600 rounded-full animate-spin" /></div>}
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />
    </div>
  );
}

// ── Delete confirmation ───────────────────────────────────────────────────────

function DeleteConfirm({ tagNumber, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h3 className="font-heading font-bold text-lg">Delete #{tagNumber}?</h3>
        </div>
        <p className="text-sm text-gray-500 mb-6">This will permanently remove this animal record. This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-12 rounded-xl border-2 border-gray-200 font-semibold text-gray-600">Cancel</button>
          <button onClick={onConfirm} className="flex-1 h-12 rounded-xl bg-red-500 text-white font-bold">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Action Bar ───────────────────────────────────────────────────────────

function BulkBar({ count, pastures, onChangeStatus, onChangeLocation, onExport, onClear }) {
  const [showStatus, setShowStatus] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2">
      <div className="rounded-2xl shadow-2xl p-3 flex flex-col gap-2" style={{ background: PURPLE_DARK }}>
        <div className="flex items-center justify-between">
          <span className="text-white font-bold text-sm">{count} selected</span>
          <button onClick={onClear} className="text-white/70 text-sm">Clear</button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowStatus(v => !v)} className="flex-1 h-10 rounded-xl bg-white/20 text-white text-sm font-semibold min-w-[100px]">Change Status</button>
          <button onClick={() => setShowLocation(v => !v)} className="flex-1 h-10 rounded-xl bg-white/20 text-white text-sm font-semibold min-w-[100px]">Change Location</button>
          <button onClick={onExport} className="flex-1 h-10 rounded-xl bg-white/20 text-white text-sm font-semibold min-w-[80px]">Export</button>
        </div>
        {showStatus && (
          <div className="grid grid-cols-4 gap-1">
            {STATUSES.map(s => (
              <button key={s} onClick={() => { onChangeStatus(s); setShowStatus(false); }}
                className="h-9 rounded-lg bg-white text-xs font-bold" style={{ color: PURPLE_DARK }}>{s}</button>
            ))}
          </div>
        )}
        {showLocation && (
          <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
            {pastures.map(p => (
              <button key={p.id} onClick={() => { onChangeLocation(p.id, p.pasture_name); setShowLocation(false); }}
                className="h-9 rounded-lg bg-white text-xs font-bold text-left px-2" style={{ color: PURPLE_DARK }}>{p.pasture_name}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Row Modal ─────────────────────────────────────────────────────────────

function AddRowModal({ pastures, seasons, existingAnimals, onSave, onClose, currentUser }) {
  const [form, setForm] = useState({ tag_number: '', sex: '', animal_type: '', status: 'Alive', date_of_birth: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.tag_number.trim()) { toast.error('Tag number required'); return; }
    if (!form.sex) { toast.error('Sex required'); return; }
    if (!form.animal_type) { toast.error('Animal type required'); return; }
    const dup = existingAnimals.find(a => a.tag_number === form.tag_number.trim());
    if (dup) { toast.error(`Tag #${form.tag_number} already exists`); return; }
    setSaving(true);
    const birthYear = form.date_of_birth ? new Date(form.date_of_birth).getFullYear() : undefined;
    const season = seasons.find(s => s.year === birthYear);
    await onSave({ ...form, tag_number: form.tag_number.trim(), birth_year: birthYear, calving_season_id: season?.id || '', is_archived: false });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-0 pb-0">
      <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-xl" style={{ color: PURPLE_DARK }}>Add New Animal</h3>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Tag # *</label>
            <Input value={form.tag_number} onChange={e => upd('tag_number', e.target.value)} className="h-12 text-lg mt-1" placeholder="e.g. 142" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Sex *</label>
            <div className="flex gap-2 mt-1">
              {['Male', 'Female'].map(s => (
                <button key={s} type="button" onClick={() => { upd('sex', s); upd('animal_type', ''); }}
                  className={`flex-1 h-12 rounded-xl border-2 font-bold text-sm transition-all ${form.sex === s ? (s === 'Male' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-pink-500 bg-pink-50 text-pink-700') : 'border-gray-200 text-gray-400'}`}>
                  {s === 'Male' ? '♂' : '♀'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Animal Type *</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {(form.sex ? ANIMAL_TYPES.filter(t => SEX_FOR_TYPE[t] === form.sex) : ANIMAL_TYPES).map(t => (
              <button key={t} type="button" onClick={() => upd('animal_type', t)}
                className={`h-10 rounded-xl border-2 font-semibold text-xs transition-all ${form.animal_type === t ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-400'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Date Tagged</label>
            <Input type="date" value={form.date_of_birth} onChange={e => upd('date_of_birth', e.target.value)} className="h-12 mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Status</label>
            <select value={form.status} onChange={e => upd('status', e.target.value)}
              className="w-full h-12 mt-1 rounded-xl border border-gray-200 px-3 text-sm">
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Mother Tag # (optional)</label>
          <Input value={form.mother_animal_number || ''} onChange={e => upd('mother_animal_number', e.target.value)} className="h-12 mt-1" placeholder="Mother's tag number" />
        </div>
        {pastures.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-gray-500">Location</label>
            <select value={form.pasture_id || ''} onChange={e => upd('pasture_id', e.target.value)}
              className="w-full h-12 mt-1 rounded-xl border border-gray-200 px-3 text-sm">
              <option value="">— No location —</option>
              {pastures.map(p => <option key={p.id} value={p.id}>{p.pasture_name}</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-13 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-13 py-3 rounded-xl text-white font-bold text-base"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}>
            {saving ? 'Saving...' : 'Add Animal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MasterSpreadsheet({ onBack, currentUser }) {
  const [search, setSearch] = useState('');
  const [filterChip, setFilterChip] = useState('All');
  const [sortCol, setSortCol] = useState('tag_number');
  const [sortDir, setSortDir] = useState('asc');
  const [selected, setSelected] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [detailAnimalId, setDetailAnimalId] = useState(null);
  const [colWidths, setColWidths] = useState({});
  const [visibleCols, setVisibleCols] = useState(new Set(['tag_number', 'sex', 'animal_type', 'mother_animal_number', 'date_of_birth', 'status', 'pasture_id', 'notes']));
  const [showColMenu, setShowColMenu] = useState(false);
  const [resizing, setResizing] = useState(null);
  const importRef = useRef();

  const queryClient = useQueryClient();

  const { data: animals = [], isLoading } = useQuery({
    queryKey: ['animals'],
    queryFn: () => base44.entities.Animals.list('-created_date'),
    initialData: [],
  });
  const { data: pastures = [] } = useQuery({
    queryKey: ['pastures'],
    queryFn: () => base44.entities.Pastures.list(),
    initialData: [],
  });
  const { data: seasons = [] } = useQuery({
    queryKey: ['calving-seasons'],
    queryFn: () => base44.entities.CalvingSeasons.list('-year'),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Animals.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['animals'] }),
  });
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Animals.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['animals'] }); toast.success('Animal added!'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Animals.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['animals'] }); toast.success('Animal deleted'); },
  });

  const getPastureName = (pid) => pastures.find(p => p.id === pid)?.pasture_name || '';

  const handleCellUpdate = async (animal, field, newValue) => {
    if (newValue === animal[field]) return;
    const data = { [field]: newValue };
    // Derive sex from animal_type
    if (field === 'animal_type' && SEX_FOR_TYPE[newValue]) {
      data.sex = SEX_FOR_TYPE[newValue];
    }
    // Log tag change
    if (field === 'tag_number' && newValue !== animal.tag_number) {
      logTagHistory({ animalId: animal.id, oldTagNumber: animal.tag_number, newTagNumber: newValue, reason: 'Edit in Master Spreadsheet', user: currentUser });
      queryClient.invalidateQueries({ queryKey: ['tag-history'] });
    }
    await updateMutation.mutateAsync({ id: animal.id, data });
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    setSelected(prev => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
  };

  const handleBulkStatus = async (status) => {
    for (const id of selected) {
      await updateMutation.mutateAsync({ id, data: { status, is_archived: ['Sold', 'Died'].includes(status) } });
    }
    toast.success(`${selected.size} animals updated to ${status}`);
    setSelected(new Set());
  };

  const handleBulkLocation = async (pastureId) => {
    for (const id of selected) {
      await updateMutation.mutateAsync({ id, data: { pasture_id: pastureId } });
    }
    toast.success(`${selected.size} animals moved`);
    setSelected(new Set());
  };

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(a => a.id)));

  const FILTER_CHIPS = ['All', 'Cows', '1st Calf Heifers', 'Calf - Heifer', 'Calf - Steer', 'Bulls', 'Alive', 'Sold', 'Died'];

  const chipMatch = (a) => {
    if (filterChip === 'All') return true;
    if (filterChip === 'Cows') return a.animal_type === 'Cow';
    if (filterChip === '1st Calf Heifers') return a.animal_type === '1st Calf Heifer';
    if (filterChip === 'Calf - Heifer') return a.animal_type === 'Calf - Heifer';
    if (filterChip === 'Calf - Steer') return a.animal_type === 'Calf - Steer';
    if (filterChip === 'Bulls') return a.animal_type === 'Bull';
    return a.status === filterChip;
  };

  const filtered = useMemo(() => {
    let list = animals.filter(a => {
      const q = search.toLowerCase();
      return !q || [a.tag_number, a.sex, a.animal_type, a.mother_animal_number, a.status, getPastureName(a.pasture_id), a.notes]
        .some(v => v?.toString().toLowerCase().includes(q));
    }).filter(chipMatch);

    list = [...list].sort((a, b) => {
      let va = a[sortCol] || '';
      let vb = b[sortCol] || '';
      if (sortCol === 'pasture_id') { va = getPastureName(a.pasture_id); vb = getPastureName(b.pasture_id); }
      const cmp = va.toString().localeCompare(vb.toString());
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [animals, search, filterChip, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  // ── Detail view ───────────────────────────────────────────
  if (detailAnimalId) {
    return (
      <AnimalDetailView
        animalId={detailAnimalId}
        onBack={() => setDetailAnimalId(null)}
        onNavigateToAnimal={(id) => setDetailAnimalId(id)}
        currentUser={currentUser}
      />
    );
  }

  const SortIcon = ({ col }) => sortCol === col
    ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)
    : <span className="w-3 h-3 inline-block" />;

  // ── Export CSV ────────────────────────────────────────────
  const exportCSV = (rows) => {
    const headers = ['Tag #', 'Sex', 'Type', 'Mother Tag #', 'Date Tagged', 'Status', 'Location', 'Notes', 'Created'];
    const data = rows.map(a => [
      a.tag_number, a.sex, a.animal_type, a.mother_animal_number || '',
      a.date_of_birth || '', a.status, getPastureName(a.pasture_id),
      (a.notes || '').replace(/,/g, ' '),
      a.created_date ? format(new Date(a.created_date), 'MM/dd/yyyy') : '',
    ]);
    const csv = [headers, ...data].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url; el.download = 'animals-export.csv'; el.click();
    URL.revokeObjectURL(url);
  };



  const DEFAULT_WIDTHS = {
    tag_number: 100, sex: 70, animal_type: 140, mother_animal_number: 120,
    date_of_birth: 130, birth_year: 100, status: 100, pasture_id: 150, born_pasture_id: 150,
    twin: 70, notes: 250, photo_url: 44, is_archived: 100, created_date: 110,
  };

  const COLS = [
    { key: 'tag_number', label: 'Tag #' },
    { key: 'sex', label: 'Sex' },
    { key: 'animal_type', label: 'Type' },
    { key: 'mother_animal_number', label: 'Mother #' },
    { key: 'date_of_birth', label: 'Date Tagged' },
    { key: 'birth_year', label: 'Birth Year' },
    { key: 'status', label: 'Status' },
    { key: 'pasture_id', label: 'Location' },
    { key: 'born_pasture_id', label: 'Born Pasture' },
    { key: 'twin', label: 'Twin' },
    { key: 'notes', label: 'Notes' },
    { key: 'photo_url', label: '📷' },
    { key: 'is_archived', label: 'Archived' },
    { key: 'created_date', label: 'Created' },
  ];

  const getColWidth = (key) => colWidths[key] || DEFAULT_WIDTHS[key] || 80;

  const handleColResize = (key, newWidth) => {
    setColWidths(prev => ({ ...prev, [key]: Math.max(50, newWidth) }));
  };

  const toggleColVisibility = (key) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const statusBadgeColor = (s) => {
    if (s === 'Alive') return 'bg-emerald-100 text-emerald-700';
    if (s === 'Sold') return 'bg-blue-100 text-blue-700';
    if (s === 'Died') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: PURPLE_BG }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 shrink-0" style={{ background: PURPLE_DARK }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={onBack} className="text-white/80 hover:text-white p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-xl">Master Spreadsheet</h1>
          <div className="flex gap-1">
            <button onClick={() => exportCSV(filtered)} title="Export CSV"
              className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <Download className="w-4 h-4 text-white" />
            </button>
            <button onClick={() => setShowImportWizard(true)} title="Import CSV/Excel"
              className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <Upload className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Entity type selector */}
        <div className="px-4 pb-2 flex gap-2">
          <div className="h-9 px-4 rounded-xl text-sm font-bold flex items-center" style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}>
            🐄 Animals
          </div>
          {['Pastures', 'Calving Seasons', 'Sorting Sessions', 'Tag History'].map(e => (
            <div key={e} className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center text-white/40 border border-white/10 whitespace-nowrap">
              {e}
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search any field..."
              className="w-full h-11 pl-9 pr-9 rounded-xl text-sm bg-white border-0 outline-none"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {FILTER_CHIPS.map(c => (
            <button key={c} onClick={() => setFilterChip(c)}
              className={`shrink-0 h-8 px-3 rounded-full text-xs font-bold transition-all ${filterChip === c ? 'text-white shadow' : 'bg-white/20 text-white/70'}`}
              style={filterChip === c ? { background: '#C2185B' } : {}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Count + Add ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <p className="text-xs font-semibold text-gray-400">{filtered.length} animals{selected.size > 0 ? ` · ${selected.size} selected` : ''}</p>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <button
              onClick={() => setShowColMenu(!showColMenu)}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold hover:bg-gray-100 border border-gray-200"
              title="Show/hide columns"
            >
              ⚙️
            </button>
            {showColMenu && (
              <div className="absolute top-10 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 w-48">
                {COLS.map(col => (
                  <label key={col.key} className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-50 rounded text-xs">
                    <input
                      type="checkbox"
                      checked={visibleCols.has(col.key)}
                      onChange={() => toggleColVisibility(col.key)}
                      className="w-4 h-4 rounded"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-white text-sm font-bold shadow-md"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}>
            <Plus className="w-4 h-4" /> Add Row
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-2 pb-32">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: `${PURPLE}30`, borderTopColor: PURPLE }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🐄</p>
            <p className="font-semibold text-gray-600">No animals found</p>
            <p className="text-sm mt-1">Try clearing filters or adding a new animal.</p>
          </div>
        ) : (
          <div className="overflow-hidden bg-white border border-gray-300">
            {/* Column headers */}
            <div className="flex items-center bg-gray-50 sticky top-0 z-10" style={{ borderBottom: '2px solid #999' }}>
              {/* Select-all checkbox */}
              <div style={{ width: 40, minWidth: 40, maxWidth: 40, borderRight: '1px solid #ccc' }} className="flex items-center justify-center px-2 py-3 shrink-0">
                <button onClick={toggleAll}>
                  {selected.size === filtered.length && filtered.length > 0
                    ? <CheckSquare className="w-5 h-5" style={{ color: PURPLE }} />
                    : <Square className="w-5 h-5 text-gray-300" />}
                </button>
              </div>



              {COLS.map(col => {
                if (!visibleCols.has(col.key)) return null;
                const width = getColWidth(col.key);
                return (
                  <div
                    key={col.key}
                    style={{ width, minWidth: width, maxWidth: width, borderRight: '1px solid #ccc' }}
                    className="relative shrink-0 group flex items-center"
                  >
                    <button
                      onClick={() => col.key !== 'photo_url' && col.key !== 'created_date' && handleSort(col.key)}
                      className={`w-full text-left text-xs font-bold px-2 py-3 uppercase tracking-wide overflow-hidden ${col.key !== 'photo_url' && col.key !== 'created_date' ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'}`}
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
            {filtered.map((animal, idx) => (
              <div
                key={animal.id}
                className={`flex transition-colors ${selected.has(animal.id) ? 'bg-purple-100' : 'bg-white'}`}
                style={{ borderBottom: '1px solid #ccc' }}
              >
                {/* Checkbox */}
                <div style={{ width: 40, minWidth: 40, maxWidth: 40, borderRight: '1px solid #ccc' }} className="flex items-center justify-center shrink-0 py-2">
                  <button onClick={() => toggleSelect(animal.id)}>
                    {selected.has(animal.id)
                      ? <CheckSquare className="w-5 h-5" style={{ color: PURPLE }} />
                      : <Square className="w-5 h-5 text-gray-200" />}
                  </button>
                </div>

                {/* Dynamic cells */}
                {visibleCols.has('tag_number') && (
                  <div style={{ width: getColWidth('tag_number'), minWidth: getColWidth('tag_number'), maxWidth: getColWidth('tag_number'), borderRight: '1px solid #ccc', color: PURPLE_DARK }} className="px-2 py-2 shrink-0 font-bold text-sm overflow-hidden flex items-center">
                    <CellText value={animal.tag_number} onCommit={v => handleCellUpdate(animal, 'tag_number', v)} />
                  </div>
                )}
                {visibleCols.has('sex') && (
                  <div style={{ width: getColWidth('sex'), minWidth: getColWidth('sex'), maxWidth: getColWidth('sex'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                    <CellSelect value={animal.sex} options={['Male', 'Female']} onCommit={v => handleCellUpdate(animal, 'sex', v)} />
                  </div>
                )}
                {visibleCols.has('animal_type') && (
                  <div style={{ width: getColWidth('animal_type'), minWidth: getColWidth('animal_type'), maxWidth: getColWidth('animal_type'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                    <CellSelect value={animal.animal_type} options={ANIMAL_TYPES} onCommit={v => handleCellUpdate(animal, 'animal_type', v)} />
                  </div>
                )}
                {visibleCols.has('mother_animal_number') && (
                  <div style={{ width: getColWidth('mother_animal_number'), minWidth: getColWidth('mother_animal_number'), maxWidth: getColWidth('mother_animal_number'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                    <CellText value={animal.mother_animal_number} onCommit={v => handleCellUpdate(animal, 'mother_animal_number', v)} placeholder="—" />
                  </div>
                )}
                {visibleCols.has('date_of_birth') && (
                  <div style={{ width: getColWidth('date_of_birth'), minWidth: getColWidth('date_of_birth'), maxWidth: getColWidth('date_of_birth'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                    <CellDate value={animal.date_of_birth} onCommit={v => handleCellUpdate(animal, 'date_of_birth', v)} />
                  </div>
                )}
                {visibleCols.has('birth_year') && (
                  <div style={{ width: getColWidth('birth_year'), minWidth: getColWidth('birth_year'), maxWidth: getColWidth('birth_year'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                    <span className="text-sm">{animal.birth_year || '—'}</span>
                  </div>
                )}
                {visibleCols.has('status') && (
                  <div style={{ width: getColWidth('status'), minWidth: getColWidth('status'), maxWidth: getColWidth('status'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${statusBadgeColor(animal.status)}`}>
                      <CellSelect value={animal.status} options={STATUSES} onCommit={v => handleCellUpdate(animal, 'status', v)} />
                    </div>
                  </div>
                )}
                {visibleCols.has('pasture_id') && (
                  <div style={{ width: getColWidth('pasture_id'), minWidth: getColWidth('pasture_id'), maxWidth: getColWidth('pasture_id'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                    <CellSelect
                      value={getPastureName(animal.pasture_id)}
                      options={pastures.map(p => p.pasture_name)}
                      onCommit={v => {
                        const p = pastures.find(p => p.pasture_name === v);
                        handleCellUpdate(animal, 'pasture_id', p?.id || '');
                      }}
                    />
                  </div>
                )}
                {visibleCols.has('born_pasture_id') && (
                  <div style={{ width: getColWidth('born_pasture_id'), minWidth: getColWidth('born_pasture_id'), maxWidth: getColWidth('born_pasture_id'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                    <span className="text-sm">{getPastureName(animal.born_pasture_id) || '—'}</span>
                  </div>
                )}
                {visibleCols.has('twin') && (
                  <div style={{ width: getColWidth('twin'), minWidth: getColWidth('twin'), maxWidth: getColWidth('twin'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                    <span className="text-sm">{animal.twin ? '✓' : '—'}</span>
                  </div>
                )}
                {visibleCols.has('notes') && (
                  <div style={{ width: getColWidth('notes'), minWidth: getColWidth('notes'), maxWidth: getColWidth('notes'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                    <CellText value={animal.notes} onCommit={v => handleCellUpdate(animal, 'notes', v)} placeholder="—" />
                  </div>
                )}
                {visibleCols.has('photo_url') && (
                  <div style={{ width: getColWidth('photo_url'), minWidth: getColWidth('photo_url'), maxWidth: getColWidth('photo_url'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 flex items-center justify-center overflow-hidden">
                    <CellPhoto value={animal.photo_url} onCommit={v => handleCellUpdate(animal, 'photo_url', v)} />
                  </div>
                )}
                {visibleCols.has('is_archived') && (
                  <div style={{ width: getColWidth('is_archived'), minWidth: getColWidth('is_archived'), maxWidth: getColWidth('is_archived'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-sm overflow-hidden flex items-center">
                    <span className="text-sm">{animal.is_archived ? '✓' : '—'}</span>
                  </div>
                )}
                {visibleCols.has('created_date') && (
                  <div style={{ width: getColWidth('created_date'), minWidth: getColWidth('created_date'), maxWidth: getColWidth('created_date'), borderRight: '1px solid #ccc' }} className="px-2 py-2 shrink-0 text-xs text-gray-400 overflow-hidden flex items-center">
                    {animal.created_date ? format(new Date(animal.created_date), 'MM/dd/yy') : '—'}
                  </div>
                )}
                {/* View detail */}
                <div style={{ width: 32, minWidth: 32, maxWidth: 32, borderRight: '1px solid #ccc' }} className="flex items-center justify-center shrink-0">
                  <button onClick={() => setDetailAnimalId(animal.id)} className="p-1.5 hover:bg-gray-100" title="View Details">
                    <ExternalLink className="w-4 h-4" style={{ color: PURPLE }} />
                  </button>
                </div>
                {/* Delete */}
                <div style={{ width: 40, minWidth: 40, maxWidth: 40, borderRight: '1px solid #ccc' }} className="flex items-center justify-center shrink-0">
                  <button onClick={() => setDeleteTarget(animal)} className="p-1.5 hover:bg-gray-100">
                    <Trash2 className="w-4 h-4 text-red-300 hover:text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bulk Action Bar ──────────────────────────────────── */}
      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          pastures={pastures}
          onChangeStatus={handleBulkStatus}
          onChangeLocation={handleBulkLocation}
          onExport={() => exportCSV(animals.filter(a => selected.has(a.id)))}
          onClear={() => setSelected(new Set())}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteConfirm tagNumber={deleteTarget.tag_number} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
      {showAddModal && (
        <AddRowModal
          pastures={pastures}
          seasons={seasons}
          existingAnimals={animals}
          currentUser={currentUser}
          onSave={async (data) => { await createMutation.mutateAsync(data); setShowAddModal(false); }}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {showImportWizard && (
        <ImportWizard
          onClose={() => setShowImportWizard(false)}
          onSuccess={() => setShowImportWizard(false)}
        />
      )}
    </div>
  );
}