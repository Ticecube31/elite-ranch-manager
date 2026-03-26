import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, ChevronDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import AnimalForm from '@/components/calving/AnimalForm';
import AnimalCard from '@/components/calving/AnimalCard';
import ExportButtons from '@/components/shared/ExportButtons';
import EmptyState from '@/components/shared/EmptyState';
import { logAudit } from '@/lib/auditLogger';

export default function CalvingSeason() {
  const [showForm, setShowForm] = useState(false);
  const [editAnimal, setEditAnimal] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sexFilter, setSexFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);

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

  // Auto-select the active season on first load
  useEffect(() => {
    if (seasons.length > 0 && selectedSeasonId === 'all') {
      const active = seasons.find(s => s.status === 'Active');
      if (active) setSelectedSeasonId(active.id);
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
      setShowForm(false);
      toast.success(`Animal #${data.animal_number} saved!`);
      logAudit({ action: 'Created', entityType: 'Animal', entityId: created.id, entityLabel: `Animal #${data.animal_number}`, changeSummary: `New ${data.animal_type} (${data.sex}) created`, newValue: data, user: currentUser });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Animals.update(id, data),
    onSuccess: (_, { id, data }) => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      queryClient.invalidateQueries({ queryKey: ['animals-stats'] });
      setShowForm(false);
      setEditAnimal(null);
      toast.success(`Animal #${data.animal_number} updated!`);
      logAudit({ action: 'Updated', entityType: 'Animal', entityId: id, entityLabel: `Animal #${data.animal_number}`, changeSummary: `Record updated`, newValue: data, user: currentUser });
    },
  });

  const handleAddNewSeason = () => {
    const year = new Date().getFullYear();
    const exists = seasons.find(s => s.year === year);
    if (exists) { setSelectedSeasonId(exists.id); return; }
    createSeasonMutation.mutate({ year, label: `Calving Season ${year}`, status: 'Active' });
  };

  const handleSave = async (formData) => {
    const { id, created_date, updated_date, created_by, ...data } = formData;
    if (editAnimal) {
      await updateMutation.mutateAsync({ id: editAnimal.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (animal) => {
    setEditAnimal(animal);
    setShowForm(true);
  };

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  const filtered = animals.filter(a => {
    const matchSearch = !search ||
      a.animal_number?.toLowerCase().includes(search.toLowerCase()) ||
      a.mother_animal_number?.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === 'all' || a.animal_type === typeFilter;
    const matchSex    = sexFilter === 'all' || a.sex === sexFilter;
    const matchStatus = statusFilter === 'all' || !a.is_archived;
    const matchSeason = selectedSeasonId === 'all'
      ? true
      : a.calving_season_id === selectedSeasonId;
    return matchSearch && matchType && matchSex && matchStatus && matchSeason;
  });

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-2xl text-foreground">Calving Season</h1>
          <p className="text-sm text-muted-foreground">{animals.length} animals recorded</p>
        </div>
        <Button
          onClick={() => { setEditAnimal(null); setShowForm(true); }}
          className="h-12 px-5 text-base font-semibold rounded-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Animal
        </Button>
      </div>

      {/* Season Selector */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">Season</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddNewSeason} className="text-xs h-8">
            <Plus className="w-3 h-3 mr-1" /> New Season
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSeasonId('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              selectedSeasonId === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground'
            }`}
          >
            All
          </button>
          {seasons.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSeasonId(s.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-1.5 ${
                selectedSeasonId === s.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground'
              }`}
            >
              {s.year}
              {s.status === 'Active' && (
                <span className={`w-1.5 h-1.5 rounded-full ${selectedSeasonId === s.id ? 'bg-primary-foreground' : 'bg-emerald-500'}`} />
              )}
            </button>
          ))}
          {seasons.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No seasons yet — click "New Season" to create one.</p>
          )}
        </div>
        {selectedSeason && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} animals in <strong>{selectedSeason.label || `Calving Season ${selectedSeason.year}`}</strong>
            {' · '}
            <Badge variant="outline" className={`text-[10px] ${selectedSeason.status === 'Active' ? 'text-emerald-700 border-emerald-300' : 'text-muted-foreground'}`}>
              {selectedSeason.status}
            </Badge>
          </p>
        )}
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tag #, mother..."
              className="pl-10 h-12 text-base"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
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
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="all">Include Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Export */}
      {filtered.length > 0 && (
        <div className="flex justify-end">
          <ExportButtons data={filtered} filename="calving-records" />
        </div>
      )}

      {/* Animal List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No Animals Yet"
          description={selectedSeason ? `No animals recorded for ${selectedSeason.year} yet.` : "Tap 'Add Animal' to log your first calf or cow."}
          action={
            <Button onClick={() => { setEditAnimal(null); setShowForm(true); }} className="h-12 px-6">
              <Plus className="w-5 h-5 mr-2" /> Add First Animal
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(animal => (
            <AnimalCard key={animal.id} animal={animal} onClick={() => handleEdit(animal)} pastures={pastures} />
          ))}
        </div>
      )}

      {/* Form Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-heading text-xl">
              {editAnimal ? `Edit #${editAnimal.animal_number}` : 'New Animal'}
            </SheetTitle>
          </SheetHeader>
          <AnimalForm
            animal={editAnimal}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditAnimal(null); }}
            existingAnimals={animals}
            seasons={seasons}
            defaultSeasonId={selectedSeasonId !== 'all' ? selectedSeasonId : seasons.find(s => s.status === 'Active')?.id}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}