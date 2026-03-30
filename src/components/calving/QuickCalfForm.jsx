import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import NumericInput from '@/components/shared/NumericInput';

const GREEN = '#4CAF50';
const GREEN_DARK = '#2E7D32';

export default function QuickCalfForm({ animals = [], seasons = [], pastures = [], defaultSeasonId, isTwinDefault = false, onSave, onCancel, onAnimalsRefresh }) {
  const validMothers = animals.filter(
    a => a.sex === 'Female' && ['Cow', '1st Calf Heifer'].includes(a.animal_type)
  );

  const [sex, setSex] = useState('');
  const [motherId, setMotherId] = useState('');
  const [motherTagInput, setMotherTagInput] = useState('');
  const [tagNumber, setTagNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date().toISOString().split('T')[0]);
  const [pastureId, setPastureId] = useState('');
  const [notes, setNotes] = useState('');
  const [twin, setTwin] = useState(isTwinDefault);
  const [calvingSeasonId, setCalvingSeasonId] = useState(defaultSeasonId || '');
  const [pastureInput, setPastureInput] = useState('');
  const [showPastureSuggestions, setShowPastureSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddCowModal, setShowAddCowModal] = useState(false);
  const [newCowForm, setNewCowForm] = useState({ tag_number: '', animal_type: 'Cow', date_of_birth: '' });
  const [creatingCow, setCreatingCow] = useState(false);
  const [creatingPasture, setCreatingPasture] = useState(false);


  // Auto-derive calving season from date
  useEffect(() => {
    if (dateOfBirth) {
      const year = new Date(dateOfBirth).getFullYear();
      const matched = seasons.find(s => s.year === year);
      if (matched) setCalvingSeasonId(matched.id);
    }
  }, [dateOfBirth, seasons]);

  const duplicates = animals.filter(
    a => a.tag_number === tagNumber && a.id !== undefined && !['Cow', '1st Calf Heifer', 'Bull'].includes(a.animal_type)
  );
  const isDuplicate = duplicates.length > 0 && !twin;

     const handleAddCow = async () => {
    toast.info('Step 1: Button clicked');

    if (!newCowForm.tag_number.trim()) {
      toast.error('Tag number required');
      return;
    }
    if (!newCowForm.animal_type) {
      toast.error('Animal type required');
      return;
    }

    toast.info('Step 2: Checks passed');

    const exists = animals.find(a => a.tag_number === newCowForm.tag_number.trim());
    if (exists) {
      toast.error(`Tag #${newCowForm.tag_number} already exists`);
      return;
    }

    toast.info('Step 3: No duplicate — creating...');
    setCreatingCow(true);

    const birthYear = newCowForm.date_of_birth ? new Date(newCowForm.date_of_birth).getFullYear() : undefined;

    try {
      const created = await base44.entities.Animals.create({
        tag_number: newCowForm.tag_number.trim(),
        sex: 'Female',
        animal_type: newCowForm.animal_type,
        date_of_birth: newCowForm.date_of_birth || undefined,
        birth_year: birthYear,
        status: 'Alive',
        is_archived: false,
      });

      toast.success(`✅ SUCCESS: ${newCowForm.animal_type} #${newCowForm.tag_number} created!`);
      setShowAddCowModal(false);
      setNewCowForm({ tag_number: '', animal_type: 'Cow', date_of_birth: '' });

      onAnimalsRefresh?.();

      setMotherTagInput(newCowForm.tag_number.trim());
      setMotherId(created.id);
      setTagNumber(newCowForm.tag_number.trim());
    } catch (err) {
      toast.error('Failed to create cow: ' + (err.message || err));
      console.error(err);
    }

    setCreatingCow(false);
  };
  };

  const handleAddPasture = async () => {
    if (!pastureInput.trim()) { toast.error('Pasture name required'); return; }
    
    const exists = pastures.find(p => p.pasture_name === pastureInput.trim());
    if (exists) { toast.error(`Pasture "${pastureInput}" already exists`); return; }

    setCreatingPasture(true);
    try {
      const created = await base44.entities.Pastures.create({
        pasture_name: pastureInput.trim(),
        status: 'Active',
      });
      
      toast.success(`Pasture "${pastureInput}" created!`);
      setPastureId(created.id);
      setShowPastureSuggestions(false);
      onAnimalsRefresh?.();
    } catch (err) {
      toast.error('Failed to create pasture');
    }
    setCreatingPasture(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sex) { toast.error('Select sex'); return; }
    if (!motherId) { toast.error('Select a mother'); return; }
    if (!tagNumber.trim()) { toast.error('Tag number is required'); return; }

    const mother = validMothers.find(m => m.id === motherId);
    const animal_type = sex === 'Male' ? 'Calf - Steer' : 'Calf - Heifer';
    const birthYear = dateOfBirth ? new Date(dateOfBirth).getFullYear() : undefined;

    setSaving(true);
    await onSave({
      tag_number: tagNumber.trim(),
      sex,
      animal_type,
      mother_id: motherId,
      mother_animal_number: mother?.tag_number || '',
      date_of_birth: dateOfBirth,
      birth_year: birthYear,
      calving_season_id: calvingSeasonId,
      pasture_id: pastureId || undefined,
      born_pasture_id: pastureId || undefined,
      twin,
      notes,
      status: 'Alive',
      is_archived: false,
    });
    setSaving(false);
  };

  return (<>
    <form onSubmit={handleSubmit} className="space-y-5 pb-4">

      {/* Sex */}
      <div>
        <Label className="text-sm font-semibold">Sex *</Label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {['Male', 'Female'].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSex(s)}
              className={`h-16 rounded-2xl border-2 transition-all ${
                sex === s
                  ? s === 'Male'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-black text-xl shadow-md'
                    : 'border-pink-500 bg-pink-50 text-pink-700 font-black text-xl shadow-md'
                  : 'border-gray-200 bg-white text-gray-400 font-semibold'
              }`}
            >
              {s === 'Male' ? '(M) Steer' : '(F) Heifer'}
            </button>
          ))}
        </div>
      </div>

      {/* Mother */}
      <div>
        <Label className="text-sm font-semibold">Mother Tag # *</Label>
        <NumericInput
          value={motherTagInput}
          onChange={e => {
           const val = e.target.value;
           setMotherTagInput(val);
           const match = validMothers.find(m => m.tag_number === val.trim());
           if (match) {
             setMotherId(match.id);
             setTagNumber(match.tag_number);
             if (!pastureId && match.pasture_id) {
               setPastureId(match.pasture_id);
               const matchedPasture = pastures.find(p => p.id === match.pasture_id);
               if (matchedPasture) setPastureInput(matchedPasture.pasture_name);
             }
           } else {
             setMotherId('');
           }
          }}
          placeholder="Mother's tag #"
          className={`h-14 text-base mt-1 ${
            motherTagInput && !motherId ? 'border-orange-400 bg-orange-50' : motherId ? 'border-green-400 bg-green-50' : ''
          }`}
        />
        {motherTagInput && !motherId && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-orange-600 font-semibold">⚠️ No cow found with tag #{motherTagInput}</p>
            <button
              type="button"
              onClick={() => {
                setNewCowForm({ ...newCowForm, tag_number: motherTagInput });
                setShowAddCowModal(true);
              }}
              className="w-full h-10 rounded-xl border-2 border-orange-300 text-orange-600 font-semibold text-sm hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Cow #{motherTagInput}
            </button>
          </div>
        )}
        {motherId && (
          <p className="text-xs text-green-600 mt-1 font-semibold">
            ✓ {validMothers.find(m => m.id === motherId)?.animal_type} found
          </p>
        )}
      </div>

      {/* Tag Number */}
      <div>
        <Label className="text-sm font-semibold">Calf Tag # *</Label>
        <NumericInput
          value={tagNumber}
          onChange={e => setTagNumber(e.target.value)}
          placeholder="Auto-filled from mother"
          className={`h-14 text-base mt-1 ${isDuplicate ? 'border-orange-400 bg-orange-50' : ''}`}
        />
        {isDuplicate && (
          <p className="text-xs text-orange-600 mt-1 font-semibold">
            ⚠️ Tag #{tagNumber} already exists — mark as Twin if this is a twin calf
          </p>
        )}
        {motherId && tagNumber && validMothers.find(m => m.id === motherId)?.tag_number === tagNumber && (
          <p className="text-xs text-green-600 mt-1 font-semibold">✓ Tag matches mother (correct per ranch rules)</p>
        )}
      </div>

      {/* Twin toggle */}
      <div className="flex items-center justify-between bg-purple-50 rounded-2xl px-4 py-3 border border-purple-100">
        <div>
          <p className="font-semibold text-sm text-gray-700">Twin calf?</p>
          <p className="text-xs text-gray-400">Same mother, same birth date</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTwin(false)}
            className={`px-4 py-1.5 rounded-xl font-bold text-sm border-2 transition-all ${!twin ? 'border-gray-400 bg-gray-200 text-gray-700' : 'border-gray-200 bg-white text-gray-400'}`}>
            No
          </button>
          <button type="button" onClick={() => setTwin(true)}
            className={`px-4 py-1.5 rounded-xl font-bold text-sm border-2 transition-all ${twin ? 'border-purple-500 bg-purple-500 text-white' : 'border-gray-200 bg-white text-gray-400'}`}>
            👯 Twin
          </button>
        </div>
      </div>

      {/* Date of Birth */}
      <div>
        <Label className="text-sm font-semibold">Date Tagged / Born</Label>
        <Input
          type="date"
          value={dateOfBirth}
          onChange={e => setDateOfBirth(e.target.value)}
          className="h-14 text-lg mt-1"
        />
      </div>

      {/* Pasture */}
      {pastures.length > 0 && (
        <div className="relative">
          <Label className="text-sm font-semibold">Pasture / Location</Label>
          <Input
            value={pastureInput}
            onChange={e => {
              setPastureInput(e.target.value);
              setPastureId('');
              setShowPastureSuggestions(true);
            }}
            onFocus={() => setShowPastureSuggestions(true)}
            onBlur={() => setTimeout(() => setShowPastureSuggestions(false), 150)}
            placeholder="Type or select pasture..."
            className="h-14 text-base mt-1"
          />
          {showPastureSuggestions && (
            <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
              {pastures
                .filter(p => !pastureInput || p.pasture_name.toLowerCase().includes(pastureInput.toLowerCase()))
                .map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={() => {
                      setPastureId(p.id);
                      setPastureInput(p.pasture_name);
                      setShowPastureSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-3 text-base hover:bg-green-50 active:bg-green-100 border-b border-gray-100 last:border-0"
                  >
                    {p.pasture_name}
                  </button>
                ))}
            </div>
          )}
          {pastureInput && !pastureId && (
           <div className="mt-2 space-y-2">
             <p className="text-xs text-orange-600 font-semibold">⚠️ No pasture found with name "{pastureInput}"</p>
             <button
               type="button"
               onClick={handleAddPasture}
               disabled={creatingPasture}
               className="w-full h-10 rounded-xl border-2 border-orange-300 text-orange-600 font-semibold text-sm hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
             >
               <Plus className="w-4 h-4" /> Create Pasture "{pastureInput}"
             </button>
           </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <Label className="text-sm font-semibold">Notes</Label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any observations..."
          className="text-base mt-1"
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-14 text-base font-semibold">
          <X className="w-5 h-5 mr-2" /> Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="flex-1 h-14 text-base font-semibold text-white"
          style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`, border: 'none' }}
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Saving...' : 'Save Calf'}
        </Button>
      </div>
        </form>

    {/* Add Cow Modal */}
    {showAddCowModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 mx-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-xl" style={{ color: GREEN_DARK }}>Add New Cow</h3>
            <button onClick={() => setShowAddCowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Tag Number *</Label>
              <NumericInput
                value={newCowForm.tag_number}
                onChange={e => setNewCowForm(prev => ({ ...prev, tag_number: e.target.value }))}
                placeholder="e.g. 142"
                className="h-12 text-lg"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Type *</Label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                {['Cow', '1st Calf Heifer'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewCowForm(prev => ({ ...prev, animal_type: t }))}
                    className={`h-12 rounded-xl border-2 font-bold text-sm transition-all ${
                      newCowForm.animal_type === t
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Birth Year (optional)</Label>
              <Input
                type="date"
                value={newCowForm.date_of_birth}
                onChange={e => setNewCowForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                className="h-12 mt-1"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAddCowModal(false)} className="flex-1 h-12 text-base font-semibold">
              Cancel
            </Button>
           <Button
  type="button"
  onClick={handleAddCow}
  disabled={creatingCow}
  className="flex-1 h-12 text-base font-semibold text-white"
  style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})`, border: 'none' }}
>
  {creatingCow ? 'Creating...' : 'Create Cow'}
</Button>
          </div>
        </div>
      </div>
    )}
  </>
);
}
