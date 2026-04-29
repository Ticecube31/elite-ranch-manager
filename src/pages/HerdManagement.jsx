import React, { useState, useEffect, useContext, useCallback } from 'react';
import { CalvingAIContext } from '@/components/layout/AppLayout';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/shared/PullToRefreshIndicator';
import { Search, Filter, ArrowLeft, Edit2, ChevronRight, TableProperties, List, BarChart3, Tag } from 'lucide-react';
import HerdReports from '@/components/herd/HerdReports';
import HerdManagementAIAssistant from '@/components/herd/HerdManagementAIAssistant';
import MasterSpreadsheet from '@/components/herd/MasterSpreadsheet';
import AnimalDetailView from '@/components/herd/AnimalDetailView';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, subDays } from 'date-fns';
import AnimalForm from '@/components/calving/AnimalForm';
import { toast } from 'sonner';
import { logTagHistory } from '@/lib/tagHistoryLogger';
import CalvingSeasonSpreadsheet from '@/components/herd/CalvingSeasonSpreadsheet';

const PURPLE = '#6B2D5E';
const PURPLE_DARK = '#4A1F40';
const PURPLE_BG = '#F9F4F8';
const PURPLE_LIGHT = '#F3E8F0';

const statusColors = {
  Alive:   'bg-emerald-100 text-emerald-800 border-emerald-200',
  Sold:    'bg-blue-100 text-blue-800 border-blue-200',
  Died:    'bg-red-100 text-red-800 border-red-200',
  Missing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const typeEmoji = {
  'Cow': '🐮', '1st Calf Heifer': '🐮', 'Calf - Heifer': '🐄', 'Bull': '🐂', 'Calf - Steer': '🐂',
};

// ── Summary Card ─────────────────────────────────────────────
function SummaryCard({ emoji, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4 flex flex-col items-center justify-center text-center min-h-[100px]">
      <p className="text-3xl mb-1">{emoji}</p>
      <p className="font-heading font-black text-3xl" style={{ color: accent || PURPLE }}>{value}</p>
      <p className="text-xs text-gray-500 font-semibold mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

export default function HerdManagement() {
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'spreadsheet' | 'all-animals' | 'detail' | 'edit'
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const queryClient = useQueryClient();

  const { setOpenHerdAI } = useContext(CalvingAIContext) || {};

  useEffect(() => {
    if (setOpenHerdAI) setOpenHerdAI(() => () => setShowAIAssistant(true));
  }, [setOpenHerdAI]);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [view, selectedAnimal]);

  const { data: animals = [], isLoading } = useQuery({
    queryKey: ['animals'],
    queryFn: () => base44.entities.Animals.list('-created_date'),
    initialData: [],
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ['calving-seasons'],
    queryFn: () => base44.entities.CalvingSeasons.list('-year'),
    initialData: [],
  });

  const { data: pastures = [] } = useQuery({
    queryKey: ['pastures'],
    queryFn: () => base44.entities.Pastures.list(),
    initialData: [],
  });

  const { data: sortingSessions = [] } = useQuery({
    queryKey: ['sorting-sessions'],
    queryFn: () => base44.entities.SortingSessions.list('-created_date'),
    initialData: [],
  });

  const { data: tagHistoryAll = [] } = useQuery({
    queryKey: ['tag-history'],
    queryFn: () => base44.entities.TagHistory.list('-change_date'),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Animals.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['animals'] });
      const previous = queryClient.getQueryData(['animals']) ?? [];
      queryClient.setQueryData(['animals'], previous.map(a => a.id === id ? { ...a, ...data } : a));
      setSelectedAnimal(prev => prev?.id === id ? { ...prev, ...data } : prev);
      return { previous };
    },
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      toast.success(`#${data.tag_number} updated!`);
      setView('detail');
    },
    onError: (err, vars, context) => {
      if (context?.previous) queryClient.setQueryData(['animals'], context.previous);
      toast.error('Failed to update animal');
    },
  });

  const handleSave = async (formData) => {
    const { id, created_date, updated_date, created_by, ...data } = formData;
    if (data.tag_number && data.tag_number !== selectedAnimal.tag_number) {
      logTagHistory({
        animalId: selectedAnimal.id,
        oldTagNumber: selectedAnimal.tag_number,
        newTagNumber: data.tag_number,
        reason: 'Manual correction in Herd Management',
        user: currentUser,
      });
      queryClient.invalidateQueries({ queryKey: ['tag-history'] });
    }
    await updateMutation.mutateAsync({ id: selectedAnimal.id, data });
  };

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['animals'] });
  }, [queryClient]);

  const { scrollableRef, isRefreshing, pullDistance, threshold } = usePullToRefresh(handleRefresh, 80);

  // ── Stats ─────────────────────────────────────────────────
  const total = animals.length;
  const alive = animals.filter(a => a.status === 'Alive').length;
  const cowsAndHeifers = animals.filter(a => ['Cow', '1st Calf Heifer', 'Calf - Heifer'].includes(a.animal_type)).length;
  const steersAndBulls = animals.filter(a => ['Bull', 'Calf - Steer'].includes(a.animal_type)).length;
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentTagChanges = tagHistoryAll.filter(h => h.change_date && new Date(h.change_date) >= sevenDaysAgo).length;

  const getPastureName = (pid) => pastures.find(p => p.id === pid)?.pasture_name;
  const getSeasonLabel = (sid) => { const s = seasons.find(s => s.id === sid); return s ? (s.label || `Season ${s.year}`) : null; };

  // ── Filter for All Animals view ───────────────────────────
  const filtered = animals.filter(a => {
    const matchSearch = !search ||
      a.tag_number?.toLowerCase().includes(search.toLowerCase()) ||
      a.mother_animal_number?.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === 'all' || a.animal_type === typeFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  // ── Timeline for detail view ──────────────────────────────
  const buildTimeline = (animal) => {
    if (!animal) return [];
    const events = [];
    if (animal.date_of_birth) events.push({ date: animal.date_of_birth, type: 'birth', label: `Born / Tagged — ${animal.animal_type} #${animal.tag_number}` });
    tagHistoryAll.filter(h => h.animal_id === animal.id).forEach(h => {
      const label = h.old_tag_number
        ? `Tag changed: #${h.old_tag_number} → #${h.new_tag_number}${h.reason ? ` (${h.reason})` : ''}${h.changed_by ? ` by ${h.changed_by}` : ''}`
        : `Initial tag assigned: #${h.new_tag_number}${h.reason ? ` — ${h.reason}` : ''}`;
      events.push({ date: h.change_date, type: 'tag', label });
    });
    sortingSessions.forEach(ss => {
      const entry = ss.sorted_animals?.find(e => e.tag_number === animal.tag_number);
      if (entry) events.push({ date: entry.timestamp || ss.session_date, type: 'sort', label: `Sorted ${entry.direction} — "${ss.session_name}"` });
    });
    if (animal.notes) {
      animal.notes.split('\n').forEach(line => {
        if (line.startsWith('Preg Check')) events.push({ date: null, type: 'preg', label: line });
      });
    }
    events.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });
    return events;
  };

  // ── SPREADSHEET VIEW ──────────────────────────────────────
  if (view === 'spreadsheet') {
    return <MasterSpreadsheet onBack={() => setView('dashboard')} currentUser={currentUser} />;
  }

  // ── REPORTS VIEW ──────────────────────────────────────────
  if (view === 'reports') {
    return <HerdReports onBack={() => setView('dashboard')} />;
  }

  // ── AI ASSISTANT ───────────────────────────────────────────
  if (showAIAssistant) {
    return (
      <HerdManagementAIAssistant
        onClose={() => setShowAIAssistant(false)}
        onOpenDetail={(id) => { setShowAIAssistant(false); setSelectedAnimal(animals.find(a => a.id === id) || { id }); setView('detail'); }}
        onOpenSpreadsheet={() => { setShowAIAssistant(false); setView('spreadsheet'); }}
      />
    );
  }

  // ── ANIMAL DETAIL VIEW (from all-animals list) ────────────
  if (view === 'detail' && selectedAnimal) {
    return (
      <AnimalDetailView
        animalId={selectedAnimal.id}
        onBack={() => setView('all-animals')}
        onNavigateToAnimal={(id) => setSelectedAnimal(animals.find(a => a.id === id) || { id })}
        currentUser={currentUser}
      />
    );
  }

  // ── EDIT VIEW ─────────────────────────────────────────────
  if (view === 'edit' && selectedAnimal) {
    return (
      <div className="min-h-screen" style={{ background: PURPLE_BG }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b"
          style={{ background: PURPLE_DARK }}>
          <button onClick={() => setView('detail')} className="text-white/80 hover:text-white p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-lg">Edit #{selectedAnimal.tag_number}</h1>
          <div className="w-10" />
        </div>
        <div className="px-5 py-6 max-w-lg mx-auto">
          <AnimalForm
            animal={selectedAnimal}
            onSave={handleSave}
            onCancel={() => setView('detail')}
            existingAnimals={animals}
            seasons={seasons}
          />
        </div>
      </div>
    );
  }

  // ── DETAIL VIEW ───────────────────────────────────────────
  if (view === 'detail' && selectedAnimal) {
    const timeline = buildTimeline(selectedAnimal);
    const mother = animals.find(a => a.tag_number === selectedAnimal.mother_animal_number);
    return (
      <div className="min-h-screen" style={{ background: PURPLE_BG }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14"
          style={{ background: PURPLE_DARK }}>
          <button onClick={() => setView('all-animals')} className="text-white/80 hover:text-white p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-lg">#{selectedAnimal.tag_number}</h1>
          <button onClick={() => setView('edit')} className="text-white/90 text-sm font-semibold pr-1">Edit</button>
        </div>
        <div className="px-4 py-5 max-w-2xl mx-auto space-y-4">
          <div className="bg-white rounded-2xl overflow-hidden border border-purple-100 shadow-sm">
            {selectedAnimal.photo_url ? (
              <img src={selectedAnimal.photo_url} alt="" className="w-full h-44 object-cover" />
            ) : (
              <div className="w-full h-28 flex items-center justify-center text-6xl" style={{ background: PURPLE_LIGHT }}>
                {typeEmoji[selectedAnimal.animal_type] || '🐄'}
              </div>
            )}
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-heading font-black text-3xl" style={{ color: PURPLE_DARK }}>#{selectedAnimal.tag_number}</h1>
                  <p className="text-gray-500 text-sm mt-0.5">{selectedAnimal.animal_type} · {selectedAnimal.sex}</p>
                </div>
                <Badge variant="outline" className={statusColors[selectedAnimal.status] || ''}>{selectedAnimal.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                {selectedAnimal.date_of_birth && (
                  <div className="rounded-xl p-3" style={{ background: PURPLE_LIGHT }}>
                    <p className="text-xs text-gray-400">Date of Birth</p>
                    <p className="font-semibold mt-0.5">{format(new Date(selectedAnimal.date_of_birth), 'MMM d, yyyy')}</p>
                  </div>
                )}
                {getPastureName(selectedAnimal.pasture_id) && (
                  <div className="rounded-xl p-3" style={{ background: PURPLE_LIGHT }}>
                    <p className="text-xs text-gray-400">Pasture</p>
                    <p className="font-semibold mt-0.5">📍 {getPastureName(selectedAnimal.pasture_id)}</p>
                  </div>
                )}
                {getSeasonLabel(selectedAnimal.calving_season_id) && (
                  <div className="rounded-xl p-3" style={{ background: PURPLE_LIGHT }}>
                    <p className="text-xs text-gray-400">Calving Season</p>
                    <p className="font-semibold mt-0.5">🗓 {getSeasonLabel(selectedAnimal.calving_season_id)}</p>
                  </div>
                )}
                {selectedAnimal.birth_year && (
                  <div className="rounded-xl p-3" style={{ background: PURPLE_LIGHT }}>
                    <p className="text-xs text-gray-400">Birth Year</p>
                    <p className="font-semibold mt-0.5">{selectedAnimal.birth_year}</p>
                  </div>
                )}
              </div>
              {selectedAnimal.mother_animal_number && (
                <div className="mt-4 rounded-xl p-3" style={{ background: PURPLE_LIGHT }}>
                  <p className="text-xs text-gray-400 mb-1">Mother Tag #</p>
                  {mother ? (
                    <button onClick={() => setSelectedAnimal(mother)} className="flex items-center gap-2 font-semibold text-sm" style={{ color: PURPLE }}>
                      🐮 #{mother.tag_number} — {mother.animal_type}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <p className="font-semibold text-sm">#{selectedAnimal.mother_animal_number}</p>
                  )}
                </div>
              )}
              {selectedAnimal.notes && (
                <div className="mt-4 rounded-xl p-3" style={{ background: PURPLE_LIGHT }}>
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedAnimal.notes}</p>
                </div>
              )}
            </div>
          </div>
          {timeline.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">History Timeline</p>
              <div className="space-y-2">
                {timeline.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white border border-purple-100 rounded-xl px-4 py-3">
                    <span className="text-lg shrink-0">
                      {ev.type === 'birth' ? '🐣' : ev.type === 'tag' ? '🏷️' : ev.type === 'sort' ? '🔀' : ev.type === 'preg' ? '🤰' : '📝'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{ev.label}</p>
                      {ev.date && <p className="text-xs text-gray-400 mt-0.5">{format(new Date(ev.date), 'MMM d, yyyy')}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── ALL ANIMALS VIEW ──────────────────────────────────────
  if (view === 'all-animals') {
    return (
      <div className="min-h-screen pb-[60px] bg-background" ref={scrollableRef}>
        <PullToRefreshIndicator pullDistance={pullDistance} threshold={threshold} isRefreshing={isRefreshing} />
        <div className="sticky top-0 z-10" style={{ background: PURPLE_DARK }}>
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => setView('dashboard')} className="text-white/80 hover:text-white p-2 -ml-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="font-heading font-black text-white text-xl">All Animals</h1>
            <div className="w-10" />
          </div>
          <div className="px-4 pb-4 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by tag # or mother #..."
                  className="pl-10 h-12 text-base bg-white border-0 rounded-2xl"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <Filter className="w-5 h-5 text-white" />
              </button>
            </div>
            {showFilters && (
              <div className="grid grid-cols-2 gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-10 bg-white border-0 rounded-xl"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Cow">Cow</SelectItem>
                    <SelectItem value="1st Calf Heifer">1st Calf Heifer</SelectItem>
                    <SelectItem value="Calf - Heifer">Calf - Heifer</SelectItem>
                    <SelectItem value="Bull">Bull</SelectItem>
                    <SelectItem value="Calf - Steer">Calf - Steer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 bg-white border-0 rounded-xl"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Alive">Alive</SelectItem>
                    <SelectItem value="Sold">Sold</SelectItem>
                    <SelectItem value="Died">Died</SelectItem>
                    <SelectItem value="Missing">Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <p className="px-4 pt-3 pb-1 text-sm font-semibold text-gray-400">{filtered.length} animals</p>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-t-purple-600 rounded-full animate-spin" style={{ borderColor: `${PURPLE}30`, borderTopColor: PURPLE }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 px-4">
            <p className="text-4xl mb-3">🐄</p>
            <p className="font-semibold text-gray-600">No animals found</p>
            <p className="text-sm mt-1">Adjust your filters or add animals in Calving Season.</p>
          </div>
        ) : (
          <div className="px-4 pb-10 space-y-3">
            {filtered.map(animal => (
              <button
                key={animal.id}
                onClick={() => { setSelectedAnimal(animal); setView('detail'); }}  
                className="w-full text-left bg-white rounded-2xl border border-purple-100 p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  {animal.photo_url ? (
                    <img src={animal.photo_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: PURPLE_LIGHT }}>
                      {typeEmoji[animal.animal_type] || '🐄'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-heading font-bold text-lg truncate" style={{ color: PURPLE_DARK }}>#{animal.tag_number}</h3>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[animal.status] || ''}`}>{animal.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{animal.animal_type} · {animal.sex}</p>
                    {animal.date_of_birth && (
                      <p className="text-xs text-gray-400 mt-0.5">Born: {format(new Date(animal.date_of_birth), 'MMM d, yyyy')}</p>
                    )}
                    {getPastureName(animal.pasture_id) && (
                      <p className="text-xs text-gray-400 mt-0.5">📍 {getPastureName(animal.pasture_id)}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── DASHBOARD VIEW ────────────────────────────────────────
  return (
    <div className="min-h-screen pb-[60px] bg-background">

      {/* Header */}
      <div className="px-4 pt-6 pb-5" style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})` }}>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">Phase 5</p>
        <h1 className="font-heading font-black text-white text-3xl leading-tight mt-0.5">Herd Management</h1>
        <p className="text-white/70 text-sm mt-1">{total} animals total</p>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">

        {/* Summary Cards */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Summary</p>
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard emoji="🐄" label="Total Animals" value={total} accent={PURPLE_DARK} />
            <SummaryCard emoji="✅" label="Active (Alive)" value={alive} accent="#2E7D32" />
            <SummaryCard emoji="🐮" label="Cows & Heifers" value={cowsAndHeifers} accent="#C2185B" />
            <SummaryCard emoji="🐂" label="Steers & Bulls" value={steersAndBulls} accent="#1565C0" />
          </div>
          <div className="mt-3">
            <div className="bg-white rounded-2xl border border-purple-100 shadow-sm px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: PURPLE_LIGHT }}>
                  <Tag className="w-5 h-5" style={{ color: PURPLE }} />
                </div>
                <div>
                  <p className="font-heading font-black text-2xl" style={{ color: PURPLE }}>{recentTagChanges}</p>
                  <p className="text-xs text-gray-500 font-semibold">Tag Changes (last 7 days)</p>
                </div>
              </div>
              {recentTagChanges > 0 && (
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: PURPLE_LIGHT, color: PURPLE }}>
                  Recent Activity
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main Action — Open Master Spreadsheet */}
        <div>
          <button
            onClick={() => setView('spreadsheet')}
            className="w-full h-24 rounded-2xl font-heading font-black text-xl text-white shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
          >
            <TableProperties className="w-7 h-7 stroke-[2.5px]" />
            Open Master Spreadsheet
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">View &amp; edit all animals in one Excel-like table</p>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setView('all-animals')}
            className="h-16 rounded-2xl font-heading font-bold text-base border-2 bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{ borderColor: PURPLE, color: PURPLE }}
          >
            <List className="w-5 h-5" />
            View All Animals
          </button>
          <button
            onClick={() => setView('reports')}
            className="h-16 rounded-2xl font-heading font-bold text-base border-2 bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            style={{ borderColor: PURPLE, color: PURPLE }}
          >
            <BarChart3 className="w-5 h-5" />
            Herd Reports
          </button>
        </div>

      </div>
    </div>
  );
}