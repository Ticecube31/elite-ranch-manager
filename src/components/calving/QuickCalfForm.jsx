import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { validateSexType } from '@/lib/animalRules';

const GREEN = '#4CAF50';
const GREEN_DARK = '#2E7D32';

export default function QuickCalfForm({ animals = [], seasons = [], defaultSeasonId, onSave }) {
  const today = new Date().toISOString().split('T')[0];

  const [motherTag, setMotherTag] = useState('');
  const [calfTag, setCalfTag]     = useState('');
  const [calfTagEdited, setCalfTagEdited] = useState(false);
  const [sex, setSex]             = useState('');
  const [location, setLocation]   = useState('');
  const [date, setDate]           = useState(today);
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);

  const motherInputRef = useRef(null);

  useEffect(() => { motherInputRef.current?.focus(); }, []);

  // Auto-fill calf tag from mother tag unless user has manually edited it
  useEffect(() => {
    if (!calfTagEdited) setCalfTag(motherTag);
  }, [motherTag]);

  // Mother lookup
  const mother = motherTag.trim()
    ? animals.find(a => a.animal_number?.toLowerCase() === motherTag.trim().toLowerCase())
    : null;
  const motherValid   = !!mother && ['Cow', '1st Calf Heifer'].includes(mother.animal_type);
  const motherInvalid = motherTag.trim().length > 0 && !motherValid;

  const handleCalfTagChange = (val) => {
    setCalfTag(val);
    setCalfTagEdited(val !== motherTag); // treat as edited only if diverged
  };

  const handleSubmit = async () => {
    if (!calfTag.trim())  { toast.error('Calf Tag # is required'); return; }
    if (!sex)             { toast.error('Select Male or Female'); return; }

    const dup = animals.find(
      a => a.animal_number?.toLowerCase() === calfTag.trim().toLowerCase()
    );
    if (dup) { toast.error(`Tag #${calfTag} already exists in Animals`); return; }

    const animalType = sex === 'Male' ? 'Calf - Steer' : 'Calf - Heifer';
    const ruleError  = validateSexType(sex, animalType);
    if (ruleError)  { toast.error(ruleError); return; }

    const birthYear       = date ? new Date(date).getFullYear() : undefined;
    const matchedSeason   = seasons.find(s => s.year === birthYear);
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
    setCalfTagEdited(false);
    setSex('');
    setLocation('');
    setDate(today);
    setNotes('');
    setTimeout(() => motherInputRef.current?.focus(), 50);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">

      {/* ── Scrollable fields ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-7 pb-44">

        {/* 1. Cow's Tag # */}
        <div>
          <label className="block text-lg font-bold text-gray-800 mb-1">
            Cow's Tag # <span className="text-red-400">*</span>
          </label>
          <p className="text-sm text-gray-400 mb-2">Mother's ear-tag number</p>
          <Input
            ref={motherInputRef}
            value={motherTag}
            onChange={e => setMotherTag(e.target.value)}
            placeholder="e.g. 934"
            inputMode="text"
            className="h-16 text-3xl font-bold tracking-widest border-2 rounded-2xl focus-visible:ring-0 focus-visible:border-green-500 placeholder:text-gray-300"
          />
          {/* Validation feedback */}
          {motherTag.trim() && (
            <div className={`mt-2 flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-3 ${
              motherValid
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {motherValid
                ? <><CheckCircle2 className="w-5 h-5 shrink-0" />
                    Mother Found: {mother.animal_type} #{mother.animal_number} — Valid</>
                : <><AlertCircle className="w-5 h-5 shrink-0" />
                    {mother
                      ? `#${motherTag} is a ${mother.animal_type} — must be Cow or 1st Calf Heifer`
                      : `#${motherTag} not found in Animals table`
                    }</>
              }
            </div>
          )}
        </div>

        {/* 2. Calf's Tag # */}
        <div>
          <label className="block text-lg font-bold text-gray-800 mb-1">
            Calf's Tag # <span className="text-red-400">*</span>
          </label>
          <p className="text-sm text-gray-400 mb-2">
            {calfTagEdited ? 'Custom tag entered' : 'Auto-filled from mother — edit if needed'}
          </p>
          <Input
            value={calfTag}
            onChange={e => handleCalfTagChange(e.target.value)}
            placeholder="e.g. 315"
            inputMode="text"
            className="h-16 text-3xl font-bold tracking-widest border-2 rounded-2xl focus-visible:ring-0 focus-visible:border-green-500 placeholder:text-gray-300"
          />
        </div>

        {/* 3. Sex */}
        <div>
          <label className="block text-lg font-bold text-gray-800 mb-3">
            Sex <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSex('Male')}
              className={`h-24 rounded-2xl font-heading font-black text-2xl transition-all active:scale-95 border-2 ${
                sex === 'Male'
                  ? 'bg-blue-500 text-white border-blue-600 shadow-lg'
                  : 'bg-white text-gray-300 border-gray-200'
              }`}
            >
              ♂<br />Male
            </button>
            <button
              type="button"
              onClick={() => setSex('Female')}
              className={`h-24 rounded-2xl font-heading font-black text-2xl transition-all active:scale-95 border-2 ${
                sex === 'Female'
                  ? 'bg-pink-500 text-white border-pink-600 shadow-lg'
                  : 'bg-white text-gray-300 border-gray-200'
              }`}
            >
              ♀<br />Female
            </button>
          </div>
        </div>

        {/* 4. Location Tagged */}
        <div>
          <label className="block text-lg font-bold text-gray-800 mb-1">Location Tagged</label>
          <p className="text-sm text-gray-400 mb-2">Optional — e.g. North Pasture, Corral 3</p>
          <Input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. North Pasture"
            className="h-14 text-xl border-2 rounded-2xl focus-visible:ring-0 focus-visible:border-green-500"
          />
        </div>

        {/* 5. Date Tagged */}
        <div>
          <label className="block text-lg font-bold text-gray-800 mb-1">Date Tagged</label>
          <p className="text-sm text-gray-400 mb-2">Defaults to today</p>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="h-14 text-xl border-2 rounded-2xl focus-visible:ring-0 focus-visible:border-green-500"
          />
        </div>

        {/* 6. Notes */}
        <div>
          <label className="block text-lg font-bold text-gray-800 mb-1">Notes</label>
          <p className="text-sm text-gray-400 mb-2">Optional — health observations, field remarks</p>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Healthy, nursing well. Born near water trough."
            className="text-base border-2 rounded-2xl focus-visible:ring-0 focus-visible:border-green-500 min-h-[100px]"
            rows={4}
          />
        </div>

      </div>

      {/* ── Fixed bottom buttons ───────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 space-y-3 border-t border-green-100"
        style={{ background: '#F1F8F1' }}
      >
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full h-16 rounded-2xl font-heading font-black text-xl text-white shadow-xl active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-3"
          style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})` }}
        >
          {saving
            ? <Loader2 className="w-6 h-6 animate-spin" />
            : <><span className="text-2xl">+</span> ADD CALF</>
          }
        </button>
        <button
          onClick={handleClear}
          disabled={saving}
          className="w-full h-12 rounded-2xl font-bold text-base text-red-500 border-2 border-red-200 bg-white active:scale-[0.98] transition-all"
        >
          Clear Form
        </button>
      </div>

    </div>
  );
}