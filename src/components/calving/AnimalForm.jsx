import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Camera, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_BY_SEX = {
  Male: ['Calf', 'Bull', 'Steer'],
  Female: ['Calf', 'Cow', 'Heifer'],
};

export default function AnimalForm({ animal, onSave, onCancel }) {
  const [form, setForm] = useState({
    animal_number: '',
    sex: '',
    animal_type: '',
    mother_animal_number: '',
    date_of_birth: new Date().toISOString().split('T')[0],
    status: 'Alive',
    location: '',
    notes: '',
    photo_url: '',
    ...animal,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const allowedTypes = form.sex ? TYPE_BY_SEX[form.sex] : [];

  // Reset animal_type if sex changes and current type is invalid
  useEffect(() => {
    if (form.sex && form.animal_type && !TYPE_BY_SEX[form.sex]?.includes(form.animal_type)) {
      setForm(prev => ({ ...prev, animal_type: '' }));
    }
  }, [form.sex]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, photo_url: file_url }));
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.animal_number || !form.sex || !form.animal_type) {
      toast.error('Please fill in Animal Number, Sex, and Type');
      return;
    }
    // Enforce gender rules
    if (form.sex === 'Male' && ['Cow', 'Heifer'].includes(form.animal_type)) {
      toast.error('Males cannot be Cow or Heifer');
      return;
    }
    if (form.sex === 'Female' && ['Bull', 'Steer'].includes(form.animal_type)) {
      toast.error('Females cannot be Bull or Steer');
      return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Photo */}
      <div className="flex justify-center">
        <label className="cursor-pointer">
          <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center overflow-hidden">
            {form.photo_url ? (
              <img src={form.photo_url} alt="Animal" className="w-full h-full object-cover" />
            ) : (
              <>
                <Camera className="w-8 h-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mt-1">
                  {uploading ? 'Uploading...' : 'Add Photo'}
                </span>
              </>
            )}
          </div>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
        </label>
      </div>

      {/* Animal Number */}
      <div>
        <Label className="text-sm font-semibold">Animal Number / Tag ID *</Label>
        <Input
          value={form.animal_number}
          onChange={(e) => update('animal_number', e.target.value)}
          placeholder="e.g. 142, A-55"
          className="h-14 text-lg mt-1"
        />
      </div>

      {/* Sex */}
      <div>
        <Label className="text-sm font-semibold">Sex *</Label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {['Male', 'Female'].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => update('sex', s)}
              className={`h-14 rounded-xl border-2 font-bold text-lg transition-all ${
                form.sex === s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Animal Type */}
      <div>
        <Label className="text-sm font-semibold">Animal Type *</Label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {allowedTypes.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => update('animal_type', t)}
              className={`h-12 rounded-xl border-2 font-semibold text-sm transition-all ${
                form.animal_type === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50'
              }`}
            >
              {t}
            </button>
          ))}
          {!form.sex && (
            <p className="col-span-3 text-sm text-muted-foreground text-center py-3">
              Select sex first
            </p>
          )}
        </div>
      </div>

      {/* Mother */}
      {form.animal_type === 'Calf' && (
        <div>
          <Label className="text-sm font-semibold">Mother's Animal Number</Label>
          <Input
            value={form.mother_animal_number}
            onChange={(e) => update('mother_animal_number', e.target.value)}
            placeholder="Mother's tag #"
            className="h-14 text-lg mt-1"
          />
        </div>
      )}

      {/* Date */}
      <div>
        <Label className="text-sm font-semibold">Date of Birth / Tagged</Label>
        <Input
          type="date"
          value={form.date_of_birth}
          onChange={(e) => update('date_of_birth', e.target.value)}
          className="h-14 text-lg mt-1"
        />
      </div>

      {/* Status */}
      <div>
        <Label className="text-sm font-semibold">Status</Label>
        <Select value={form.status} onValueChange={(v) => update('status', v)}>
          <SelectTrigger className="h-14 text-lg mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Alive">Alive</SelectItem>
            <SelectItem value="Sold">Sold</SelectItem>
            <SelectItem value="Died">Died</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Location */}
      <div>
        <Label className="text-sm font-semibold">Location / Pasture</Label>
        <Input
          value={form.location}
          onChange={(e) => update('location', e.target.value)}
          placeholder="e.g. North Pasture"
          className="h-14 text-lg mt-1"
        />
      </div>

      {/* Notes */}
      <div>
        <Label className="text-sm font-semibold">Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Any observations..."
          className="text-base mt-1"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 h-14 text-base font-semibold"
        >
          <X className="w-5 h-5 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="flex-1 h-14 text-base font-semibold"
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Saving...' : (animal ? 'Update' : 'Save')}
        </Button>
      </div>
    </form>
  );
}