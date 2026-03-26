import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertCircle, Loader2, HelpCircle, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { validateSexType } from '@/lib/animalRules';
import { base44 } from '@/api/base44Client';

const GREEN = '#4CAF50';
const GREEN_DARK = '#2E7D32';

export default function QuickCalfForm({ animals = [], seasons = [], pastures = [], defaultSeasonId, onSave, onAnimalsRefresh }) {
  const today = new Date().toISOString().split('T')[0];

  const [motherTag, setMotherTag]           = useState('');
  const [unknownMother, setUnknownMother]   = useState(false);
  const [addNewCowPrompt, setAddNewCowPrompt] = useState(false); // step 1: show prompt banner
  const [addNewCowConfirm, setAddNewCowConfirm] = useState(false); // step 2: confirm dialog
  const [newCowType, setNewCowType]         = useState('Cow'); // Cow or 1st Calf Heifer
  const [addingCow, setAddingCow]           = useState(false);
  const [pendingMother, setPendingMother]   = useState(null); // mother added mid-flow

  const [calfTag, setCalfTag]               = useState('');
  const [calfTagEdited, setCalfTagEdited]   = useState(false);
  const [twinPrompt, setTwinPrompt]         = useState(false); // null | existing animal when dup detected
  const [isTwin, setIsTwin]                 = useState(false);
  const [sex, setSex]                       = useState('');
  const [location, setLocation]             = useState('');
  const [bornPastureId, setBornPastureId]   = useState('');
  const [pastureQuery, setPastureQuery]     = useState('');
  const [showPasturePrompt, setShowPasturePrompt] = useState(false);
  const [addingPasture, setAddingPasture]   = useState(false);
  const [date, setDate]                     = useState(today);
  const [notes, setNotes]                   = useState('');
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);

  const motherInputRef = useRef(null);

  useEffect(() => { motherInputRef.current?.focus(); }, []);

  // Auto-fill calf tag from mother unless manually edited
  useEffect(() => {
    if (!calfTagEdited && !unknownMother) setCalfTag(motherTag);
  }, [motherTag, unknownMother]);

  // Mother lookup — use pendingMother (just-created) or search existing
  const mother = pendingMother
    || (motherTag.trim()
      ? animals.find(a => a.animal_number?.toLowerCase() === motherTag.trim().toLowerCase())
      : null);

  const motherValid   = !!mother && ['Cow', '1st Calf Heifer'].includes(mother.animal_type);
  const motherNotFound = !unknownMother && motherTag.trim().length > 0 && !mother;
  const motherWrongType = !unknownMother && !!mother && !motherValid;

  // Show "add new cow?" prompt when tag typed but not found
  useEffect(() => {
    if (motherNotFound && !pendingMother) {
      setAddNewCowPrompt(true);
    } else {
      setAddNewCowPrompt(false);
      setAddNewCowConfirm(false);
    }
  }, [motherNotFound, pendingMother]);

  const handleCalfTagChange = (val) => {
    setCalfTag(val);
    setCalfTagEdited(true);
    setTwinPrompt(false);
    setIsTwin(false);
  };

  const handleUnknownMother = () => {
    setUnknownMother(true);
    setMotherTag('');
    setAddNewCowPrompt(false);
    setAddNewCowConfirm(false);
    setPendingMother(null);
    setCalfTag('');
    setCalfTagEdited(false);
  };

  const handleCancelUnknown = () => {
    setUnknownMother(false);
    setPendingMother(null);
    setTimeout(() => motherInputRef.current?.focus(), 50);
  };

  const handleAddNewCow = async () => {
    if (!motherTag.trim()) return;
    setAddingCow(true);
    const birthYear = date ? new Date(date).getFullYear() : new Date().getFullYear();
    const matchedSeason = seasons.find(s => s.year === birthYear);
    const newCow = await base44.entities.Animals.create({
      animal_number: motherTag.trim(),
      sex: 'Female',
      animal_type: newCowType,
      status: 'Alive',
      is_archived: false,
      calving_season_id: matchedSeason?.id || defaultSeasonId || '',
    });
    setPendingMother({ ...newCow, animal_number: motherTag.trim(), animal_type: newCowType, sex: 'Female' });
    setAddNewCowConfirm(false);
    setAddNewCowPrompt(false);
    if (onAnimalsRefresh) onAnimalsRefresh();
    toast.success(`Cow #${motherTag.trim()} added as mother`);
    setAddingCow(false);
  };

  const handleSubmit = async () => {
    if (!calfTag.trim()) { toast.error('Calf Tag # is required'); return; }
    if (!sex)            { toast.error('Select Male or Female'); return; }

    const birthYear = date ? new Date(date).getFullYear() : undefined;
    const dup = animals.find(
      a => a.animal_number?.toLowerCase() === calfTag.trim().toLowerCase()
        && a.birth_year === birthYear
    );
    if (dup && !isTwin) {
      setTwinPrompt(true);
      return;
    }

    const animalType = sex === 'Male' ? 'Calf - Steer' : 'Calf - Heifer';
    const ruleError  = validateSexType(sex, animalType);
    if (ruleError)  { toast.error(ruleError); return; }

    const matchedSeason     = seasons.find(s => s.year === birthYear);
    const calving_season_id = matchedSeason?.id || defaultSeasonId || '';

    const resolvedMother = unknownMother ? undefined : (motherTag.trim() || undefined);

    setSaving(true);
    setSaved(false);
    await onSave({
      animal_number:        calfTag.trim(),
      sex,
      animal_type:          animalType,
      mother_animal_number: resolvedMother,
      date_of_birth:        date || undefined,
      birth_year:           birthYear,
      calving_season_id,
      born_pasture_id:      bornPastureId || undefined,
      notes:                notes.trim() || undefined,
      status:               'Alive',
      is_archived:          false,
      twin:                 isTwin,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    setMotherTag('');
    setUnknownMother(false);
    setAddNewCowPrompt(false);
    setAddNewCowConfirm(false);
    setPendingMother(null);
    setCalfTag('');
    setCalfTagEdited(false);
    setTwinPrompt(false);
    setIsTwin(false);
    setSex('');
    setLocation('');
    setBornPastureId('');
    setPastureQuery('');
    setShowPasturePrompt(false);
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
          <div className="flex items-center justify-between mb-1">
            <label className="text-lg font-bold text-gray-800">
              Cow's Tag # <span className="text-red-400">*</span>
            </label>
            {/* Unknown Mother toggle */}
            {!unknownMother ? (
              <button
                type="button"
                onClick={handleUnknownMother}
                className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 active:scale-95 transition-all"
              >
                <HelpCircle className="w-4 h-4" /> Unknown Mother
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelUnknown}
                className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 active:scale-95 transition-all"
              >
                ← Enter Tag #
              </button>
            )}
          </div>

          {unknownMother ? (
            /* Unknown mother selected */
            <div className="h-16 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
              <span className="text-gray-400 font-bold text-lg">Unknown Mother</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-2">Mother's ear-tag number</p>
              <Input
                ref={motherInputRef}
                value={motherTag}
                onChange={e => { setMotherTag(e.target.value); setPendingMother(null); }}
                placeholder="e.g. 934"
                inputMode="text"
                className="h-16 text-3xl font-bold tracking-widest border-2 rounded-2xl focus-visible:ring-0 focus-visible:border-green-500 placeholder:text-gray-300"
              />
            </>
          )}

          {/* Valid mother */}
          {!unknownMother && motherValid && (
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-3 bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              Mother Found: {mother.animal_type} #{mother.animal_number} — Valid
            </div>
          )}

          {/* Wrong type */}
          {motherWrongType && (
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-3 bg-red-50 text-red-600 border border-red-200">
              <AlertCircle className="w-5 h-5 shrink-0" />
              #{motherTag} is a {mother.animal_type} — must be Cow or 1st Calf Heifer
            </div>
          )}

          {/* Not found → prompt to add */}
          {addNewCowPrompt && !addNewCowConfirm && (
            <div className="mt-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-orange-700">
                  #{motherTag} not in database. Add as new mother?
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddNewCowConfirm(true)}
                  className="flex-1 h-10 rounded-xl font-bold text-sm text-white"
                  style={{ background: GREEN_DARK }}
                >
                  Add New Cow
                </button>
                <button
                  type="button"
                  onClick={handleUnknownMother}
                  className="flex-1 h-10 rounded-xl font-bold text-sm border-2 border-gray-200 text-gray-600 bg-white"
                >
                  Use Unknown
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Confirm add new cow */}
          {addNewCowConfirm && (
            <div className="mt-2 rounded-xl border-2 border-orange-300 bg-orange-50 px-4 py-4 space-y-3">
              <p className="font-bold text-orange-800 text-base">Confirm: Add Cow #{motherTag}?</p>
              <p className="text-sm text-orange-600">This will create a new Animal record as this calf's mother.</p>

              {/* Cow type selector */}
              <div className="grid grid-cols-2 gap-2">
                {['Cow', '1st Calf Heifer'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewCowType(t)}
                    className={`h-11 rounded-xl font-bold text-sm border-2 transition-all ${
                      newCowType === t
                        ? 'text-white border-transparent'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                    style={newCowType === t ? { background: GREEN_DARK } : {}}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddNewCow}
                  disabled={addingCow}
                  className="flex-1 h-11 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: GREEN_DARK }}
                >
                  {addingCow ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓ Confirm & Add'}
                </button>
                <button
                  type="button"
                  onClick={() => setAddNewCowConfirm(false)}
                  disabled={addingCow}
                  className="flex-1 h-11 rounded-xl font-bold text-sm border-2 border-gray-200 text-gray-600 bg-white"
                >
                  Cancel
                </button>
              </div>
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

          {/* Twin / Mistake prompt */}
          {twinPrompt && (
            <div className="mt-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-800 text-base">Tag #{calfTag} already exists!</p>
                  <p className="text-sm text-amber-600 mt-0.5">Is this a twin, or was the tag number entered by mistake?</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setIsTwin(true); setTwinPrompt(false); }}
                  className="h-14 rounded-xl font-black text-sm text-white flex flex-col items-center justify-center gap-0.5"
                  style={{ background: GREEN_DARK }}
                >
                  <span className="text-lg">👯</span>
                  <span>It's a Twin</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setTwinPrompt(false); setCalfTag(''); setCalfTagEdited(false); }}
                  className="h-14 rounded-xl font-black text-sm border-2 border-red-200 text-red-600 bg-white flex flex-col items-center justify-center gap-0.5"
                >
                  <span className="text-lg">✏️</span>
                  <span>Fix the Tag #</span>
                </button>
              </div>
            </div>
          )}

          {/* Twin badge — shown after confirming twin */}
          {isTwin && !twinPrompt && (
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-3 bg-purple-50 text-purple-700 border border-purple-200">
              <span className="text-base">👯</span>
              Marked as Twin — will save with twin = Yes
            </div>
          )}
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

        {/* 4. Born Pasture */}
        <div>
          <label className="block text-lg font-bold text-gray-800 mb-1">Location</label>
          <p className="text-sm text-gray-400 mb-2">Optional — where was this calf born?</p>

          {/* Selected pasture chip */}
          {bornPastureId ? (
            <div className="flex items-center gap-3 h-14 px-4 rounded-2xl border-2 border-green-400 bg-green-50">
              <MapPin className="w-5 h-5 text-green-600 shrink-0" />
              <span className="font-bold text-green-800 text-lg flex-1">
                {pastures.find(p => p.id === bornPastureId)?.pasture_name}
              </span>
              <button
                type="button"
                onClick={() => { setBornPastureId(''); setPastureQuery(''); setShowPasturePrompt(false); }}
                className="text-green-500 hover:text-green-700 font-bold text-sm"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <Input
                value={pastureQuery}
                onChange={e => {
                  const val = e.target.value;
                  setPastureQuery(val);
                  setBornPastureId('');
                  setShowPasturePrompt(false);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    if (pastureQuery.trim() && !bornPastureId) {
                      const match = pastures.find(p =>
                        p.pasture_name.toLowerCase() === pastureQuery.trim().toLowerCase()
                      );
                      if (match) {
                        setBornPastureId(match.id);
                        setPastureQuery('');
                      } else {
                        setShowPasturePrompt(true);
                      }
                    }
                  }, 150);
                }}
                placeholder="e.g. North Pasture"
                className="h-14 text-xl border-2 rounded-2xl focus-visible:ring-0 focus-visible:border-green-500"
              />

              {/* Live suggestions */}
              {pastureQuery.trim().length > 0 && !bornPastureId && (() => {
                const matches = pastures.filter(p =>
                  p.pasture_name.toLowerCase().includes(pastureQuery.trim().toLowerCase())
                );
                return matches.length > 0 ? (
                  <div className="mt-1 rounded-xl border border-green-200 bg-white shadow-md overflow-hidden">
                    {matches.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => { setBornPastureId(p.id); setPastureQuery(''); setShowPasturePrompt(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 active:bg-green-100 transition-colors text-left border-b border-gray-100 last:border-0"
                      >
                        <MapPin className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="font-semibold text-gray-800">{p.pasture_name}</span>
                        {p.current_herd_count !== undefined && (
                          <span className="ml-auto text-xs text-gray-400">{p.current_herd_count} animals</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}

              {/* No match prompt */}
              {showPasturePrompt && pastureQuery.trim() && !bornPastureId && (
                <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-blue-700">
                      "{pastureQuery}" not found. Create it as a new pasture?
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={addingPasture}
                      onClick={async () => {
                        setAddingPasture(true);
                        const created = await base44.entities.Pastures.create({ pasture_name: pastureQuery.trim() });
                        setPastureId(created.id);
                        setPastureQuery('');
                        setShowPasturePrompt(false);
                        if (onAnimalsRefresh) onAnimalsRefresh();
                        toast.success(`Pasture "${pastureQuery.trim()}" created!`);
                        setAddingPasture(false);
                      }}
                      className="flex-1 h-10 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                      style={{ background: GREEN_DARK }}
                    >
                      {addingPasture ? <Loader2 className="w-4 h-4 animate-spin" /> : '+ Create Pasture'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasturePrompt(false)}
                      className="flex-1 h-10 rounded-xl font-bold text-sm border-2 border-gray-200 text-gray-600 bg-white"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
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
          disabled={saving || saved}
          className={`w-full h-16 rounded-2xl font-heading font-black text-xl text-white shadow-xl active:scale-[0.98] transition-all disabled:opacity-90 flex items-center justify-center gap-3 ${saved ? '' : ''}`}
          style={{ background: saved ? '#388E3C' : `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})` }}
        >
          {saving
            ? <><Loader2 className="w-6 h-6 animate-spin" /> Saving...</>
            : saved
              ? <><CheckCircle2 className="w-6 h-6" /> CALF ADDED!</>
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