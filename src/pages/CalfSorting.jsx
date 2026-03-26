import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Search, Plus, CheckCircle, Clock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import ExportButtons from '@/components/shared/ExportButtons';
import EmptyState from '@/components/shared/EmptyState';

function SortingWorkArea({ session, onComplete }) {
  const [lookup, setLookup] = useState('');
  const [foundAnimal, setFoundAnimal] = useState(null);
  const queryClient = useQueryClient();

  const { data: animals = [] } = useQuery({
    queryKey: ['animals'],
    queryFn: () => base44.entities.Animals.list(),
    initialData: [],
  });

  const updateSession = useMutation({
    mutationFn: (data) => base44.entities.SortingSessions.update(session.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sorting-sessions'] }),
  });

  const searchAnimal = () => {
    if (!lookup.trim()) return;
    const found = animals.find(a => a.animal_number?.toLowerCase() === lookup.trim().toLowerCase());
    if (found) {
      setFoundAnimal(found);
    } else {
      toast.error(`Animal #${lookup} not found`);
      setFoundAnimal(null);
    }
  };

  const sortAnimal = (direction) => {
    if (!foundAnimal) return;
    const entry = {
      animal_number: foundAnimal.animal_number,
      direction,
      sex: foundAnimal.sex,
      animal_type: foundAnimal.animal_type,
      timestamp: new Date().toISOString(),
    };
    const sorted = [...(session.sorted_animals || []), entry];
    updateSession.mutate({ sorted_animals: sorted });
    toast.success(`#${foundAnimal.animal_number} → ${direction}`);
    setFoundAnimal(null);
    setLookup('');
  };

  const sorted = session.sorted_animals || [];
  const leftCount = sorted.filter(s => s.direction === 'Left').length;
  const rightCount = sorted.filter(s => s.direction === 'Right').length;

  return (
    <div className="space-y-6">
      {/* Score Board */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-center">
          <ArrowLeft className="w-6 h-6 text-blue-600 mx-auto" />
          <p className="text-3xl font-heading font-black text-blue-700 mt-1">{leftCount}</p>
          <p className="text-xs font-semibold text-blue-600">LEFT</p>
        </div>
        <div className="bg-card border-2 border-border rounded-2xl p-4 text-center">
          <p className="text-3xl font-heading font-black text-foreground">{sorted.length}</p>
          <p className="text-xs font-semibold text-muted-foreground">TOTAL</p>
        </div>
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-center">
          <ArrowRight className="w-6 h-6 text-emerald-600 mx-auto" />
          <p className="text-3xl font-heading font-black text-emerald-700 mt-1">{rightCount}</p>
          <p className="text-xs font-semibold text-emerald-600">RIGHT</p>
        </div>
      </div>

      {/* Lookup */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="Enter cow # to sort..."
            className="h-16 text-2xl font-bold text-center"
            onKeyDown={(e) => e.key === 'Enter' && searchAnimal()}
          />
          <Button onClick={searchAnimal} size="icon" className="h-16 w-16 shrink-0">
            <Search className="w-7 h-7" />
          </Button>
        </div>

        {/* Found Animal Display */}
        {foundAnimal && (
          <div className="bg-card border-2 border-primary rounded-2xl p-5 text-center space-y-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Found Animal</p>
              <h2 className="font-heading font-black text-4xl text-foreground">
                #{foundAnimal.animal_number}
              </h2>
              <p className="text-lg font-semibold text-primary mt-1">
                {foundAnimal.sex} • {foundAnimal.animal_type}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => sortAnimal('Left')}
                className="h-20 rounded-2xl bg-blue-600 text-white font-heading font-bold text-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <ArrowLeft className="w-7 h-7" /> LEFT
              </button>
              <button
                onClick={() => sortAnimal('Right')}
                className="h-20 rounded-2xl bg-emerald-600 text-white font-heading font-bold text-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                RIGHT <ArrowRight className="w-7 h-7" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Sorts */}
      {sorted.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading font-bold text-base">Recent Sorts</h3>
            <ExportButtons data={sorted} filename={`sorting-${session.session_name}`} />
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...sorted].reverse().slice(0, 20).map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                <div>
                  <span className="font-bold">#{s.animal_number}</span>
                  <span className="text-sm text-muted-foreground ml-2">{s.sex} • {s.animal_type}</span>
                </div>
                <span className={`font-bold text-sm ${s.direction === 'Left' ? 'text-blue-600' : 'text-emerald-600'}`}>
                  {s.direction === 'Left' ? '← LEFT' : 'RIGHT →'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete */}
      <Button
        onClick={() => {
          updateSession.mutate({ status: 'Completed' });
          onComplete();
          toast.success('Session completed!');
        }}
        variant="outline"
        className="w-full h-14 text-base font-semibold"
      >
        <CheckCircle className="w-5 h-5 mr-2" /> Complete Session
      </Button>
    </div>
  );
}

export default function CalfSorting() {
  const [showNewSession, setShowNewSession] = useState(false);
  const [newName, setNewName] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sorting-sessions'],
    queryFn: () => base44.entities.SortingSessions.list('-created_date'),
    initialData: [],
  });

  const createSession = useMutation({
    mutationFn: (data) => base44.entities.SortingSessions.create(data),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sorting-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['sorting-stats'] });
      setActiveSession(session);
      setShowNewSession(false);
      setNewName('');
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error('Give your session a name');
      return;
    }
    createSession.mutate({
      session_name: newName,
      session_date: new Date().toISOString().split('T')[0],
      status: 'Active',
      sorted_animals: [],
    });
  };

  if (activeSession) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading font-black text-2xl">{activeSession.session_name}</h1>
            <p className="text-sm text-muted-foreground">Sorting in progress</p>
          </div>
          <Button variant="outline" onClick={() => setActiveSession(null)} className="h-10">
            Back
          </Button>
        </div>
        <SortingWorkArea
          session={activeSession}
          onComplete={() => setActiveSession(null)}
        />
  
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-2xl text-foreground">Calf Sorting</h1>
          <p className="text-sm text-muted-foreground">{sessions.length} sessions</p>
        </div>
        <Button onClick={() => setShowNewSession(true)} className="h-12 px-5 text-base font-semibold rounded-xl">
          <Plus className="w-5 h-5 mr-2" /> New Session
        </Button>
      </div>

      {/* Session List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={ArrowLeft}
          title="No Sorting Sessions"
          description="Start a new session to begin sorting calves left or right by tag number."
          action={
            <Button onClick={() => setShowNewSession(true)} className="h-12 px-6">
              <Plus className="w-5 h-5 mr-2" /> Start First Session
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => setActiveSession(session)}
              className="w-full text-left bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-bold text-lg">{session.session_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {session.sorted_animals?.length || 0} sorted • {session.session_date}
                  </p>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  session.status === 'Active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {session.status === 'Active' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                  {session.status}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New Session Sheet */}
      <Sheet open={showNewSession} onOpenChange={setShowNewSession}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-heading text-xl">New Sorting Session</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Session name (e.g. Spring Sort 2026)"
              className="h-14 text-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate} className="w-full h-14 text-base font-semibold">
              Start Sorting
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}