import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Camera, Save, X, TreePine } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { allowedTypesForSex, validateSexType } from '@/lib/animalRules';

function MotherInput({ validMothers, motherId, motherTagInput, onSelect, onInputChange }) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = validMothers.filter(m =>
    !motherTagInput || m.tag_number.toLowerCase().includes(motherTagInput.toLowerCase())
  );

  const selectedMother = validMothers.find(m => m.id === motherId);

  return (
    <div>
      <Label className="text-sm font-semibold">Mother Tag # *</Label>
      <div className="relative mt-1">
        <Input
          inputMode="numeric"
          value={motherTagInput || ''}
          onChange={e => { onInputChange(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Type mother's tag number..."
          className={`h-14 text-lg ${motherId ? 'border-green-400 bg-green-50' : motherTagInput ? 'border-orange-400 bg-orange-50' : ''}`}
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
            {filtered.map(m => (
              <button
                key={m.id}
                type="button"
                onMouseDown={() => { onSelect(m); setShowSuggestions(false); }}
                className="w-full text-left px-4 py-3 hover:bg-green-50 active:bg-green-100 border-b border-gray-100 last:border-0"
              >
                <span className="font-bold text-base">#{m.tag_number}</span>
                <span className="ml-2 text-sm text-gray-500">{m.animal_type}</span>
                {m.birth_year && <span className="ml-2 text-xs text-gray-400">born {m.birth_year}</span>}
                {m.date_of_birth && !m.birth_year && (
                  <span className="ml-2 text-xs text-gray-400">born {new Date(m.date_of_birth).getFullYear()}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {motherId && selectedMother && (
        <p className="text-xs text-green-600 mt-1 font-semibold">
          ✓ {selectedMother.animal_type} #{selectedMother.tag_number}
          {(selectedMother.birth_year || selectedMother.date_of_birth) && (
            <span className="ml-1 text-gray-400">
              — born {selectedMother.birth_year || new Date(selectedMother.date_of_birth).getFullYear()}
            </span>
          )}
        </p>
      )}
      {motherTagInput && !motherId && (
        <p className="text-xs text-orange-600 mt-1 font-semibold">⚠️ No matching mother found</p>
      )}
    </div>
  );
}

export default function AnimalForm({ animal, onSave, onCancel, existingAnimals = [], seasons = [], defaultSeasonId }) {
  const [form, setForm] = useState({
    tag_number: '',
    sex: '',
    animal_type: '',
    mother_id: '',
    mother_animal_number: '',
    date_of_birth: new Date().toISOString().split('T')[0],
    status: 'Alive',
    notes: '',
    photo_url: '',
    is_archived: false,
    calving_season_id: defaultSeasonId || '',
    ...animal,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: pastures = [] } = useQuery({
    queryKey: ['pastures'],
    queryFn: () => base44.entities.Pastures.list(),
    initialData: [],
  });

  const allowedTypes = allowedTypesForSex(form.sex);

  // Valid mothers for calf linking (Cow or 1st Calf Heifer)
  const validMothers = existingAnimals.filter(
    a => a.sex === 'Female' && ['Cow', '1st Calf Heifer'].includes(a.animal_type)
  );

  // Reset animal_type if sex changes and current type becomes invalid
  useEffect(() => {
    if (form.sex && form.animal_type && !allowedTypesForSex(form.sex).includes(form.animal_type)) {
      setForm(prev => ({ ...prev, animal_type: '' }));
    }
  }, [form.sex]);

  // Auto-derive birth_year and calving_season_id from date_of_birth
  useEffect(() => {
    if (form.date_of_birth) {
      const year = new Date(form.date_of_birth).getFullYear();
      const matchedSeason = seasons.find(s => s.year === year);
      setForm(prev => ({
        ...prev,
        birth_year: year,
        calving_season_id: matchedSeason ? matchedSeason.id : prev.calving_season_id,
      }));
    }
  }, [form.date_of_birth, seasons]);

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

    if (!form.tag_number?.trim()) { toast.error('Tag Number is required'); return; }
    if (!form.sex)                   { toast.error('Sex is required'); return; }
    if (!form.animal_type)           { toast.error('Animal Type is required'); return; }
    // derive location label from selected pasture for display purposes

    // Central sex/type rule enforcement
    const ruleError = validateSexType(form.sex, form.animal_type);
    if (ruleError) { toast.error(ruleError); return; }

    const normalizedTag = form.tag_number.trim().toLowerCase();
    const animalsWithSameTag = existingAnimals.filter(
      a => a.tag_number?.trim().toLowerCase() === normalizedTag && a.id !== animal?.id
    );

    if (animalsWithSameTag.length > 0) {
      const formBirthYear = form.date_of_birth ? new Date(form.date_of_birth).getFullYear() : undefined;
      const animalsWithSameBirthYear = animalsWithSameTag.filter((a) => {
        const existingBirthYear = a.birth_year || (a.date_of_birth ? new Date(a.date_of_birth).getFullYear() : undefined);
        return existingBirthYear && formBirthYear && existingBirthYear === formBirthYear;
      });

      if (animalsWithSameBirthYear.length > 0) {
        const shouldContinue = window.confirm(
          `Tag #${form.tag_number} already exists for birth year ${formBirthYear}. Do you want to add another animal with this same tag and birth year?`
        );
        if (!shouldContinue) return;
      } else if (!formBirthYear) {
        toast.error('Birth year is required when reusing an existing tag number');
        return;
      }
    }

    // Mother required for Calf types
    const isCalfType = ['Calf - Steer', 'Calf - Heifer'].includes(form.animal_type);
    if (isCalfType && !form.mother_id?.trim()) {
      toast.error('Mother is required for a Calf');
      return;
    }

    // Validate mother exists if only tag is provided
    if (isCalfType && form.mother_animal_number && !form.mother_id) {
      const mother = existingAnimals.find(
        a => a.tag_number?.toLowerCase() === form.mother_animal_number.trim().toLowerCase()
      );
      if (!mother) {
        toast.error(`Mother #${form.mother_animal_number} not found`);
        return;
      }
      if (!['Cow', '1st Calf Heifer'].includes(mother.animal_type)) {
        toast.error(`#${form.mother_animal_number} is a ${mother.animal_type} — must be Cow or 1st Calf Heifer`);
        return;
      }
      form.mother_id = mother.id;
    }

    setSaving(true);
    await onSave({
      ...form,
      tag_number: form.tag_number.trim(),
      birth_year:   form.date_of_birth ? new Date(form.date_of_birth).getFullYear() : undefined,
      is_archived:  ['Sold', 'Died'].includes(form.status),
    });
    setSaving(false);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-4">

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

      {/* Tag Number */}
      <div>
        <Label className="text-sm font-semibold">Tag Number *</Label>
        <Input
          value={form.tag_number}
          onChange={(e) => update('tag_number', e.target.value)}
          placeholder="e.g. 142, A-55"
          className="h-14 text-xl font-bold mt-1"
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
                  ? s === 'Male'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-pink-500 bg-pink-50 text-pink-700'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              {s === 'Male' ? '♂ Male' : '♀ Female'}
            </button>
          ))}
        </div>
      </div>

      {/* Animal Type */}
      <div>
        <Label className="text-sm font-semibold">Animal Type *</Label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {form.sex ? allowedTypes.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => update('animal_type', t)}
              className={`h-12 rounded-xl border-2 font-semibold text-sm transition-all ${
                form.animal_type === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              {t}
            </button>
          )) : (
            <p className="col-span-3 text-sm text-muted-foreground text-center py-3 bg-muted rounded-xl">
              Select sex first
            </p>
          )}
        </div>
      </div>

      {/* Mother (Calf types only) */}
      {['Calf - Steer', 'Calf - Heifer'].includes(form.animal_type) && (
        <MotherInput
          validMothers={validMothers}
          motherId={form.mother_id}
          motherTagInput={form.mother_animal_number}
          onSelect={(m) => {
            update('mother_id', m.id);
            update('mother_animal_number', m.tag_number);
          }}
          onInputChange={(val) => {
            update('mother_animal_number', val);
            update('mother_id', '');
          }}
        />
      )}

      {/* Date of Birth */}
      <div>
        <Label className="text-sm font-semibold">Date of Birth / Tagged</Label>
        <Input
          type="date"
          value={form.date_of_birth}
          onChange={(e) => update('date_of_birth', e.target.value)}
          className="h-14 text-lg mt-1"
        />
      </div>

      {/* Calving Season */}
      {seasons.length > 0 && (
        <div>
          <Label className="text-sm font-semibold">Calving Season</Label>
          <Select value={form.calving_season_id || ''} onValueChange={(v) => update('calving_season_id', v === '__none__' ? '' : v)}>
            <SelectTrigger className="h-14 text-base mt-1">
              <SelectValue placeholder="Select season..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— No season assigned —</SelectItem>
              {seasons.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label || `Calving Season ${s.year}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Status */}
      <div>
        <Label className="text-sm font-semibold">Status</Label>
        <Select value={form.status} onValueChange={(v) => update('status', v)}>
          <SelectTrigger className="h-14 text-lg mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Alive">✅ Alive</SelectItem>
            <SelectItem value="Sold">💰 Sold</SelectItem>
            <SelectItem value="Died">💀 Died</SelectItem>
            <SelectItem value="Missing">❓ Missing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pasture / Location */}
      <div>
        <Label className="text-sm font-semibold">Pasture / Location</Label>
        <Select value={form.pasture_id || ''} onValueChange={(v) => update('pasture_id', v === '__none__' ? '' : v)}>
          <SelectTrigger className="h-14 text-base mt-1">
            <SelectValue placeholder="Select pasture..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— No pasture assigned —</SelectItem>
            {pastures.map(p => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  <TreePine className="w-4 h-4 text-amber-600" />
                  {p.pasture_name}
                  {p.current_herd_count !== undefined && (
                    <span className="text-xs text-muted-foreground">({p.current_herd_count} animals)</span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pastures.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">Add pastures in the Pastures tab to assign locations.</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label className="text-sm font-semibold">Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Health observations, feeding notes, field remarks..."
          className="text-base mt-1"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-14 text-base font-semibold">
          <X className="w-5 h-5 mr-2" />Cancel
        </Button>
        <Button type="submit" disabled={saving} className="flex-1 h-14 text-base font-semibold">
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Saving...' : animal ? 'Update' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
