import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { validateSexType } from '@/lib/animalRules';

export default function QuickCalfForm({ animals = [], seasons = [], defaultSeasonId, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0];

  const [motherTag, setMotherTag] = useState('');
  const [calfTag, setCalfTag] = useState('');
  const [sex, setSex] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const motherInputRef = useRef(null);

  useEffect(() => {
    motherInputRef.current?.focus();
  }, []);

  // Auto-fill calf tag from mother tag if calf tag is still blank
  useEffect(() => {
    if (calfTag === '' || calfTag === motherTag.slice(0, -1)) {
      setCalfTag(motherTag);
    }
  }, [motherTag]);

  // Mother lookup
  const mother = motherTag.trim()
    ? animals.find(a => a.animal_number?.toLowerCase() === motherTag.trim().toLowerCase())
    : null;
  const motherValid = mother && ['Cow', '1st Calf Heifer'].includes(mother.animal_type);
  const motherInvalid = motherTag.trim() && !motherValid;

  const handleSubmit = async () => {
    if (!calfTag.trim()) { toast.error('Calf Tag # is required'); return; }
    if (!sex)            { toast.error('Select Male or Female'); return; }

    // Duplicate check
    const dup = animals.find(a => a.animal_number?.toLowerCase() === calfTag.trim().toLowerCase());
    if (dup) { toast.error(`Tag #${calfTag} already exists`); return; }

    const animalType = sex === 'Male' ? 'Calf - Steer' : 'Calf - Heifer';
    const ruleError = validateSexType(sex, animalType);
    if (ruleError) { toast.error(ruleError); return; }

    // Derive birth year + season
    const birthYear = date ? new Date(date).getFullYear() : undefined;
    const matchedSeason = seasons.find(s => s.year === birthYear);
    const calving_season_id = matchedSeason?.id || defaultSeasonId || '';

    setSaving(true);
    await onSave({
      animal_number:        calfTag.trim(),
      sex,
      animal_type:          animalType,
      mother_animal_number: motherTag.trim() || undefined,
      date_of_birth:        date || undefined,
      birth_year:           birthYear,
      calving_season_id,
      notes:                notes.trim() || undefined,
      status:               'Alive',
      is_archived:          false,
    });
    setSaving(false);
  };

  const handleClear = () => {
    setMotherTag('');
    setCalfTag('');
    setSex('');
    setLocation('');
    setDate(today);
    setNotes('');
    motherInputRef.current?.focus();
  };

  return (
    <div className="space-y-5 pb-6">

      {/* Cow's Tag # */}
      <div>
        <Label className="text-base font-bold text-gray-700">Cow's Tag #</Label>
        <p className="text-xs text-gray-500 mb-1">Mother's ear tag number</p>
        <Input
          ref={motherInputRef}
          value={motherTag}
          onChange={e => setMotherTag(e.target.value)}
          placeholder="e.g. 934"
          className="h-16 text-2xl font-bold border-2 border-gray-200 focus:border-green-500 rounded-xl mt-1"
          inputMode="text"
        />
        {/* Mother validation feedback */}
        {motherTag.trim() && (
          <div className={`mt-2 flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 ${
            motherValid
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {motherValid
              ? <><CheckCircle2 className="w-4 h-4 shrink-0" /> Mother: {mother.animal_type} #{mother.animal_number} — Valid</>
              : <><AlertCircle className="w-4 h-4 shrink-0" /> {mother ? `#${motherTag} is a ${mother.animal_type} — must be Cow or Heifer` : `#${motherTag} not found in Animals`}</>
            }
          </div>
        )}
      </div>

      {/* Calf's Tag # */}
      <div>
        <Label className="text-base font-bold text-gray-700">Calf's Tag #</Label>
        <p className="text-xs text-gray-500 mb-1">New unique ear tag for this calf</p>
        <Input
          value={calfTag}
          onChange={e => setCalfTag(e.target.value)}
          placeholder="e.g. 315"
          className="h-16 text-2xl font-bold border-2 border-gray-200 focus:border-green-500 rounded-xl mt-1"
          inputMode="text"
        />
      </div>

      {/* Sex */}
      <div>
        <Label className="text-base font-bold text-gray-700">Sex</Label>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <button
            type="button"
            onClick={() => setSex('Male')}
            className={`h-20 rounded-2xl border-3 font-heading font-black text-2xl transition-all active:scale-95 ${
              sex === 'Male'
                ? 'bg-blue-500 text-white border-blue-600 shadow-lg'
                : 'bg-white text-gray-400 border-2 border-gray-200'
            }`}
          >
            ♂ Male
          </button>
          <button
            type="button"
            onClick={() => setSex('Female')}
            className={`h-20 rounded-2xl border-3 font-heading font-black text-2xl transition-all active:scale-95 ${
              sex === 'Female'
                ? 'bg-pink-500 text-white border-pink-600 shadow-lg'
                : 'bg-white text-gray-400 border-2 border-gray-200'
            }`}
          >
            ♀ Female
          </button>
        </div>
      </div>

      {/* Location */}
      <div>
        <Label className="text-base font-bold text-gray-700">Location</Label>
        <Input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="e.g. North Pasture"
          className="h-14 text-lg border-2 border-gray-200 focus:border-green-500 rounded-xl mt-1"
        />
      </div>

      {/* Date */}
      <div>
        <Label className="text-base font-bold text-gray-700">Date</Label>
        <Input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="h-14 text-lg border-2 border-gray-200 focus:border-green-500 rounded-xl mt-1"
        />
      </div>

      {/* Notes */}
      <div>
        <Label className="text-base font-bold text-gray-700">Notes</Label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Health observations, field remarks..."
          className="text-base border-2 border-gray-200 focus:border-green-500 rounded-xl mt-1"
          rows={3}
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full h-16 rounded-2xl font-heading font-black text-xl text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-3"
          style={{ background: 'linear-gradient(135deg, #4CAF50, #2E7D32)' }}
        >
          {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : '+ ADD'}
        </button>
        <button
          onClick={handleClear}
          disabled={saving}
          className="w-full h-12 rounded-2xl font-semibold text-base text-red-600 border-2 border-red-200 bg-red-50 hover:bg-red-100 active:scale-[0.98] transition-all"
        >
          Clear Form
        </button>
      </div>
    </div>
  );
}