import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, ArrowLeft, Edit2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { format } from 'date-fns';
import AnimalForm from '@/components/calving/AnimalForm';
import { toast } from 'sonner';
import { logTagHistory } from '@/lib/tagHistoryLogger';

const statusColors = {
  Alive:   'bg-emerald-100 text-emerald-800 border-emerald-200',
  Sold:    'bg-blue-100 text-blue-800 border-blue-200',
  Died:    'bg-red-100 text-red-800 border-red-200',
  Missing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const typeEmoji = {
  'Cow': '🐮', '1st Calf Heifer': '🐮', 'Calf - Heifer': '🐄', 'Bull': '🐂', 'Calf - Steer': '🐂',
};

export default function HerdManagement() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sexFilter, setSexFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const queryClient = useQueryClient();

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
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      setEditMode(false);
      toast.success(`#${data.tag_number} updated!`);
    },
  });

  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  // Scroll to top when switching views
  useEffect(() => { window.scrollTo(0, 0); }, [selectedAnimal, editMode]);

  const handleSave = async (formData) => {
    const { id, created_date, updated_date, created_by, ...data } = formData;
    await updateMutation.mutateAsync({ id: selectedAnimal.id, data });
    // Log tag change if tag number changed
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
    const updated = { ...selectedAnimal, ...data };
    setSelectedAnimal(updated);
  };

  const filtered = animals.filter(a => {
    const matchSearch = !search ||
      a.tag_number?.toLowerCase().includes(search.toLowerCase()) ||
      a.mother_animal_number?.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === 'all'   || a.animal_type === typeFilter;
    const matchSex    = sexFilter === 'all'     || a.sex === sexFilter;
    const matchStatus = statusFilter === 'all'  || a.status === statusFilter;
    return matchSearch && matchType && matchSex && matchStatus;
  });

  const getPastureName = (pid) => pastures.find(p => p.id === pid)?.pasture_name;
  const getSeasonLabel = (sid) => { const s = seasons.find(s => s.id === sid); return s ? (s.label || `Season ${s.year}`) : null; };

  // Build timeline for selected animal
  const buildTimeline = (animal) => {
    if (!animal) return [];
    const events = [];
    if (animal.date_of_birth) events.push({ date: animal.date_of_birth, type: 'birth', label: `Born / Tagged — ${animal.animal_type} #${animal.tag_number}` });
    // Tag history events
    tagHistoryAll.filter(h => h.animal_id === animal.id).forEach(h => {
      const label = h.old_tag_number
        ? `Tag changed: #${h.old_tag_number} → #${h.new_tag_number}${h.reason ? ` (${h.reason})` : ''}${h.changed_by ? ` by ${h.changed_by}` : ''}`
        : `Initial tag assigned: #${h.new_tag_number}${h.reason ? ` — ${h.reason}` : ''}`;
      events.push({ date: h.change_date, type: 'tag', label });
    });
    // Sort events from sorting sessions
    sortingSessions.forEach(ss => {
      const entry = ss.sorted_animals?.find(e => e.tag_number === animal.tag_number);
      if (entry) events.push({ date: entry.timestamp || ss.session_date, type: 'sort', label: `Sorted ${entry.direction} — "${ss.session_name}"` });
    });
    // Notes as timeline entries (lines starting with "Preg Check")
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

  const timeline = buildTimeline(selectedAnimal);
  const mother = selectedAnimal ? animals.find(a => a.tag_number === selectedAnimal.mother_animal_number) : null;

  // ── DETAIL VIEW ──────────────────────────────────────────
  if (selectedAnimal && !editMode) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">
        {/* Back */}
        <button onClick={() => setSelectedAnimal(null)} className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Herd
        </button>

        {/* Hero Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {selectedAnimal.photo_url ? (
            <img src={selectedAnimal.photo_url} alt="" className="w-full h-44 object-cover" />
          ) : (
            <div className="w-full h-32 flex items-center justify-center text-6xl bg-muted">
              {typeEmoji[selectedAnimal.animal_type] || '🐄'}
            </div>
          )}
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-heading font-black text-3xl text-foreground">#{selectedAnimal.tag_number}</h1>
                <p className="text-muted-foreground text-sm mt-0.5">{selectedAnimal.animal_type} · {selectedAnimal.sex}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline" className={statusColors[selectedAnimal.status] || ''}>
                  {selectedAnimal.status}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              </div>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              {selectedAnimal.date_of_birth && (
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="font-semibold mt-0.5">{format(new Date(selectedAnimal.date_of_birth), 'MMM d, yyyy')}</p>
                </div>
              )}
              {getPastureName(selectedAnimal.pasture_id) && (
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Pasture</p>
                  <p className="font-semibold mt-0.5">📍 {getPastureName(selectedAnimal.pasture_id)}</p>
                </div>
              )}
              {getSeasonLabel(selectedAnimal.calving_season_id) && (
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Calving Season</p>
                  <p className="font-semibold mt-0.5">🗓 {getSeasonLabel(selectedAnimal.calving_season_id)}</p>
                </div>
              )}
              {selectedAnimal.birth_year && (
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Birth Year</p>
                  <p className="font-semibold mt-0.5">{selectedAnimal.birth_year}</p>
                </div>
              )}
            </div>

            {/* Mother Link */}
            {selectedAnimal.mother_animal_number && (
              <div className="mt-4 bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Mother Tag #</p>
                {mother ? (
                  <button
                    onClick={() => setSelectedAnimal(mother)}
                    className="flex items-center gap-2 font-semibold text-sm text-primary"
                  >
                    🐮 #{mother.tag_number} — {mother.animal_type}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <p className="font-semibold text-sm">#{selectedAnimal.mother_animal_number}</p>
                )}
              </div>
            )}

            {/* Notes */}
            {selectedAnimal.notes && (
              <div className="mt-4 bg-muted rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{selectedAnimal.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">History Timeline</p>
            <div className="space-y-2">
              {timeline.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
                  <span className="text-lg shrink-0">
                    {ev.type === 'birth' ? '🐣' : ev.type === 'tag' ? '🏷️' : ev.type === 'sort' ? '🔀' : ev.type === 'preg' ? '🤰' : '📝'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{ev.label}</p>
                    {ev.date && <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(ev.date), 'MMM d, yyyy')}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── EDIT VIEW ────────────────────────────────────────────
  if (selectedAnimal && editMode) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        <button onClick={() => setEditMode(false)} className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Detail
        </button>
        <h2 className="font-heading font-bold text-xl">Edit #{selectedAnimal.tag_number}</h2>
        <AnimalForm
          animal={selectedAnimal}
          onSave={handleSave}
          onCancel={() => setEditMode(false)}
          existingAnimals={animals}
          seasons={seasons}
        />
      </div>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-heading font-black text-2xl text-foreground">Herd Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{animals.length} animals total</p>
      </div>

      {/* Search + Filter */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by tag # or mother #..."
              className="pl-10 h-12 text-base"
              autoFocus
            />
          </div>
          <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Cow">Cow</SelectItem>
                <SelectItem value="1st Calf Heifer">1st Calf Heifer</SelectItem>
                <SelectItem value="Calf - Heifer">Calf - Heifer</SelectItem>
                <SelectItem value="Bull">Bull</SelectItem>
                <SelectItem value="Calf - Steer">Calf - Steer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sexFilter} onValueChange={setSexFilter}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Sex" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sexes</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger>
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

      {/* Count */}
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">{filtered.length} animals</p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">🐄</p>
          <p className="font-semibold">No animals found</p>
          <p className="text-sm mt-1">Adjust your filters or add animals in Calving Season.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(animal => (
            <button
              key={animal.id}
              onClick={() => setSelectedAnimal(animal)}
              className="w-full text-left bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="flex items-start gap-3">
                {animal.photo_url ? (
                  <img src={animal.photo_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                    {typeEmoji[animal.animal_type] || '🐄'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-heading font-bold text-lg text-foreground truncate">#{animal.tag_number}</h3>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[animal.status] || ''}`}>
                      {animal.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{animal.animal_type} · {animal.sex}</p>
                  {animal.date_of_birth && (
                    <p className="text-xs text-muted-foreground mt-0.5">Born: {format(new Date(animal.date_of_birth), 'MMM d, yyyy')}</p>
                  )}
                  {getPastureName(animal.pasture_id) && (
                    <p className="text-xs text-muted-foreground mt-0.5">📍 {getPastureName(animal.pasture_id)}</p>
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