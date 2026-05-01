import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function MoveAnimalsSheet({ open, onOpenChange, pasture, onDone }) {
  const [targetPastureId, setTargetPastureId] = useState('');
  const [headCount, setHeadCount] = useState('');
  const [moveDate, setMoveDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Rotation');
  const [saving, setSaving] = useState(false);

  const { data: allPastures = [] } = useQuery({
    queryKey: ['pastures'],
    queryFn: () => base44.entities.Pastures.list('pasture_name'),
    enabled: open,
  });

  const otherPastures = allPastures.filter(p => p.id !== pasture?.id);
  const count = parseInt(headCount) || 0;

  const handleMove = async () => {
    if (!targetPastureId) { toast.error('Select a destination pasture'); return; }
    if (count <= 0) { toast.error('Enter number of animals to move'); return; }

    setSaving(true);
    const targetPasture = allPastures.find(p => p.id === targetPastureId);

    // Create a single movement record for the batch
    await base44.entities.AnimalMovements.create({
      animal_number: `${count} head`,
      from_location: pasture.pasture_name,
      to_location: targetPasture?.pasture_name || 'Unknown',
      pasture_id: targetPastureId,
      move_date: moveDate,
      move_reason: reason,
    });

    // Update herd counts
    const newFromCount = Math.max(0, (pasture.current_herd_count ?? 0) - count);
    const newToCount = (targetPasture?.current_herd_count ?? 0) + count;
    await base44.entities.Pastures.update(pasture.id, {
      current_herd_count: newFromCount,
      status: newFromCount === 0 ? 'Inactive' : 'Active',
    });
    await base44.entities.Pastures.update(targetPastureId, {
      current_herd_count: newToCount,
      last_grazed_date: moveDate,
      status: newToCount > 0 ? 'Active' : 'Inactive',
    });

    toast.success(`${count} animal(s) moved to ${targetPasture?.pasture_name}`);
    setHeadCount('');
    setTargetPastureId('');
    setSaving(false);
    onDone();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl overflow-y-auto pb-10">
        <SheetHeader className="mb-5">
          <SheetTitle className="font-heading text-xl">Move Animals — {pasture?.pasture_name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-1">

          <div>
            <Label className="text-sm font-semibold">Move Date</Label>
            <Input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} className="h-12 mt-1" />
          </div>

          <div>
            <Label className="text-sm font-semibold">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-12 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Rotation', 'Weaning', 'Sale', 'Health', 'Other'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-semibold">Destination Pasture</Label>
            <Select value={targetPastureId} onValueChange={setTargetPastureId}>
              <SelectTrigger className="h-12 mt-1"><SelectValue placeholder="Select destination..." /></SelectTrigger>
              <SelectContent>
                {otherPastures.map(p => <SelectItem key={p.id} value={p.id}>{p.pasture_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-semibold">Number of Animals</Label>
            <Input
              type="number"
              min="1"
              max={pasture?.current_herd_count ?? 9999}
              value={headCount}
              onChange={e => setHeadCount(e.target.value)}
              placeholder={`Enter head count (max ${pasture?.current_herd_count ?? '?'})`}
              className="h-12 mt-1 text-lg font-bold"
            />
          </div>

          <Button
            onClick={handleMove}
            disabled={saving || !targetPastureId || count <= 0}
            className="w-full h-14 text-base font-bold"
          >
            {saving ? 'Moving...' : `Move ${count > 0 ? count : ''} Animal${count !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}