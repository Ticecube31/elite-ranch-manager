import React, { useState } from 'react';
import { Delete } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function MoveCowsSheet({ open, onOpenChange, pastures }) {
  const queryClient = useQueryClient();
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [count, setCount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [countFocused, setCountFocused] = useState(false);

  const fromPasture = pastures.find(p => p.id === fromId);
  const toPasture = pastures.find(p => p.id === toId);

  const maxCount = fromPasture ? (fromPasture.current_herd_count ?? 0) : undefined;

  const reset = () => {
    setFromId(''); setToId(''); setCount(''); setNotes('');
  };

  const handleSave = async () => {
    if (!toId || !count || parseInt(count) < 1) return;
    setSaving(true);
    try {
      const moveCount = parseInt(count);
      const today = new Date().toISOString().split('T')[0];

      // Update from pasture if selected
      if (fromPasture) {
        const newFromCount = Math.max(0, (fromPasture.current_herd_count ?? 0) - moveCount);
        await base44.entities.Pastures.update(fromId, {
          current_herd_count: newFromCount,
          status: newFromCount > 0 ? 'Active' : 'Inactive',
        });
      }

      // Update to pasture
      const newToCount = (toPasture.current_herd_count ?? 0) + moveCount;
      await base44.entities.Pastures.update(toId, {
        current_herd_count: newToCount,
        status: 'Active',
        last_grazed_date: today,
      });

      // Log the movement
      await base44.entities.AnimalMovements.create({
        animal_number: `${moveCount} head`,
        from_location: fromPasture?.pasture_name || 'Unknown',
        to_location: toPasture.pasture_name,
        pasture_id: toId,
        move_date: today,
        move_reason: 'Rotation',
        notes: notes || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['pastures'] });
      toast.success(`Moved ${moveCount} head to ${toPasture.pasture_name}`);
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const canSave = toId && count && parseInt(count) >= 1 && toId !== fromId && toId !== fromId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl pb-10">
        <SheetHeader className="mb-5">
          <SheetTitle className="font-heading text-xl">Move Cows</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-1">

          {/* Count — Numeric Keypad */}
          <div>
            <Label className="text-sm font-semibold">Number of Head *</Label>
            {/* Display */}
            <div 
              className="mt-1 h-14 rounded-xl border-2 border-gray-200 bg-gray-50 flex items-center justify-between px-4 cursor-text"
              onClick={() => setCountFocused(true)}
            >
              <span className={`font-heading font-black text-2xl ${count ? 'text-gray-900' : 'text-gray-300'}`}>
                {count || '0'}
              </span>
              {fromPasture && (
                <span className="text-xs text-gray-400">{fromPasture.pasture_name}: {fromPasture.current_herd_count ?? 0} head</span>
              )}
            </div>
            {/* Keypad — only visible when focused */}
            {countFocused && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {['1','2','3','4','5','6','7','8','9'].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(prev => prev === '0' ? n : (prev + n))}
                    className="h-12 rounded-xl bg-gray-100 active:bg-gray-200 font-heading font-bold text-xl text-gray-800 transition-colors"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCount('')}
                  className="h-12 rounded-xl bg-gray-100 active:bg-gray-200 font-bold text-sm text-gray-500 transition-colors"
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={() => setCount(prev => prev === '0' ? '0' : (prev + '0'))}
                  className="h-12 rounded-xl bg-gray-100 active:bg-gray-200 font-heading font-bold text-xl text-gray-800 transition-colors"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setCount(prev => prev.slice(0, -1))}
                  className="h-12 rounded-xl bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <Delete className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}
          </div>

          {/* From Pasture (optional) */}
          <div>
            <Label className="text-sm font-semibold">From Pasture <span className="font-normal text-gray-400">(optional)</span></Label>
            <select
              value={fromId}
              onChange={e => setFromId(e.target.value)}
              className="w-full h-12 mt-1 px-4 rounded-xl border-2 border-gray-200 focus:border-blue-400 outline-none text-base font-medium bg-white"
            >
              <option value="">— None —</option>
              {pastures.filter(p => p.id !== toId).map(p => (
                <option key={p.id} value={p.id}>{p.pasture_name} ({p.current_herd_count ?? 0} head)</option>
              ))}
            </select>
          </div>

          {/* To Pasture (required) */}
          <div>
            <Label className="text-sm font-semibold">To Pasture *</Label>
            <select
              value={toId}
              onChange={e => setToId(e.target.value)}
              className="w-full h-12 mt-1 px-4 rounded-xl border-2 border-gray-200 focus:border-blue-400 outline-none text-base font-medium bg-white"
            >
              <option value="">— Select destination —</option>
              {pastures.filter(p => p.id !== fromId).map(p => (
                <option key={p.id} value={p.id}>{p.pasture_name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-semibold">Notes <span className="font-normal text-gray-400">(optional)</span></Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Reason for move, conditions, etc..."
              className="mt-1"
              rows={3}
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full h-14 text-base font-bold"
            style={{ background: '#1E5F8E' }}
          >
            {saving ? 'Moving...' : 'Move Cows'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}