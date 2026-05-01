import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function AddNoteSheet({ open, onOpenChange, pasture, onSave }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!note.trim()) return;
    setSaving(true);
    await onSave(note.trim());
    setNote('');
    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl pb-10">
        <SheetHeader className="mb-5">
          <SheetTitle className="font-heading text-xl">Add Note — {pasture?.pasture_name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-1">
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Enter note... (timestamp added automatically)"
            className="min-h-32 text-base"
            autoFocus
          />
          <Button onClick={handleSave} disabled={saving || !note.trim()} className="w-full h-14 text-base font-bold">
            {saving ? 'Saving...' : 'Add Note'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}