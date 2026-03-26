import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronDown, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import QuickCalfForm from '@/components/calving/QuickCalfForm';
import AnimalForm from '@/components/calving/AnimalForm';
import AllCalvesView from '@/components/calving/AllCalvesView';
import CalvingSeasonReports from '@/components/calving/CalvingSeasonReports';
import { logAudit } from '@/lib/auditLogger';
import { format } from 'date-fns';

const GREEN = '#4CAF50';
const GREEN_DARK = '#2E7D32';
const GREEN_BG = '#F1F8F1';

export default function CalvingSeason() {
  const [view, setView] = useState('main');           // 'main' | 'add-calf' | 'edit-animal' | 'all-calves' | 'reports'
  const [editAnimal, setEditAnimal] = useState(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState('all');
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [showNewSeasonDialog, setShowNewSeasonDialog] = useState(false);
  const [newSeasonYear, setNewSeasonYear] = useState(new Date().getFullYear());
  const [currentUser, setCurrentUser] = useState(null);
  const [lastAdded, setLastAdded] = useState(null); // for "add another" flow

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const queryClient = useQueryClient();

  const { data: seasons = [] } = useQuery({
    queryKey: ['calving-seasons'],
    queryFn: () => base44.entities.CalvingSeasons.list('-year'),
    initialData: [],
  });

  const { data: animals = [], isLoading } = useQuery({
    queryKey: ['animals'],
    queryFn: () => base44.entities.Animals.list('-created_date'),
    initialData: [],
  });

  const { data: pastures = [] } = useQuery({
    queryKey: ['pastures'],
    queryFn: () => base44.entities.Pastures.list(),
    initialData: [],
  });

  // Auto-select most recent season on first load
  useEffect(() => {
    if (seasons.length > 0 && selectedSeasonId === 'all') {
      setSelectedSeasonId(seasons[0].id); // already sorted by -year
    }
  }, [seasons]);

  const createSeasonMutation = useMutation({
    mutationFn: (data) => base44.entities.CalvingSeasons.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['calving-seasons'] });
      setSelectedSeasonId(created.id);
      toast.success(`Calving Season ${created.year} created!`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Animals.create(data),
    onSuccess: (created, data) => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      queryClient.invalidateQueries({ queryKey: ['animals-stats'] });
      setLastAdded(data);
      logAudit({ action: 'Created', entityType: 'Animal', entityId: created.id, entityLabel: `Animal #${data.tag_number}`, changeSummary: `New ${data.animal_type} (${data.sex}) created`, newValue: data, user: currentUser });
      toast.success(`Calf #${data.tag_number} added!`);
      setView('success');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Animals.update(id, data),
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      queryClient.invalidateQueries({ queryKey: ['animals-stats'] });
      setEditAnimal(null);
      setView('main');
      toast.success(`Animal #${data.tag_number} updated!`);
      logAudit({ action: 'Updated', entityType: 'Animal', entityId: id, entityLabel: `Animal #${data.tag_number}`, changeSummary: `Record updated`, newValue: data, user: currentUser });
    },
  });

  const handleConfirmNewSeason = () => {
    const year = Number(newSeasonYear);
    if (!year || year < 2000 || year > 2100) { toast.error('Please enter a valid year'); return; }
    const exists = seasons.find(s => s.year === year);
    if (exists) {
      setSelectedSeasonId(exists.id);
      setShowNewSeasonDialog(false);
      toast.info(`Season ${year} already exists`);
      return;
    }
    createSeasonMutation.mutate({ year, label: `Calving Season ${year}` });
    setShowNewSeasonDialog(false);
  };

  const handleQuickSave = async (formData) => {
    await createMutation.mutateAsync(formData);
  };

  const handleEditSave = async (formData) => {
    const { id, created_date, updated_date, created_by, ...data } = formData;
    await updateMutation.mutateAsync({ id: editAnimal.id, data });
  };

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  // Animals in selected season (calves = Calf - Heifer or Calf - Steer)
  const seasonAnimals = animals.filter(a =>
    selectedSeasonId === 'all' ? true : a.calving_season_id === selectedSeasonId
  );
  const calves = seasonAnimals.filter(a => ['Calf - Heifer', 'Calf - Steer'].includes(a.animal_type));
  const maleCalves   = calves.filter(a => a.sex === 'Male').length;
  const femaleCalves = calves.filter(a => a.sex === 'Female').length;

  // Recent activity: last 8 animals added in this season
  const recentCalves = [...calves]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 8);

  const seasonLabel = selectedSeason
    ? (selectedSeason.label || `Calving Season ${selectedSeason.year}`)
    : 'All Seasons';

  // ── SUCCESS VIEW ──────────────────────────────────────────
  if (view === 'success' && lastAdded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: GREEN_BG }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-6 shadow-lg" style={{ background: GREEN }}>
          🐄
        </div>
        <h1 className="font-heading font-black text-3xl text-gray-900 mb-2">Calf Added!</h1>
        <p className="text-xl font-bold mb-1" style={{ color: GREEN_DARK }}>#{lastAdded.animal_number}</p>
        <p className="text-gray-500 text-base mb-10">{lastAdded.sex} · {lastAdded.animal_type}</p>

        <div className="w-full max-w-xs space-y-4">
          <button
            onClick={() => { setView('add-calf'); }}
            className="w-full h-16 rounded-2xl font-heading font-black text-xl text-white shadow-lg active:scale-[0.98] transition-all"
            style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})` }}
          >
            + Add Another Calf
          </button>
          <button
            onClick={() => setView('main')}
            className="w-full h-14 rounded-2xl font-semibold text-base border-2 border-gray-300 bg-white text-gray-700 active:scale-[0.98] transition-all"
          >
            Back to Season
          </button>
        </div>
      </div>
    );
  }

  // ── ADD CALF FORM VIEW ────────────────────────────────────
  if (view === 'add-calf') {
    return (
      <div className="min-h-screen" style={{ background: GREEN_BG }}>
        {/* Form Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-green-200"
          style={{ background: GREEN_DARK }}>
          <button onClick={() => setView('main')} className="text-white/80 hover:text-white p-2 -ml-2">
            <X className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-lg">Add New Calf</h1>
          <div className="w-10" />
        </div>
        <div className="px-5 py-6 max-w-lg mx-auto">
          <QuickCalfForm
            animals={animals}
            seasons={seasons}
            pastures={pastures}
            defaultSeasonId={selectedSeasonId !== 'all' ? selectedSeasonId : seasons[0]?.id}
            onSave={handleQuickSave}
            onCancel={() => setView('main')}
            onAnimalsRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ['animals'] });
              queryClient.invalidateQueries({ queryKey: ['pastures'] });
            }}
          />
        </div>
      </div>
    );
  }

  // ── ALL CALVES VIEW ───────────────────────────────────────
  if (view === 'all-calves') {
    return (
      <AllCalvesView
        calves={animals}
        pastures={pastures}
        seasons={seasons}
        onBack={() => setView('main')}
        onEditCalf={(animal) => { setEditAnimal(animal); setView('edit-animal'); }}
      />
    );
  }

  // ── REPORTS VIEW ───────────────────────────────────────────
  if (view === 'reports') {
    return (
      <CalvingSeasonReports
        animals={animals}
        seasons={seasons}
        pastures={pastures}
        selectedSeasonId={selectedSeasonId !== 'all' ? selectedSeasonId : seasons[0]?.id}
        onBack={() => setView('main')}
      />
    );
  }

  // ── EDIT ANIMAL VIEW ──────────────────────────────────────
  if (view === 'edit-animal' && editAnimal) {
    return (
      <div className="min-h-screen" style={{ background: GREEN_BG }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-green-200"
          style={{ background: GREEN_DARK }}>
          <button onClick={() => { setView('main'); setEditAnimal(null); }} className="text-white/80 hover:text-white p-2 -ml-2">
            <X className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-lg">Edit #{editAnimal.tag_number}</h1>
          <div className="w-10" />
        </div>
        <div className="px-5 py-6 max-w-lg mx-auto">
          <AnimalForm
            animal={editAnimal}
            onSave={handleEditSave}
            onCancel={() => { setView('main'); setEditAnimal(null); }}
            existingAnimals={animals}
            seasons={seasons}
          />
        </div>
      </div>
    );
  }

  // ── MAIN VIEW ─────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-8" style={{ background: GREEN_BG }}>

      {/* ── Season Header Bar ────────────────────────────── */}
      <div className="sticky top-0 z-10 px-4 py-3 shadow-md" style={{ background: GREEN_DARK }}>
        <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Calving Season</p>
        <button
          onClick={() => setShowSeasonPicker(true)}
          className="flex items-center gap-2 mt-0.5"
        >
          <span className="font-heading font-black text-white text-xl leading-tight">{seasonLabel}</span>
          <ChevronDown className="w-5 h-5 text-white/70" />
        </button>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-6">

        {/* ── BIG ADD CALF BUTTON ─────────────────────── */}
        <button
          onClick={() => setView('add-calf')}
          className="w-full h-20 rounded-2xl font-heading font-black text-2xl text-white shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})` }}
        >
          <Plus className="w-7 h-7 stroke-[3px]" />
          Add New Calf
        </button>

        {/* ── VIEW ALL CALVES + REPORTS BUTTONS ──────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setView('all-calves')}
            className="h-14 rounded-2xl font-heading font-bold text-base border-2 border-green-300 text-green-800 bg-white hover:bg-green-50 active:scale-[0.98] transition-all"
          >
            View All ({calves.length})
          </button>
          <button
            onClick={() => setView('reports')}
            className="h-14 rounded-2xl font-heading font-bold text-base border-2 border-green-300 text-green-800 bg-white hover:bg-green-50 active:scale-[0.98] transition-all"
          >
            Reports 📊
          </button>
        </div>

        {/* ── ANALYTICS CARD ──────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-green-50" style={{ background: '#E8F5E9' }}>
            <p className="font-bold text-sm text-green-800">Season Overview</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-green-100">
            <div className="px-4 py-5 text-center">
              <p className="font-heading font-black text-4xl" style={{ color: GREEN_DARK }}>{calves.length}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">Total Calves</p>
            </div>
            <div className="px-4 py-5 text-center">
              <p className="font-heading font-black text-4xl text-blue-600">{maleCalves}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">♂ Males</p>
            </div>
            <div className="px-4 py-5 text-center">
              <p className="font-heading font-black text-4xl text-pink-500">{femaleCalves}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">♀ Females</p>
            </div>
          </div>
        </div>

        {/* ── RECENT ACTIVITY ─────────────────────────── */}
        <div>
          <p className="font-heading font-bold text-lg text-gray-800 mb-3">Recent Activity</p>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
            </div>
          ) : recentCalves.length === 0 ? (
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm px-5 py-10 text-center">
              <p className="text-4xl mb-3">🐄</p>
              <p className="font-bold text-gray-700">No calves recorded yet</p>
              <p className="text-sm text-gray-400 mt-1">Tap "Add New Calf" to log your first one.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden divide-y divide-gray-100">
              {recentCalves.map((animal) => (
                <button
                  key={animal.id}
                  onClick={() => { setEditAnimal(animal); setView('edit-animal'); }}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-green-50 active:bg-green-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: '#E8F5E9' }}>
                      {animal.sex === 'Male' ? '♂' : '♀'}
                    </div>
                    <div>
                      <p className="font-heading font-bold text-base text-gray-900">
                        #{animal.tag_number}
                        <span className="ml-2 font-normal text-sm text-gray-500">— {animal.sex}</span>
                      </p>
                      {animal.mother_animal_number && (
                        <p className="text-xs text-gray-400">Dam: #{animal.mother_animal_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {animal.created_date && (
                      <span className="text-xs text-gray-400">
                        {format(new Date(animal.created_date), 'MMM d, h:mm a')}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Season Picker Dialog ─────────────────────────── */}
      <Dialog open={showSeasonPicker} onOpenChange={setShowSeasonPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">Select Season</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <button
              onClick={() => { setSelectedSeasonId('all'); setShowSeasonPicker(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all ${
                selectedSeasonId === 'all'
                  ? 'text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              style={selectedSeasonId === 'all' ? { background: GREEN } : {}}
            >
              All Seasons
            </button>
            {seasons.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedSeasonId(s.id); setShowSeasonPicker(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-between ${
                  selectedSeasonId === s.id
                    ? 'text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
                style={selectedSeasonId === s.id ? { background: GREEN } : {}}
              >
                <span>{s.label || `Calving Season ${s.year}`}</span>

              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowSeasonPicker(false); setNewSeasonYear(new Date().getFullYear()); setShowNewSeasonDialog(true); }}
            className="w-full h-12 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-semibold text-sm hover:border-green-400 hover:text-green-600 transition-colors"
          >
            + New Season
          </button>
        </DialogContent>
      </Dialog>

      {/* ── New Season Dialog ────────────────────────────── */}
      <Dialog open={showNewSeasonDialog} onOpenChange={setShowNewSeasonDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Calving Season</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-sm font-semibold">Year</Label>
            <Input
              type="number"
              value={newSeasonYear}
              onChange={e => setNewSeasonYear(e.target.value)}
              className="h-12 text-lg mt-1"
              min="2000"
              max="2100"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSeasonDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmNewSeason} style={{ background: GREEN, border: 'none' }}>Create Season</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}