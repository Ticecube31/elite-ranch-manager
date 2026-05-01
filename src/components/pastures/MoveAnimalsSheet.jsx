import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function MoveAnimalsSheet({ open, onOpenChange, pasture, onDone }) {
  const [direction, setDirection] = useState('out'); // 'in' or 'out'
  const [targetPastureId, setTargetPastureId] = useState('');
  const [selectedAnimalIds, setSelectedAnimalIds] = useState([]);
  const [moveDate, setMoveDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Rotation');
  const [saving, setSaving] = useState(false);

  const { data: allPastures = [] } = useQuery({
    queryKey: ['pastures'],
    queryFn: () => base44.entities.Pastures.list('pasture_name'),
    enabled: open,
  });

  const { data: currentAnimals = [] } = useQuery({
    queryKey: ['pasture-animals', pasture?.id],
    queryFn: () => base44.entities.Animals.filter({ pasture_id: pasture.id }),
    enabled: open && !!pasture?.id,
  });

  const otherPastures = allPastures.filter(p => p.id !== pasture?.id);

  const toggleAnimal = (id) => {
    setSelectedAnimalIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleMove = async () => {
    if (!targetPastureId && direction === 'out') { toast.error('Select a destination pasture'); return; }
    if (direction === 'out' && selectedAnimalIds.length === 0) { toast.error('Select at least one animal'); return; }

    setSaving(true);
    const targetPasture = allPastures.find(p => p.id === targetPastureId);
    const animalsToMove = direction === 'out'
      ? currentAnimals.filter(a => selectedAnimalIds.includes(a.id))
      : [];

    // Create movement records and update animals
    for (const animal of animalsToMove) {
      await base44.entities.AnimalMovements.create({
        animal_number: animal.tag_number,
        from_location: pasture.pasture_name,
        to_location: targetPasture?.pasture_name || 'Unknown',
        pasture_id: targetPastureId,
        move_date: moveDate,
        move_reason: reason,
      });
      await base44.entities.Animals.update(animal.id, { pasture_id: targetPastureId });
    }

    // Update herd counts
    const newFromCount = Math.max(0, (pasture.current_herd_count ?? 0) - animalsToMove.length);
    const newToCount = (targetPasture?.current_herd_count ?? 0) + animalsToMove.length;
    await base44.entities.Pastures.update(pasture.id, {
      current_herd_count: newFromCount,
      status: newFromCount === 0 ? 'Inactive' : 'Active',
    });
    if (targetPastureId) {
      await base44.entities.Pastures.update(targetPastureId, {
        current_herd_count: newToCount,
        last_grazed_date: moveDate,
        status: newToCount > 0 ? 'Active' : 'Inactive',
      });
    }

    toast.success(`${animalsToMove.length} animal(s) moved`);
    setSelectedAnimalIds([]);
    setSaving(false);
    onDone();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-y-auto pb-10">
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
            <Label className="text-sm font-semibold mb-2 block">
              Select Animals to Move ({selectedAnimalIds.length} selected)
            </Label>
            {currentAnimals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No animals currently in this pasture</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {currentAnimals.map(a => (
                  <button
                    key={a.id}
                    onClick={() => toggleAnimal(a.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: selectedAnimalIds.includes(a.id) ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                      background: selectedAnimalIds.includes(a.id) ? 'hsl(var(--primary)/0.08)' : 'hsl(var(--card))',
                    }}
                  >
                    <span className="font-bold text-sm text-foreground">#{a.tag_number}</span>
                    <span className="text-xs text-muted-foreground">{a.animal_type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleMove}
            disabled={saving || !targetPastureId || selectedAnimalIds.length === 0}
            className="w-full h-14 text-base font-bold"
          >
            {saving ? 'Moving...' : `Move ${selectedAnimalIds.length} Animal(s)`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}