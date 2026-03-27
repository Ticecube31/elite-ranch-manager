import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';

const GREEN = '#4CAF50';
const GREEN_DARK = '#2E7D32';

export default function QuickCalfForm({ animals = [], seasons = [], pastures = [], defaultSeasonId, isTwinDefault = false, onSave, onCancel }) {
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
  const [saving, setSaving] = useState(false);



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

  return (
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
              className={`h-16 rounded-2xl border-2 font-black text-xl transition-all ${
                sex === s
                  ? s === 'Male'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-pink-500 bg-pink-50 text-pink-700'
                  : 'border-gray-200 bg-white text-gray-400'
              }`}
            >
              {s === 'Male' ? '♂ Steer' : '♀ Heifer'}
            </button>
          ))}
        </div>
      </div>

      {/* Mother */}
      <div>
        <Label className="text-sm font-semibold">Mother Tag # *</Label>
        <Input
          inputMode="numeric"
          pattern="[0-9]*"
          value={motherTagInput}
          onChange={e => {
            const val = e.target.value;
            setMotherTagInput(val);
            const match = validMothers.find(m => m.tag_number === val.trim());
            if (match) {
              setMotherId(match.id);
              setTagNumber(match.tag_number);
              if (!pastureId && match.pasture_id) setPastureId(match.pasture_id);
            } else {
              setMotherId('');
            }
          }}
          placeholder="Type mother's tag number"
          className={`h-14 text-2xl font-black mt-1 ${
            motherTagInput && !motherId ? 'border-orange-400 bg-orange-50' : motherId ? 'border-green-400 bg-green-50' : ''
          }`}
        />
        {motherTagInput && !motherId && (
          <p className="text-xs text-orange-600 mt-1 font-semibold">⚠️ No cow found with tag #{motherTagInput}</p>
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
        <Input
          value={tagNumber}
          onChange={e => setTagNumber(e.target.value)}
          placeholder="Auto-filled from mother"
          className={`h-14 text-2xl font-black mt-1 ${isDuplicate ? 'border-orange-400 bg-orange-50' : ''}`}
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
        <div>
          <Label className="text-sm font-semibold">Pasture / Location</Label>
          <Select value={pastureId} onValueChange={v => setPastureId(v === '__none__' ? '' : v)}>
            <SelectTrigger className="h-14 text-base mt-1">
              <SelectValue placeholder="Select pasture..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— No pasture —</SelectItem>
              {pastures.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.pasture_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
  );
}