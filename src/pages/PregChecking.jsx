import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CheckCircle2, XCircle, ClipboardList, ChevronRight, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { format } from 'date-fns';

const VIEWS = { DASHBOARD: 'dashboard', SETUP: 'setup', CHECK: 'check' };

export default function PregChecking() {
  const [view, setView] = useState(VIEWS.DASHBOARD);
  const [session, setSession] = useState(null); // { seasonId, date, notes }
  const [cowInput, setCowInput] = useState('');
  const [foundCow, setFoundCow] = useState(null);
  const [cowNotFound, setCowNotFound] = useState(false);
  const [checkNotes, setCheckNotes] = useState('');
  const [checkedList, setCheckedList] = useState([]);
  const [showSetupSheet, setShowSetupSheet] = useState(false);
  const [setupForm, setSetupForm] = useState({
    seasonId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ['calving-seasons'],
    queryFn: () => base44.entities.CalvingSeasons.list('-year'),
    initialData: [],
  });

  const { data: animals = [] } = useQuery({
    queryKey: ['animals'],
    queryFn: () => base44.entities.Animals.list('-created_date'),
    initialData: [],
  });

  const queryClient = useQueryClient();

  const updateAnimalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Animals.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['animals'] }),
  });

  const eligibleCows = animals.filter(a =>
    a.sex === 'Female' && ['Cow', '1st Calf Heifer'].includes(a.animal_type) && !a.is_archived
  );

  const handleLookup = () => {
    if (!cowInput.trim()) return;
    const found = eligibleCows.find(
      a => a.animal_number?.toLowerCase() === cowInput.trim().toLowerCase()
    );
    if (found) {
      setFoundCow(found);
      setCowNotFound(false);
    } else {
      setFoundCow(null);
      setCowNotFound(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLookup();
  };

  const handleMark = async (result) => {
    if (!foundCow) return;
    // Save preg check result as a note on the animal
    const summary = `Preg Check ${format(new Date(session.date), 'MM/dd/yyyy')}: ${result}`;
    const existingNotes = foundCow.notes || '';
    const updatedNotes = existingNotes ? `${existingNotes}\n${summary}` : summary;
    await updateAnimalMutation.mutateAsync({
      id: foundCow.id,
      data: { notes: updatedNotes, calving_season_id: session.seasonId || foundCow.calving_season_id },
    });
    setCheckedList(prev => [
      { animal_number: foundCow.animal_number, animal_type: foundCow.animal_type, result, notes: checkNotes, timestamp: new Date().toISOString() },
      ...prev,
    ]);
    toast.success(`#${foundCow.animal_number} marked ${result}`);
    clearAndNext();
  };

  const clearAndNext = () => {
    setCowInput('');
    setFoundCow(null);
    setCowNotFound(false);
    setCheckNotes('');
    // Focus input
    setTimeout(() => document.getElementById('cow-input')?.focus(), 100);
  };

  const handleStartSession = () => {
    if (!setupForm.seasonId) { toast.error('Please select a Calving Season'); return; }
    setSession(setupForm);
    setShowSetupSheet(false);
    setCheckedList([]);
    setView(VIEWS.CHECK);
    toast.success('Preg Check session started!');
  };

  const selectedSeason = seasons.find(s => s.id === session?.seasonId);

  // ── DASHBOARD ────────────────────────────────────────────
  if (view === VIEWS.DASHBOARD) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6 pb-[60px]">
        <div>
          <h1 className="font-heading font-black text-2xl text-foreground">Preg Checking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Record pregnancy status for upcoming calving seasons.</p>
        </div>

        {/* Big Start Button */}
        <button
          onClick={() => setShowSetupSheet(true)}
          className="w-full rounded-3xl p-7 text-white shadow-xl overflow-hidden relative text-left active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #FF9800 0%, #E65100 100%)' }}
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl mb-4">🤰</div>
          <h2 className="font-heading font-black text-2xl mb-1">Start New Preg Check</h2>
          <p className="text-white/80 text-sm mb-5">Select a calving season, then quickly record OPEN or PREGNANT for each cow.</p>
          <span className="inline-flex items-center gap-2 bg-white/20 border border-white/30 font-semibold text-sm px-5 py-3 rounded-xl min-h-[48px]">
            Begin Session <ChevronRight className="w-4 h-4" />
          </span>
        </button>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-3xl font-heading font-black text-foreground">{eligibleCows.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Eligible Cows / Heifers</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-3xl font-heading font-black text-foreground">{seasons.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Calving Seasons</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 space-y-2">
          <p className="font-semibold text-sm text-orange-800 dark:text-orange-300">How it works</p>
          <ul className="text-sm text-orange-700 dark:text-orange-400 space-y-1 list-disc list-inside">
            <li>Select which Calving Season this check is for</li>
            <li>Type each cow number — instant lookup</li>
            <li>Tap OPEN or PREGNANT — auto-saved</li>
            <li>Hit CLEAR & NEXT for fast field workflow</li>
          </ul>
        </div>

        {/* Setup Sheet */}
        <Sheet open={showSetupSheet} onOpenChange={setShowSetupSheet}>
          <SheetContent side="bottom" className="h-auto rounded-t-3xl pb-8">
            <SheetHeader className="mb-5">
              <SheetTitle className="font-heading text-xl">New Preg Check Session</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 px-1">
              <div>
                <Label className="text-sm font-semibold">Calving Season *</Label>
                <Select value={setupForm.seasonId} onValueChange={v => setSetupForm(p => ({ ...p, seasonId: v }))}>
                  <SelectTrigger className="h-14 text-base mt-1"><SelectValue placeholder="Select season..." /></SelectTrigger>
                  <SelectContent>
                    {seasons.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label || `Calving Season ${s.year}`} {s.status === 'Active' ? '(Active)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {seasons.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No seasons yet — create one in Calving Season first.</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold">Date of Check</Label>
                <Input type="date" value={setupForm.date} onChange={e => setSetupForm(p => ({ ...p, date: e.target.value }))} className="h-14 text-lg mt-1" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Session Notes</Label>
                <Textarea value={setupForm.notes} onChange={e => setSetupForm(p => ({ ...p, notes: e.target.value }))} placeholder="Weather, crew, pen conditions..." className="text-base mt-1" rows={2} />
              </div>
              <Button onClick={handleStartSession} className="w-full h-14 text-base font-bold" style={{ background: 'linear-gradient(90deg,#FF9800,#E65100)', border: 'none' }}>
                Start Session →
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // ── PREG CHECK WORKFLOW ───────────────────────────────────
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-5 pb-[60px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => setView(VIEWS.DASHBOARD)} className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
          {selectedSeason?.label || 'Season Check'} · {checkedList.length} checked
        </Badge>
      </div>

      {/* Cow Input */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="font-heading font-bold text-lg">Enter Cow Number</h2>
        <div className="flex gap-2">
          <Input
            id="cow-input"
            value={cowInput}
            onChange={e => { setCowInput(e.target.value); setFoundCow(null); setCowNotFound(false); }}
            onKeyDown={handleKeyDown}
            placeholder="Tag # (e.g. 142)"
            className="h-16 text-2xl font-bold text-center"
            autoFocus
          />
          <Button onClick={handleLookup} className="h-16 px-5" style={{ background: '#FF9800', border: 'none' }}>
            <Search className="w-6 h-6" />
          </Button>
        </div>

        {/* Found Cow Info */}
        {foundCow && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading font-black text-xl text-green-800 dark:text-green-300">#{foundCow.animal_number}</p>
                <p className="text-sm text-green-700 dark:text-green-400">{foundCow.animal_type} · {foundCow.sex}</p>
                {foundCow.date_of_birth && (
                  <p className="text-xs text-muted-foreground mt-0.5">Born: {format(new Date(foundCow.date_of_birth), 'MMM d, yyyy')}</p>
                )}
              </div>
              <span className="text-4xl">🐮</span>
            </div>
          </div>
        )}

        {cowNotFound && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-xl p-4 text-center">
            <p className="font-semibold text-red-700">#{cowInput} not found</p>
            <p className="text-xs text-muted-foreground mt-1">Must be a Cow or 1st Calf Heifer in the Animals table.</p>
          </div>
        )}

        {/* Optional Notes */}
        {foundCow && (
          <Input
            value={checkNotes}
            onChange={e => setCheckNotes(e.target.value)}
            placeholder="Optional notes for this cow..."
            className="h-10 text-sm"
          />
        )}
      </div>

      {/* OPEN / PREGNANT Buttons */}
      {foundCow && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleMark('OPEN')}
            className="h-24 rounded-2xl flex flex-col items-center justify-center gap-2 font-heading font-black text-xl text-white shadow-lg active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg,#ef4444,#b91c1c)' }}
          >
            <XCircle className="w-8 h-8" />
            OPEN
          </button>
          <button
            onClick={() => handleMark('PREGNANT')}
            className="h-24 rounded-2xl flex flex-col items-center justify-center gap-2 font-heading font-black text-xl text-white shadow-lg active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg,#16a34a,#14532d)' }}
          >
            <CheckCircle2 className="w-8 h-8" />
            PREGNANT
          </button>
        </div>
      )}

      {/* Clear & Next */}
      {foundCow && (
        <Button onClick={clearAndNext} variant="outline" className="w-full h-14 text-base font-bold border-2">
          <X className="w-5 h-5 mr-2" /> CLEAR & NEXT COW
        </Button>
      )}

      {/* Checked List */}
      {checkedList.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">This Session ({checkedList.length})</p>
          {checkedList.map((entry, i) => (
            <div key={i} className="flex items-center justify-between bg-card rounded-xl border border-border px-4 py-3">
              <div>
                <span className="font-bold text-sm text-foreground">#{entry.animal_number}</span>
                <span className="text-xs text-muted-foreground ml-2">{entry.animal_type}</span>
                {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
              </div>
              <Badge className={entry.result === 'PREGNANT'
                ? 'bg-green-100 text-green-800 border-green-200'
                : 'bg-red-100 text-red-800 border-red-200'
              }>
                {entry.result}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}