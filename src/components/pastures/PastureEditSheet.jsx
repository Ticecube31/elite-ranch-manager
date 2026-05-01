import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PastureEditSheet({ open, onOpenChange, pasture, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pasture) setForm({
      pasture_name: pasture.pasture_name || '',
      acreage: pasture.acreage || '',
      max_capacity: pasture.max_capacity || '',
      grass_condition: pasture.grass_condition || '',
      water_status: pasture.water_status || 'Good',
      fence_status: pasture.fence_status || 'Good',
      status: pasture.status || 'Active',
      notes: pasture.notes || '',
    });
  }, [pasture, open]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.pasture_name?.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-y-auto pb-10">
        <SheetHeader className="mb-5">
          <SheetTitle className="font-heading text-xl">Edit Pasture</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-1">
          <div>
            <Label className="text-sm font-semibold">Pasture Name *</Label>
            <Input value={form.pasture_name || ''} onChange={e => set('pasture_name', e.target.value)} className="h-12 mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-semibold">Acreage</Label>
              <Input type="number" value={form.acreage || ''} onChange={e => set('acreage', parseFloat(e.target.value) || '')} className="h-12 mt-1" placeholder="acres" />
            </div>
            <div>
              <Label className="text-sm font-semibold">Max Capacity</Label>
              <Input type="number" value={form.max_capacity || ''} onChange={e => set('max_capacity', parseInt(e.target.value) || '')} className="h-12 mt-1" placeholder="head" />
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold">Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="h-12 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Resting">Resting</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold">Grass Condition</Label>
            <Select value={form.grass_condition} onValueChange={v => set('grass_condition', v)}>
              <SelectTrigger className="h-12 mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {['Excellent', 'Good', 'Fair', 'Poor', 'Depleted'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold">Water Status</Label>
            <Select value={form.water_status} onValueChange={v => set('water_status', v)}>
              <SelectTrigger className="h-12 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Good', 'Low', 'Dry', 'Unknown'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold">Fence Status</Label>
            <Select value={form.fence_status} onValueChange={v => set('fence_status', v)}>
              <SelectTrigger className="h-12 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Good', 'Needs Repair', 'Broken'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold">Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="mt-1" rows={4} placeholder="General notes about this pasture..." />
          </div>
          <Button onClick={handleSave} disabled={saving || !form.pasture_name?.trim()} className="w-full h-14 text-base font-bold">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}