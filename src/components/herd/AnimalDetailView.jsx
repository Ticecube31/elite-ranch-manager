import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Edit2, Download, Archive, ChevronRight, Tag, MapPin, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import AnimalForm from '@/components/calving/AnimalForm';
import FamilyTree from '@/components/herd/FamilyTree';
import { logTagHistory } from '@/lib/tagHistoryLogger';
import { logAudit } from '@/lib/auditLogger';

const PURPLE = '#6B2D5E';
const PURPLE_DARK = '#4A1F40';
const PURPLE_BG = '#F9F4F8';
const PURPLE_LIGHT = '#F3E8F0';

const STATUS_STYLE = {
  Alive:   { bg: '#E8F5E9', color: '#2E7D32', label: '✅ Alive' },
  Sold:    { bg: '#E3F2FD', color: '#1565C0', label: '💰 Sold' },
  Died:    { bg: '#FFEBEE', color: '#C62828', label: '💀 Died' },
  Missing: { bg: '#FFF8E1', color: '#F57F17', label: '❓ Missing' },
};

// Lifecycle path per sex
const FEMALE_PATH = ['Calf - Heifer', '1st Calf Heifer', 'Cow'];
const MALE_PATH   = ['Calf - Steer', 'Bull'];

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-purple-50" style={{ background: PURPLE_LIGHT }}>
        {icon && <span className="text-base">{icon}</span>}
        <p className="font-heading font-bold text-sm uppercase tracking-wide" style={{ color: PURPLE_DARK }}>{title}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 font-semibold">{label}</span>
      <span className="text-sm font-bold text-right" style={accent ? { color: accent } : { color: '#1A1A1A' }}>{value || '—'}</span>
    </div>
  );
}

// ── Archive Confirm ───────────────────────────────────────────────────────────
function ArchiveConfirm({ tagNumber, onConfirm, onCancel }) {
  const [status, setStatus] = useState('Sold');
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 pb-0">
      <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          <h3 className="font-heading font-bold text-xl">Archive #{tagNumber}?</h3>
        </div>
        <p className="text-sm text-gray-500">This will mark the animal as inactive. Choose the reason:</p>
        <div className="grid grid-cols-2 gap-2">
          {['Sold', 'Died', 'Missing'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`h-12 rounded-xl border-2 font-bold text-sm transition-all ${status === s ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-400'}`}>
              {STATUS_STYLE[s]?.label || s}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-13 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600">Cancel</button>
          <button onClick={() => onConfirm(status)}
            className="flex-1 h-13 py-3 rounded-xl text-white font-bold"
            style={{ background: '#C62828' }}>
            Confirm Archive
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lifecycle Timeline ────────────────────────────────────────────────────────
function LifecycleTimeline({ animal }) {
  const path = animal.sex === 'Male' ? MALE_PATH : FEMALE_PATH;
  const currentIdx = path.indexOf(animal.animal_type);

  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
      {path.map((stage, i) => {
        const isPast    = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isFuture  = i > currentIdx;
        return (
          <React.Fragment key={stage}>
            <div className={`flex flex-col items-center shrink-0`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${
                isCurrent ? 'border-purple-600 text-white shadow-md' :
                isPast    ? 'border-green-500 bg-green-100 text-green-700' :
                            'border-gray-200 bg-gray-50 text-gray-300'
              }`}
              style={isCurrent ? { background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` } : {}}>
                {isPast ? '✓' : i + 1}
              </div>
              <p className={`text-xs font-semibold mt-1 text-center max-w-[64px] leading-tight ${
                isCurrent ? 'text-purple-700' : isPast ? 'text-green-600' : 'text-gray-300'
              }`}>{stage.replace('Calf - ', '').replace('1st Calf ', '1st ')}</p>
            </div>
            {i < path.length - 1 && (
              <div className={`flex-1 h-0.5 shrink-0 mx-1 ${isPast || isCurrent ? 'bg-green-300' : 'bg-gray-200'}`} style={{ minWidth: 12 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Export animal record as CSV ───────────────────────────────────────────────
function exportAnimalCSV(animal, tagHistory, calves, sortEvents, pastures) {
  const getPastureName = (pid) => pastures.find(p => p.id === pid)?.pasture_name || '';
  const lines = [
    ['Field', 'Value'],
    ['Tag Number', animal.tag_number],
    ['Sex', animal.sex],
    ['Animal Type', animal.animal_type],
    ['Status', animal.status],
    ['Mother Tag #', animal.mother_animal_number || ''],
    ['Date of Birth', animal.date_of_birth || ''],
    ['Birth Year', animal.birth_year || ''],
    ['Location', getPastureName(animal.pasture_id)],
    ['Notes', (animal.notes || '').replace(/,/g, ' ')],
    ['Created', animal.created_date ? format(new Date(animal.created_date), 'MM/dd/yyyy') : ''],
    [''],
    ['--- Tag History ---'],
    ['Date', 'Old Tag', 'New Tag', 'Changed By', 'Reason'],
    ...tagHistory.map(h => [
      h.change_date ? format(new Date(h.change_date), 'MM/dd/yyyy') : '',
      h.old_tag_number || '(original)',
      h.new_tag_number,
      h.changed_by || '',
      h.reason || '',
    ]),
    [''],
    ['--- Calves Produced ---'],
    ['Calf Tag #', 'Type', 'Date'],
    ...calves.map(c => [c.tag_number, c.animal_type, c.date_of_birth || '']),
    [''],
    ['--- Sort Events ---'],
    ['Session', 'Direction', 'Date'],
    ...sortEvents.map(e => [e.session, e.direction, e.date || '']),
  ];
  const csv = lines.map(r => Array.isArray(r) ? r.join(',') : r).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const el = document.createElement('a');
  el.href = url; el.download = `animal-${animal.tag_number}-record.csv`; el.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AnimalDetailView({ animalId, onNavigateToAnimal }) {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const photoRef = useRef();
  const queryClient = useQueryClient();

  const { data: animals = [] } = useQuery({ queryKey: ['animals'], queryFn: () => base44.entities.Animals.list('-created_date'), initialData: [] });
  const { data: pastures = [] } = useQuery({ queryKey: ['pastures'], queryFn: () => base44.entities.Pastures.list(), initialData: [] });
  const { data: seasons = [] } = useQuery({ queryKey: ['calving-seasons'], queryFn: () => base44.entities.CalvingSeasons.list('-year'), initialData: [] });
  const { data: sortingSessions = [] } = useQuery({ queryKey: ['sorting-sessions'], queryFn: () => base44.entities.SortingSessions.list('-created_date'), initialData: [] });
  const { data: tagHistory = [] } = useQuery({
    queryKey: ['tag-history', animalId],
    queryFn: () => base44.entities.TagHistory.filter({ animal_id: animalId }, '-change_date'),
    initialData: [],
    enabled: !!animalId,
  });

  const animal = animals.find(a => a.id === animalId);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Animals.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      toast.success('Animal updated!');
      setEditMode(false);
    },
    onError: (error) => {
      if (error?.message?.includes('not found')) {
        toast.error('Animal not found — it may have been deleted');
        navigate(-1);
      } else if (error?.message?.includes('Permission')) {
        toast.error('You do not have permission to update this animal');
      } else {
        toast.error('Failed to update animal');
      }
    },
  });

  const handleSave = async (formData) => {
    const { id, created_date, updated_date, created_by, ...data } = formData;
    if (data.tag_number && data.tag_number !== animal.tag_number) {
      logTagHistory({ animalId: animal.id, oldTagNumber: animal.tag_number, newTagNumber: data.tag_number, reason: 'Edit in Animal Detail View' });
      queryClient.invalidateQueries({ queryKey: ['tag-history', animalId] });
    }
    logAudit({ action: 'Updated', entityType: 'Animal', entityId: animal.id, entityLabel: `Animal #${data.tag_number}`, changeSummary: 'Record updated via Detail View', newValue: data });
    await updateMutation.mutateAsync({ id: animal.id, data });
  };

  const handleArchive = async (status) => {
    try {
      await updateMutation.mutateAsync({ id: animal.id, data: { status, is_archived: true } });
      logAudit({ action: 'Archived', entityType: 'Animal', entityId: animal.id, entityLabel: `Animal #${animal.tag_number}`, changeSummary: `Status changed to ${status}` });
      setShowArchiveConfirm(false);
      toast.success(`#${animal.tag_number} archived as ${status}`);
    } catch (error) {
      // Error handled by mutation's onError
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await updateMutation.mutateAsync({ id: animal.id, data: { photo_url: file_url } });
    } catch (error) {
      // Error handled by mutation's onError
    }
  };

  if (!animal) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: PURPLE_BG }}>
      <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: `${PURPLE}30`, borderTopColor: PURPLE }} />
    </div>
  );

  // Derived data
  const getPastureName = (pid) => pastures.find(p => p.id === pid)?.pasture_name || '—';
  const mother = animals.find(a => a.tag_number === animal.mother_animal_number);
  const calves = animals.filter(a => a.mother_id === animal.id || a.mother_animal_number === animal.tag_number);
  const statusStyle = STATUS_STYLE[animal.status] || STATUS_STYLE.Alive;

  // Sort events involving this animal
  const sortEvents = [];
  sortingSessions.forEach(ss => {
    const entry = ss.sorted_animals?.find(e => e.animal_number === animal.tag_number || e.tag_number === animal.tag_number);
    if (entry) sortEvents.push({ session: ss.session_name, direction: entry.direction, date: entry.timestamp || ss.session_date });
  });

  // Combined timeline of connected events
  const connectedEvents = [
    ...calves.map(c => ({ emoji: '🐣', label: `Produced calf #${c.tag_number} (${c.animal_type})`, date: c.date_of_birth || c.created_date, type: 'calf', id: c.id })),
    ...sortEvents.map(e => ({ emoji: '🔀', label: `Sorted ${e.direction} — "${e.session}"`, date: e.date, type: 'sort' })),
    ...(animal.notes || '').split('\n').filter(l => l.startsWith('Preg Check')).map(l => ({ emoji: '🤰', label: l, date: null, type: 'preg' })),
  ].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  // ── EDIT MODE ─────────────────────────────────────────────
  if (editMode) {
    return (
      <div className="min-h-screen" style={{ background: PURPLE_BG }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14" style={{ background: PURPLE_DARK }}>
          <button onClick={() => setEditMode(false)} className="text-white/80 hover:text-white p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-lg">Edit #{animal.tag_number}</h1>
          <div className="w-10" />
        </div>
        <div className="px-5 py-6 max-w-lg mx-auto">
          <AnimalForm animal={animal} onSave={handleSave} onCancel={() => setEditMode(false)} existingAnimals={animals} seasons={seasons} />
        </div>
      </div>
    );
  }

  // ── DETAIL MODE ───────────────────────────────────────────
  return (
    <div className="min-h-screen pb-36 flex flex-col" style={{ background: PURPLE_BG }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 shrink-0 flex items-center justify-between px-4 h-14" style={{ background: PURPLE_DARK }}>
        <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <p className="text-white/70 text-xs font-semibold">Animal Details</p>
          <p className="font-heading font-black text-white text-base leading-tight">#{animal.tag_number}</p>
        </div>
        <button onClick={() => setEditMode(true)} className="text-white font-bold text-sm px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
          Edit
        </button>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto w-full space-y-4">

        {/* ── Photo ──────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden bg-white border border-purple-100 shadow-sm">
          {animal.photo_url ? (
            <img src={animal.photo_url} alt={`#${animal.tag_number}`} className="w-full h-52 object-cover" />
          ) : (
            <div className="w-full h-44 flex flex-col items-center justify-center gap-2" style={{ background: PURPLE_LIGHT }}>
              <span className="text-6xl">{animal.sex === 'Male' ? '🐂' : '🐮'}</span>
              <p className="text-sm text-gray-400 font-semibold">No photo</p>
            </div>
          )}
          <button onClick={() => photoRef.current?.click()}
            className="absolute bottom-3 right-3 h-10 w-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: PURPLE_DARK }}>
            <Camera className="w-5 h-5 text-white" />
          </button>
          <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
        </div>

        {/* ── Status Banner ──────────────────────────────────── */}
        <div className="rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm" style={{ background: statusStyle.bg }}>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Current Status</p>
            <p className="font-heading font-black text-2xl mt-0.5" style={{ color: statusStyle.color }}>{statusStyle.label}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400">Tag #</p>
            <p className="font-heading font-black text-3xl" style={{ color: PURPLE_DARK }}>#{animal.tag_number}</p>
          </div>
        </div>

        {/* ── Basic Info ─────────────────────────────────────── */}
        <Section title="Basic Info" icon="📋">
          <InfoRow label="Sex" value={animal.sex === 'Male' ? '♂ Male' : '♀ Female'} accent={animal.sex === 'Male' ? '#1565C0' : '#C2185B'} />
          <InfoRow label="Animal Type" value={animal.animal_type} accent={PURPLE_DARK} />
          <InfoRow label="Birth Year" value={animal.birth_year || (animal.date_of_birth ? new Date(animal.date_of_birth).getFullYear() : null)} />
          <InfoRow label="Date Tagged" value={animal.date_of_birth ? format(new Date(animal.date_of_birth), 'MMMM d, yyyy') : null} />
          <InfoRow label="Location" value={getPastureName(animal.pasture_id)} />
          {animal.twin && <InfoRow label="Twin" value="👯 Yes — twin calf" accent="#7B1FA2" />}
          {animal.notes && (
            <div className="pt-2 mt-1">
              <p className="text-xs font-semibold text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{animal.notes}</p>
            </div>
          )}
        </Section>

        {/* ── Mother Link ────────────────────────────────────── */}
        <Section title="Mother" icon="🐮">
          {animal.mother_animal_number ? (
            mother ? (
              <button onClick={() => onNavigateToAnimal(mother.id)}
                className="w-full flex items-center justify-between py-2 rounded-xl hover:bg-purple-50 active:bg-purple-100 transition-colors px-1">
                <div className="flex items-center gap-3">
                  {mother.photo_url ? <img src={mother.photo_url} className="w-10 h-10 rounded-xl object-cover" alt="" /> : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: PURPLE_LIGHT }}>🐮</div>}
                  <div className="text-left">
                    <p className="font-heading font-bold text-base" style={{ color: PURPLE_DARK }}>#{mother.tag_number}</p>
                    <p className="text-xs text-gray-400">{mother.animal_type} · {mother.status}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            ) : (
              <p className="text-sm text-gray-500">Mother Tag # <span className="font-bold text-gray-800">#{animal.mother_animal_number}</span> — not found in records</p>
            )
          ) : (
            <p className="text-sm text-gray-400 italic">No mother recorded</p>
          )}
        </Section>

        {/* ── Tag Number History ─────────────────────────────── */}
        <Section title="Tag Number History" icon="🏷️">
          {tagHistory.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-sm text-gray-400">Original tag — no changes recorded</p>
              <p className="text-xs text-gray-300 mt-0.5">Current tag: <span className="font-bold">#{animal.tag_number}</span></p>
            </div>
          ) : (
            <div className="space-y-3">
              {tagHistory.map((h, i) => (
                <div key={h.id || i} className="rounded-xl p-3 border border-purple-50" style={{ background: i === 0 ? '#FFF8E1' : PURPLE_LIGHT }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-400">
                      {h.change_date ? format(new Date(h.change_date), 'MMM d, yyyy · h:mm a') : 'Unknown date'}
                    </span>
                    {i === 0 && <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Latest</span>}
                  </div>
                  <div className="flex items-center gap-2 text-base font-black" style={{ color: PURPLE_DARK }}>
                    <span className="line-through text-gray-400">{h.old_tag_number || '(original)'}</span>
                    <span className="text-gray-300">→</span>
                    <span>#{h.new_tag_number}</span>
                  </div>
                  {h.reason && <p className="text-xs text-gray-500 mt-1">{h.reason}</p>}
                  {h.changed_by && <p className="text-xs text-gray-400 mt-0.5">by {h.changed_by}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Family Tree ────────────────────────────────────── */}
        <FamilyTree animal={animal} animals={animals} onNavigateToAnimal={onNavigateToAnimal} />

        {/* ── Lifecycle Timeline ─────────────────────────────── */}
        <Section title="Lifecycle" icon="📈">
          <LifecycleTimeline animal={animal} />
        </Section>

        {/* ── Connected Events ───────────────────────────────── */}
        {connectedEvents.length > 0 && (
          <Section title="Connected Events" icon="🔗">
            <div className="space-y-2">
              {connectedEvents.slice(0, 8).map((ev, i) => (
                <button
                  key={i}
                  onClick={() => ev.type === 'calf' && ev.id && onNavigateToAnimal(ev.id)}
                  className={`w-full flex items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${ev.type === 'calf' ? 'hover:bg-purple-50 active:bg-purple-100' : ''}`}
                  style={{ background: i % 2 === 0 ? PURPLE_LIGHT : '#FFF' }}>
                  <span className="text-xl shrink-0 mt-0.5">{ev.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{ev.label}</p>
                    {ev.date && <p className="text-xs text-gray-400 mt-0.5">{format(new Date(ev.date), 'MMM d, yyyy')}</p>}
                  </div>
                  {ev.type === 'calf' && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Spacer for bottom bar */}
        <div className="h-4" />
      </div>

      {/* ── Bottom Action Bar ────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-2 bg-white border-t border-purple-100 shadow-2xl">
        <div className="max-w-lg mx-auto flex gap-2">
          <button onClick={() => setEditMode(true)}
            className="flex-1 h-14 rounded-2xl text-white font-bold text-base shadow-md flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}>
            <Edit2 className="w-5 h-5" /> Edit Animal
          </button>
          <button onClick={() => exportAnimalCSV(animal, tagHistory, calves, sortEvents, pastures)}
            className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-md border-2 border-green-500 bg-green-50"
            title="Export Full Record">
            <Download className="w-5 h-5 text-green-700" />
          </button>
          {animal.status === 'Alive' && (
            <button onClick={() => setShowArchiveConfirm(true)}
              className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-md border-2 border-red-200 bg-red-50"
              title="Archive / Mark as Sold">
              <Archive className="w-5 h-5 text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* ── Archive Confirm ──────────────────────────────────── */}
      {showArchiveConfirm && (
        <ArchiveConfirm tagNumber={animal.tag_number} onConfirm={handleArchive} onCancel={() => setShowArchiveConfirm(false)} />
      )}
    </div>
  );
}