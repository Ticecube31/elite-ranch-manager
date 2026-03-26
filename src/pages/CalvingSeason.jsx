import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import AnimalForm from '@/components/calving/AnimalForm';
import AnimalCard from '@/components/calving/AnimalCard';
import ExportButtons from '@/components/shared/ExportButtons';
import EmptyState from '@/components/shared/EmptyState';
import AIHelpButton from '@/components/shared/AIHelpButton';
import { logAudit } from '@/lib/auditLogger';

export default function CalvingSeason() {
  const [showForm, setShowForm] = useState(false);
  const [editAnimal, setEditAnimal] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sexFilter, setSexFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' hides archived
  const [showFilters, setShowFilters] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const queryClient = useQueryClient();

  const { data: animals = [], isLoading } = useQuery({
    queryKey: ['animals'],
    queryFn: () => base44.entities.Animals.list('-created_date'),
    initialData: [],
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

  const filtered = animals.filter(a => {
    const matchSearch = !search ||
      a.animal_number?.toLowerCase().includes(search.toLowerCase()) ||
      a.mother_animal_number?.toLowerCase().includes(search.toLowerCase()) ||
      a.location?.toLowerCase().includes(search.toLowerCase()) ||
      a.breed?.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === 'all' || a.animal_type === typeFilter;
    const matchSex    = sexFilter === 'all' || a.sex === sexFilter;
    const matchStatus = statusFilter === 'all' || !a.is_archived;
    return matchSearch && matchType && matchSex && matchStatus;
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

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tag #, mother, location..."
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
                <SelectItem value="Calf">Calf</SelectItem>
                <SelectItem value="Cow">Cow</SelectItem>
                <SelectItem value="Heifer">Heifer</SelectItem>
                <SelectItem value="Bull">Bull</SelectItem>
                <SelectItem value="Steer">Steer</SelectItem>
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
          description="Tap 'Add Animal' to log your first calf or cow."
          action={
            <Button onClick={() => { setEditAnimal(null); setShowForm(true); }} className="h-12 px-6">
              <Plus className="w-5 h-5 mr-2" /> Add First Animal
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(animal => (
            <AnimalCard key={animal.id} animal={animal} onClick={() => handleEdit(animal)} />
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
          />
        </SheetContent>
      </Sheet>

      <AIHelpButton context="calving season - logging new calves and managing animal records" />
    </div>
  );
}