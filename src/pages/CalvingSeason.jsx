import React, { useState, useEffect, useContext } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Plus, ChevronDown, ChevronRight, X, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import QuickCalfForm from '@/components/calving/QuickCalfForm';
import { logTagHistory } from '@/lib/tagHistoryLogger';
import AnimalForm from '@/components/calving/AnimalForm';
import AllCalvesView from '@/components/calving/AllCalvesView';
import CalvingSeasonReports from '@/components/calving/CalvingSeasonReports';
import CalvingAIAssistant from '@/components/calving/CalvingAIAssistant';
import { CalvingAIContext } from '@/components/layout/AppLayout';
import { logAudit } from '@/lib/auditLogger';
import { format } from 'date-fns';
import CalfSuccessAnimation from '@/components/calving/CalfSuccessAnimation';
import { useTabScrollPosition } from '@/hooks/useTabScrollPosition';

const GREEN = '#4CAF50';
const GREEN_DARK = '#2E7D32';
const GREEN_BG = '#F1F8F1';

export default function CalvingSeason() {
  const location = useLocation();
  const navigate = useNavigate();
  const { animalId } = useParams();
  useTabScrollPosition('calving-scroll-container');

  // Determine current view from URL pathname
  const getViewFromPath = () => {
    if (location.pathname.includes('/calving/add-calf')) return 'add-calf';
    if (location.pathname.includes('/calving/all-calves')) return 'all-calves';
    if (location.pathname.includes('/calving/reports')) return 'reports';
    if (location.pathname.includes('/calving/edit/')) return 'edit-animal';
    return 'main';
  };

  const view = getViewFromPath();

  const [selectedSeasonId, setSelectedSeasonId] = useState('all');
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [showNewSeasonDialog, setShowNewSeasonDialog] = useState(false);
  const [newSeasonYear, setNewSeasonYear] = useState(new Date().getFullYear());
  const [currentUser, setCurrentUser] = useState(null);
  const [lastAdded, setLastAdded] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [isTwinDefault, setIsTwinDefault] = useState(false);
  const [showEditSeasonDialog, setShowEditSeasonDialog] = useState(false);
  const [editSeasonForm, setEditSeasonForm] = useState({});
  const [editAnimal, setEditAnimal] = useState(null);
  // Route-based navigation
  const setView = (newView) => {
    switch (newView) {
      case 'add-calf':
        navigate('/calving/add-calf');
        break;
      case 'all-calves':
        navigate('/calving/all-calves');
        break;
      case 'reports':
        navigate('/calving/reports');
        break;
      case 'edit-animal':
        if (editAnimal) navigate(`/calving/edit/${editAnimal.id}`);
        break;
      default:
        navigate('/calving');
    }
  };

  const { setOpenCalvingAI } = useContext(CalvingAIContext);
 
  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

   // Register AI opener with the layout header search bar
  useEffect(() => {
    setOpenCalvingAI(() => () => setShowAI(true));
    return () => setOpenCalvingAI(null);
  }, [setOpenCalvingAI]);


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

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-log-calving'],
    queryFn: () => base44.entities.AuditLog.filter({ entity_type: 'Animal' }, '-created_date', 20),
    initialData: [],
  });

  // Load edit animal from animals list when route includes animalId
  useEffect(() => {
    if (animalId && view === 'edit-animal' && !editAnimal) {
      const animal = animals.find(a => a.id === animalId);
      if (animal) setEditAnimal(animal);
    }
  }, [animalId, animals, view, editAnimal]);
  
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

  const updateSeasonMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalvingSeasons.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calving-seasons'] });
      setShowEditSeasonDialog(false);
      toast.success('Season updated!');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Animals.create(data),
    onMutate: async (data) => {
      // Optimistic update: add to cache
      await queryClient.cancelQueries({ queryKey: ['animals'] });
      const previousAnimals = queryClient.getQueryData(['animals']);
      const optimisticAnimal = { ...data, id: `temp-${Date.now()}`, created_date: new Date().toISOString(), updated_date: new Date().toISOString(), created_by: currentUser?.email };
      queryClient.setQueryData(['animals'], (old = []) => [...old, optimisticAnimal]);
      return { previousAnimals, optimisticAnimal };
    },
    onSuccess: async (created, data) => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      queryClient.invalidateQueries({ queryKey: ['animals-stats'] });
      setLastAdded(data);
      logAudit({ action: 'Created', entityType: 'Animal', entityId: created.id, entityLabel: `Animal #${data.tag_number}`, changeSummary: `New ${data.animal_type} (${data.sex}) created`, newValue: data, user: currentUser });
      logTagHistory({ animalId: created.id, oldTagNumber: null, newTagNumber: data.tag_number, reason: 'Calf tagging — same tag as mother per ranch rules', user: currentUser });
      toast.success(`Calf #${data.tag_number} added!`);
      navigate('/calving/success');
    },
    onError: (_err, _data, context) => {
      if (context?.previousAnimals) {
        queryClient.setQueryData(['animals'], context.previousAnimals);
      }
      toast.error('Failed to create calf');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Animals.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['animals'] });
      const previousAnimals = queryClient.getQueryData(['animals']);
      queryClient.setQueryData(['animals'], (old = []) => 
        old.map(a => a.id === id ? { ...a, ...data } : a)
      );
      return { previousAnimals };
    },
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      queryClient.invalidateQueries({ queryKey: ['animals-stats'] });
      setEditAnimal(null);
      navigate('/calving');
      toast.success(`Animal #${data.tag_number} updated!`);
      logAudit({ action: 'Updated', entityType: 'Animal', entityId: id, entityLabel: `Animal #${data.tag_number}`, changeSummary: `Record updated`, newValue: data, user: currentUser });
    },
    onError: (_err, _data, context) => {
      if (context?.previousAnimals) {
        queryClient.setQueryData(['animals'], context.previousAnimals);
      }
      toast.error('Failed to update animal');
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
    // Log tag change if tag number changed
    if (data.tag_number && data.tag_number !== editAnimal.tag_number) {
      logTagHistory({
        animalId: editAnimal.id,
        oldTagNumber: editAnimal.tag_number,
        newTagNumber: data.tag_number,
        reason: 'Manual correction in Calving Season edit',
        user: currentUser,
      });
    }
  };

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  // Animals in selected season (calves = Calf - Heifer or Calf - Steer)
  const seasonAnimals = animals.filter(a =>
    selectedSeasonId === 'all' ? true : a.calving_season_id === selectedSeasonId
  );
  const calves = seasonAnimals.filter(a => ['Calf - Heifer', 'Calf - Steer'].includes(a.animal_type));
  const maleCalves   = calves.filter(a => a.sex === 'Male').length;
  const femaleCalves = calves.filter(a => a.sex === 'Female').length;

  // Recent activity: merge animal creates + audit log updates, filtered to selected season
  const recentActivity = (() => {
    const seasonAnimalIds = new Set(seasonAnimals.map(a => a.id));
    // "Added" entries from animals themselves
    const added = seasonAnimals.map(a => ({
      animal: a,
      action: 'Added',
      summary: a.animal_type,
      date: new Date(a.created_date),
    }));
    // "Modified" entries from audit log
    const modified = auditLogs
      .filter(log => log.action === 'Updated' && seasonAnimalIds.has(log.entity_id))
      .map(log => {
        const animal = seasonAnimals.find(a => a.id === log.entity_id);
        return {
          animal: animal || { tag_number: log.entity_label?.replace('Animal #', '') || '?', animal_type: '—' },
          action: 'Modified',
          summary: log.change_summary || 'Updated',
          date: new Date(log.created_date),
        };
      });
    return [...added, ...modified]
      .sort((a, b) => b.date - a.date)
      .slice(0, 8);
  })();

  const seasonLabel = selectedSeason
    ? (selectedSeason.label || `Calving Season ${selectedSeason.year}`)
    : 'All Seasons';

  // ── ALL CALVES VIEW ───────────────────────────────────────
  if (view === 'all-calves') {
    return (
      <AllCalvesView
        calves={animals}
        pastures={pastures}
        seasons={seasons}
        onBack={() => navigate('/calving')}
        onEditCalf={(animal) => { setEditAnimal(animal); navigate(`/calving/edit/${animal.id}`); }}
      />
    );
  }
  // ── ADD CALF FORM VIEW ────────────────────────────────────
  if (view === 'add-calf') {
    return (
      <div className="min-h-screen pb-[60px] bg-background" id="calving-scroll-container">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-green-200"
          style={{ background: GREEN_DARK }}>
          <button onClick={() => navigate('/calving')} className="text-white/80 hover:text-white p-2 -ml-2">
            <X className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-lg">Add New Calf</h1>
          <div className="w-10" />
        </div>
        <div className="px-5 py-6 max-w-lg mx-auto">
          <QuickCalfForm
            onSave={handleQuickSave}
            onCancel={() => navigate('/calving')}
            seasons={seasons}
            pastures={pastures}
            isTwinDefault={isTwinDefault}
            setIsTwinDefault={setIsTwinDefault}
          />
        </div>
      </div>
    );
  }
  // ── EDIT ANIMAL VIEW ──────────────────────────────────────
  if (view === 'edit-animal' && editAnimal) {
    return (
      <div className="min-h-screen pb-[60px] bg-background" id="calving-scroll-container">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-green-200"
          style={{ background: GREEN_DARK }}>
          <button onClick={() => navigate('/calving')} className="text-white/80 hover:text-white p-2 -ml-2">
            <X className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-lg">Edit #{editAnimal.tag_number}</h1>
          <div className="w-10" />
        </div>
        <div className="px-5 py-6 max-w-lg mx-auto">
          <AnimalForm
            animal={editAnimal}
            onSave={handleEditSave}
            onCancel={() => navigate('/calving')}
            existingAnimals={animals}
            seasons={seasons}
          />
        </div>
      </div>
    );
  }

  // ── CALVING AI ASSISTANT OVERLAY ─────────────────────────
  if (showAI) {
    return (
      <CalvingAIAssistant
        animals={animals}
        seasons={seasons}
        pastures={pastures}
        selectedSeasonId={selectedSeasonId !== 'all' ? selectedSeasonId : seasons[0]?.id}
        onClose={() => setShowAI(false)}
      />
    );
  }


  // ── MAIN VIEW ─────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-[60px] bg-background" id="calving-scroll-container">

      {/* ── Season Header Bar ────────────────────────────── */}
      <div className="sticky top-0 z-10 px-4 py-3 shadow-md flex items-center justify-between" style={{ background: GREEN_DARK }}>
        <div className="flex-1">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Calving Season</p>
          <button
            onClick={() => setShowSeasonPicker(true)}
            className="flex items-center gap-2 mt-0.5"
          >
            <span className="font-heading font-black text-white text-xl leading-tight">{seasonLabel}</span>
            <ChevronDown className="w-5 h-5 text-white/70" />
          </button>
        </div>
        {selectedSeason && (
          <button
            onClick={() => {
              setEditSeasonForm(selectedSeason);
              setShowEditSeasonDialog(true);
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Edit season"
          >
            <Edit2 className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-6">

        {/* ── BIG ADD CALF BUTTON ─────────────────────── */}
         <button
           onClick={() => navigate('/calving/add-calf')}
           className="w-full h-20 rounded-2xl font-heading font-black text-2xl text-white shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
           style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})` }}
         >
           <Plus className="w-7 h-7 stroke-[3px]" />
           Add New Calf{isTwinDefault ? ' 👯' : ''}
         </button>

         {/* ── VIEW ALL CALVES + REPORTS BUTTONS ──────────────────── */}
         <div className="grid grid-cols-2 gap-3">
           <button
             onClick={() => navigate('/calving/all-calves')}
             className="h-14 rounded-2xl font-heading font-bold text-base border-2 border-green-300 text-green-800 bg-white hover:bg-green-50 active:scale-[0.98] transition-all"
           >
             View All ({calves.length})
           </button>
           <button
             onClick={() => navigate('/calving/reports')}
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
          ) : recentActivity.length === 0 ? (
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm px-5 py-10 text-center">
              <p className="text-4xl mb-3">🐄</p>
              <p className="font-bold text-gray-700">No calves recorded yet</p>
              <p className="text-sm text-gray-400 mt-1">Tap "Add New Calf" to log your first one.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden divide-y divide-gray-100">
              {recentActivity.map((entry, i) => (
                <button
                  key={`${entry.animal?.id}-${i}`}
                  onClick={() => { if (entry.animal?.id) { setEditAnimal(entry.animal); navigate(`/calving/edit/${entry.animal.id}`); } }}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-green-50 active:bg-green-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: entry.action === 'Added' ? '#E8F5E9' : '#FFF3E0' }}>
                      {entry.action === 'Added' ? '🐄' : '✏️'}
                    </div>
                    <div>
                      <p className="font-heading font-bold text-base text-gray-900">
                        #{entry.animal?.tag_number}
                        <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                          entry.action === 'Added'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>{entry.action}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{entry.summary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">
                      {format(entry.date, 'MMM d, h:mm a')}
                    </span>
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

      {/* ── Edit Season Dialog ────────────────────────────── */}
      <Dialog open={showEditSeasonDialog} onOpenChange={setShowEditSeasonDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Calving Season</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold">Year</Label>
              <Input
                type="number"
                value={editSeasonForm.year || ''}
                onChange={e => setEditSeasonForm(prev => ({ ...prev, year: parseInt(e.target.value) || '' }))}
                className="h-12 text-lg mt-1"
                min="2000"
                max="2100"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Label</Label>
              <Input
                type="text"
                value={editSeasonForm.label || ''}
                onChange={e => setEditSeasonForm(prev => ({ ...prev, label: e.target.value }))}
                className="h-12 mt-1"
                placeholder="e.g. Calving Season 2026"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Notes</Label>
              <Textarea
                value={editSeasonForm.notes || ''}
                onChange={e => setEditSeasonForm(prev => ({ ...prev, notes: e.target.value }))}
                className="mt-1 resize-none"
                placeholder="Season notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditSeasonDialog(false)}>Cancel</Button>
            <Button
              onClick={() => updateSeasonMutation.mutate({ id: editSeasonForm.id, data: editSeasonForm })}
              style={{ background: GREEN, border: 'none' }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
