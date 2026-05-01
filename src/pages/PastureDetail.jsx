import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInDays, format } from 'date-fns';
import { ArrowLeft, Edit2, ArrowRightLeft, Plus, MapPin, Droplets, Fence, Leaf, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PastureEditSheet from '@/components/pastures/PastureEditSheet';
import MoveAnimalsSheet from '@/components/pastures/MoveAnimalsSheet';
import AddNoteSheet from '@/components/pastures/AddNoteSheet';

const TODAY = new Date();

function getDaysLabel(pasture) {
  const hasAnimals = (pasture.current_herd_count ?? 0) > 0;
  if (hasAnimals && pasture.last_grazed_date) {
    const days = differenceInDays(TODAY, new Date(pasture.last_grazed_date));
    return { label: `${days} days with cows`, active: true };
  }
  const refDate = pasture.rest_start_date || pasture.last_grazed_date;
  if (refDate) {
    const days = differenceInDays(TODAY, new Date(refDate));
    return { label: `${days} days empty`, active: false };
  }
  return { label: 'No history', active: false };
}

function StatusBadge({ status }) {
  const map = {
    Active: { bg: 'rgba(25,118,210,0.8)', text: 'Active' },
    Inactive: { bg: 'rgba(255,255,255,0.12)', text: 'Inactive' },
  };
  const s = map[status] || map.Inactive;
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: s.bg }}>
      {s.text}
    </span>
  );
}

function InfoRow({ icon: IconComp, label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center gap-3 py-3 last:border-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
        <IconComp className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.8)' }} />
      </div>
      <span className="text-sm flex-1" style={{ color: 'rgba(255,255,255,0.8)' }}>{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

export default function PastureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showEdit, setShowEdit] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showNote, setShowNote] = useState(false);

  const { data: pasture, isLoading } = useQuery({
    queryKey: ['pasture', id],
    queryFn: async () => {
      const list = await base44.entities.Pastures.filter({ id });
      return list[0] || null;
    },
    enabled: !!id,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['movements', id],
    queryFn: () => base44.entities.AnimalMovements.filter({ pasture_id: id }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Pastures.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pasture', id] });
      queryClient.invalidateQueries({ queryKey: ['pastures'] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1e3a6e' }}>
        <div className="w-8 h-8 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!pasture) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#1e3a6e' }}>
        <p className="font-heading font-bold text-xl text-white">Pasture not found</p>
        <Button variant="outline" onClick={() => navigate('/pastures')}>Back to Pastures</Button>
      </div>
    );
  }

  const isActive = (pasture.current_herd_count ?? 0) > 0;
  const { label: daysLabel } = getDaysLabel(pasture);
  const sortedMovements = [...movements].sort((a, b) => new Date(b.move_date) - new Date(a.move_date));

  return (
    <div className="min-h-screen pb-32" style={{ background: '#1e3a6e' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 px-4 h-14 flex items-center justify-between"
        style={{ background: '#1e3a6e', borderBottom: '1px solid rgba(255,255,255,0.2)' }}
      >
        <button onClick={() => navigate('/pastures')} className="text-white/80 hover:text-white p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <p className="font-heading font-bold text-white text-lg truncate max-w-[60%] text-center">{pasture.pasture_name}</p>
        <button onClick={() => setShowEdit(true)} className="text-white/80 hover:text-white p-2 -mr-2">
          <Edit2 className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 pt-5 space-y-5 max-w-2xl mx-auto">

        {/* ── Current Status ─────────────────────────────────────── */}
        <div
          className="rounded-2xl p-5 text-white"
          style={{ background: isActive ? 'linear-gradient(135deg,#1e4d9a,#2563b8)' : 'linear-gradient(135deg,#1e3a6e,#243f7a)', border: isActive ? '1px solid rgba(100,160,255,0.5)' : '1px solid rgba(255,255,255,0.2)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <StatusBadge status={pasture.status} />
            <span className="text-white/80 text-sm font-medium">{daysLabel}</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="font-heading font-black text-6xl leading-none">{pasture.current_herd_count ?? 0}</span>
            <span className="font-heading font-bold text-xl mb-1 text-white/90">head</span>
          </div>
          {pasture.max_capacity && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Capacity</span>
                <span>{pasture.current_herd_count ?? 0} / {pasture.max_capacity}</span>
              </div>
              <div className="h-2 rounded-full bg-white/20">
                <div
                  className="h-2 rounded-full bg-white transition-all"
                  style={{ width: `${Math.min(100, ((pasture.current_herd_count ?? 0) / pasture.max_capacity) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Pasture Information ────────────────────────────────── */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)' }}>
          <h2 className="font-heading font-bold text-base text-white mb-1">Pasture Information</h2>
          <InfoRow icon={MapPin} label="Acreage" value={pasture.acreage ? `${pasture.acreage} acres` : null} />
          <InfoRow icon={Leaf} label="Grass Condition" value={pasture.grass_condition} />
          <InfoRow icon={Droplets} label="Water Status" value={pasture.water_status} />
          <InfoRow icon={Fence} label="Fence Status" value={pasture.fence_status} />
          <InfoRow icon={MapPin} label="Max Capacity" value={pasture.max_capacity ? `${pasture.max_capacity} head` : null} />
          {pasture.last_grazed_date && (
            <InfoRow icon={Leaf} label="Last Grazed" value={format(new Date(pasture.last_grazed_date), 'MMM d, yyyy')} />
          )}
        </div>

        {/* ── Notes ─────────────────────────────────────────────── */}
        {pasture.notes && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <h2 className="font-heading font-bold text-base text-white">Notes</h2>
            </div>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.55)' }}>{pasture.notes}</p>
          </div>
        )}

        {/* ── Pasture History ────────────────────────────────────── */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)' }}>
          <h2 className="font-heading font-bold text-base text-white mb-3">Movement History</h2>
          {sortedMovements.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.4)' }}>No movement history yet</p>
          ) : (
            <div className="space-y-2">
              {sortedMovements.map((m, i) => (
                <div key={m.id || i} className="flex items-start gap-3 py-2 last:border-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: '#1976d2' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">#{m.animal_number} → {m.to_location}</p>
                    {m.move_reason && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{m.move_reason}</p>}
                  </div>
                  <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {m.move_date ? format(new Date(m.move_date), 'MMM d, yy') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Map Placeholder ────────────────────────────────────── */}
        <div className="rounded-2xl p-6 flex flex-col items-center gap-2" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)' }}>
          <span className="text-4xl">🗺️</span>
          <p className="font-heading font-bold text-white">Pasture Map</p>
          <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>GPS boundary mapping coming soon</p>
        </div>

      </div>

      {/* ── Action Buttons ─────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-3 flex gap-3"
        style={{ background: 'linear-gradient(to top, #1e3a6e 70%, transparent)' }}
      >
        <button
          onClick={() => setShowMove(true)}
          className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-heading font-bold text-white shadow-lg active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #1565c0, #1976d2)', boxShadow: '0 4px 20px rgba(21,101,192,0.4)' }}
        >
          <ArrowRightLeft className="w-5 h-5" /> Move Animals
        </button>
        <button
          onClick={() => setShowNote(true)}
          className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)' }}
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* ── Sheets ─────────────────────────────────────────────────── */}
      <PastureEditSheet
        open={showEdit}
        onOpenChange={setShowEdit}
        pasture={pasture}
        onSave={(data) => updateMutation.mutateAsync(data).then(() => { toast.success('Pasture updated'); setShowEdit(false); })}
      />
      <MoveAnimalsSheet
        open={showMove}
        onOpenChange={setShowMove}
        pasture={pasture}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ['pasture', id] });
          queryClient.invalidateQueries({ queryKey: ['movements', id] });
          setShowMove(false);
        }}
      />
      <AddNoteSheet
        open={showNote}
        onOpenChange={setShowNote}
        pasture={pasture}
        onSave={(note) => {
          const existing = pasture.notes ? `${pasture.notes}\n` : '';
          return updateMutation.mutateAsync({ notes: `${existing}[${format(new Date(), 'MMM d, yyyy')}] ${note}` })
            .then(() => { toast.success('Note added'); setShowNote(false); });
        }}
      />
    </div>
  );
}