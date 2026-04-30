import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import NumericKeypad from '@/components/sorting/NumericKeypad';

const BLUE = '#2196F3';
const BLUE_DARK = '#1565C0';
const BLUE_LIGHT = '#E3F2FD';
const SKY_BLUE = '#81D4FA';
const GREEN = '#4CAF50';
const GREEN_DARK = '#2E7D32';

export default function FastSortingInputScreen() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const queryClient = useQueryClient();
  
  const [cowNumber, setCowNumber] = useState('');
  const [matchedAnimal, setMatchedAnimal] = useState(null);
  const [noteSynced, setNoteSynced] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateSelector, setShowDuplicateSelector] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [twinWarningSeenForCow, setTwinWarningSeenForCow] = useState(false);

  // Fetch session details
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['sorting-session', sessionId],
    queryFn: () => base44.entities.SortingSessions.filter({ id: sessionId }).then(list => list[0]),
    enabled: !!sessionId,
  });

  // Fetch all animals for lookup
  const { data: animals = [] } = useQuery({
    queryKey: ['animals'],
    queryFn: () => base44.entities.Animals.list('-created_date'),
    initialData: [],
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ['calving-seasons'],
    queryFn: () => base44.entities.CalvingSeasons.list('-year'),
    initialData: [],
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Update session mutation with optimistic update
  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SortingSessions.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['sorting-session', sessionId] });
      const previous = queryClient.getQueryData(['sorting-session', sessionId]);
      queryClient.setQueryData(['sorting-session', sessionId], prev => prev ? { ...prev, ...data } : prev);
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sorting-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sorting-sessions'] });
    },
    onError: (err, vars, context) => {
      if (context?.previous) queryClient.setQueryData(['sorting-session', sessionId], context.previous);
    },
  });

  // Update animal mutation for notes with optimistic update
  const updateAnimalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Animals.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['animals'] });
      const previous = queryClient.getQueryData(['animals']) ?? [];
      queryClient.setQueryData(['animals'], previous.map(a => a.id === id ? { ...a, ...data } : a));
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
    },
    onError: (err, vars, context) => {
      if (context?.previous) queryClient.setQueryData(['animals'], context.previous);
    },
  });

  // Real-time lookup as user enters numbers
  useEffect(() => {
    if (!cowNumber.trim()) {
      setMatchedAnimal(null);
      setDuplicates([]);
      setShowDuplicateSelector(false);
      setTwinWarningSeenForCow(false);
      return;
    }

    const cowTypes = ['Cow', '1st Calf Heifer'];
    const matches = animals.filter(a =>
      a.tag_number?.toLowerCase() === cowNumber.trim().toLowerCase() &&
      cowTypes.includes(a.animal_type)
    );
    if (matches.length === 1) {
      setMatchedAnimal(matches[0]);
      setDuplicates([]);
      setShowDuplicateSelector(false);
      setTwinWarningSeenForCow(false);
    } else if (matches.length > 1) {
      setDuplicates(matches);
      setShowDuplicateSelector(true);
      setMatchedAnimal(null);
      setTwinWarningSeenForCow(false);
    } else {
      setMatchedAnimal(null);
      setDuplicates([]);
      setShowDuplicateSelector(false);
      setTwinWarningSeenForCow(false);
    }
  }, [cowNumber, animals, session, seasons]);

  const getCowBirthYear = (animal) => {
    if (!animal) return 'Unknown';
    if (animal.birth_year) return animal.birth_year;
    if (animal.date_of_birth) return new Date(animal.date_of_birth).getFullYear();
    return 'Unknown';
  };

  const handleKeypadInput = (digit) => {
    setCowNumber(prev => prev + digit);
  };

  const handleBackspace = () => {
    setCowNumber(prev => prev.slice(0, -1));
  };

  const handleSort = async (direction) => {
    if (!matchedAnimal) {
      toast.error('No matching cow found');
      return;
    }

    if (!session) {
      toast.error('Session not loaded');
      return;
    }

    const newEntry = {
      animal_number: matchedAnimal.tag_number,
      tag_number: matchedAnimal.tag_number,
      direction: direction,
      sex: matchedAnimal.sex,
      animal_type: matchedAnimal.animal_type,
      mother_animal_number: matchedAnimal.mother_animal_number || '',
      location: '',
      timestamp: new Date().toISOString(),
      sorted_by: currentUser?.email || 'unknown',
    };

    const updatedSorted = [...(session.sorted_animals || []), newEntry];
    const leftCount = updatedSorted.filter(e => e.direction === 'Left').length;
    const rightCount = updatedSorted.filter(e => e.direction === 'Right').length;

    await updateSessionMutation.mutateAsync({
      id: session.id,
      data: {
        sorted_animals: updatedSorted,
        total_sorted: updatedSorted.length,
        left_count: leftCount,
        right_count: rightCount,
      },
    });

    toast.success(`✓ #${matchedAnimal.tag_number} → ${direction}`);
    setCowNumber('');
    setNoteSynced(false);
    setTwinWarningSeenForCow(false);
  };

  const handleSortAndNext = async () => {
    if (!matchedAnimal) return;
    const sessionYear = session?.session_date ? Number(session.session_date.split('-')[0]) : null;
    const sessionSeasonId = session?.calving_season_id || seasons.find((season) => season.year === sessionYear)?.id;
    // Sort to the pen matching the calf's sex if available
    const calf = animals.find(a =>
      a.mother_animal_number === matchedAnimal.tag_number &&
      ['Calf - Heifer', 'Calf - Steer'].includes(a.animal_type) &&
      (!sessionSeasonId || a.calving_season_id === sessionSeasonId)
    );
    if (calf?.sex === 'Male') {
      await handleSort('Left');
    } else if (calf?.sex === 'Female') {
      await handleSort('Right');
    } else {
      // No calf or no sex match — let user choose
      toast.info('No matching calf found. Choose left or right.');
    }
  };

  const handleEndSession = async (saveProgress) => {
    if (saveProgress) {
      await updateSessionMutation.mutateAsync({
        id: session.id,
        data: { status: 'Completed', completed_at: new Date().toISOString() },
      });
    }
    navigate('/sorting');
  };

  const handleAddNote = async () => {
    if (!matchedAnimal || !noteText.trim()) {
      toast.error('Please enter a note');
      return;
    }

    const noteEntry = `[${format(new Date(), 'MMM d, yyyy h:mm a')}] ${noteText.trim()}`;
    const currentNotes = matchedAnimal.notes ? `${matchedAnimal.notes}\n${noteEntry}` : noteEntry;

    await updateAnimalMutation.mutateAsync({
      id: matchedAnimal.id,
      data: { notes: currentNotes },
    });

    toast.success(`✓ Note added to #${matchedAnimal.tag_number}`);
    setShowNoteDialog(false);
    setNoteText('');
  };

  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BLUE_LIGHT }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: `${BLUE}30`, borderTopColor: BLUE }} />
      </div>
    );
  }

  const sessionYear = session?.session_date ? Number(session.session_date.split('-')[0]) : null;
  const sessionSeasonId = session?.calving_season_id || seasons.find((season) => season.year === sessionYear)?.id;
  const calvesForMatchedCow = matchedAnimal
    ? animals.filter((animal) =>
        animal.mother_animal_number === matchedAnimal.tag_number &&
        ['Calf - Heifer', 'Calf - Steer'].includes(animal.animal_type) &&
        (!sessionSeasonId || animal.calving_season_id === sessionSeasonId)
      )
    : [];
  const hasTwinsForMatchedCow = calvesForMatchedCow.length > 1 || calvesForMatchedCow.some((animal) => animal.twin);
  const needsTwinWarningAck = matchedAnimal && hasTwinsForMatchedCow && !twinWarningSeenForCow;

  return (
    <div className="min-h-screen flex flex-col pb-4" style={{ background: BLUE_LIGHT }}>

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 shrink-0 px-4 h-14 flex items-center justify-between" style={{ background: BLUE_DARK }}>
        <button
          onClick={() => setShowExitConfirm(true)}
          className="text-white/80 hover:text-white p-2 -ml-2 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <p className="font-heading font-bold text-white">{session.session_name || 'Session'}</p>
        <p className="font-heading font-black text-white text-xl">{session.total_sorted || 0}</p>
      </div>

      {/* ── MAIN LAYOUT (scrollable content) ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-lg mx-auto w-full space-y-4">

        {/* ── COUNT DISPLAY ────────────────────────────────────────── */}
        <div className="text-center">
          <div className="bg-white rounded-2xl border-2 border-blue-300 p-3">
            <p className="font-heading font-black text-sm text-gray-600 uppercase tracking-wider">Count</p>
            <p className="font-heading font-black text-3xl" style={{ color: BLUE_DARK }}>{session.total_sorted || 0}</p>
          </div>
        </div>

        {/* ── PEN DIRECTION BUTTONS ────────────────────────────────── */}
        <div className="flex gap-3">
          <button
            onClick={() => matchedAnimal && handleSort('Left')}
            disabled={!matchedAnimal || needsTwinWarningAck}
            className="flex-1 h-20 rounded-2xl font-heading font-black text-2xl text-white shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
            style={{ background: BLUE_DARK }}
            title={`${session.left_pen_label || 'LEFT'}`}
          >
            ← {session.left_pen_label || 'LEFT'}
          </button>
          <button
            onClick={() => matchedAnimal && handleSort('Right')}
            disabled={!matchedAnimal || needsTwinWarningAck}
            className="flex-1 h-20 rounded-2xl font-heading font-black text-2xl text-white shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
            style={{ background: BLUE_DARK }}
            title={`${session.right_pen_label || 'RIGHT'}`}
          >
            {session.right_pen_label || 'RIGHT'} →
          </button>
        </div>

        {/* ── COW TAG INPUT + YEAR DISPLAY ─────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <div className="bg-white rounded-2xl border-2 border-blue-300 p-3 text-center">
              <p className="text-xs text-gray-500 font-semibold mb-1">Cow Tag #</p>
              <p className="font-heading font-black text-3xl" style={{ color: matchedAnimal ? BLUE_DARK : '#ccc' }}>
                {cowNumber || '—'}
              </p>
            </div>
          </div>
          <div>
            <div className="bg-white rounded-2xl border-2 border-blue-300 p-3 text-center h-full flex flex-col items-center justify-center">
              <p className="text-xs text-gray-500 font-semibold">Year</p>
              <p className="font-heading font-black text-2xl" style={{ color: BLUE_DARK }}>
                {matchedAnimal ? getCowBirthYear(matchedAnimal) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* ── MATCHED ANIMAL DISPLAY ────────────────────────────────── */}
        {showDuplicateSelector && duplicates.length > 1 && (
          <div className="bg-white rounded-2xl border-2 p-3 space-y-2" style={{ borderColor: SKY_BLUE }}>
            <p className="text-xs font-bold text-gray-600 text-center">Multiple cows found — select the correct birth year:</p>
            {duplicates.map(dup => (
              <button
                key={dup.id}
                onClick={() => {
                  setMatchedAnimal(dup);
                  setShowDuplicateSelector(false);
                }}
                className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-blue-50 border border-blue-200 text-left"
              >
                #{dup.tag_number} • Birth year: {getCowBirthYear(dup)} • {dup.animal_type}
              </button>
            ))}
          </div>
        )}

        {matchedAnimal && (
          <div className="text-center bg-white rounded-2xl border-2 border-green-300 p-4">
            <p className="font-heading font-black text-lg" style={{ color: GREEN_DARK }}>
              ✓ #{matchedAnimal.tag_number}
            </p>
            <p className="text-sm text-gray-600 mt-1">{matchedAnimal.animal_type}</p>
            <p className="text-xs text-gray-500 mt-1">Birth year: {getCowBirthYear(matchedAnimal)}</p>
          </div>
        )}

        {matchedAnimal && calvesForMatchedCow.length === 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 text-center">
            <p className="font-heading font-black text-yellow-700">No calf from this calving season</p>
            <p className="text-sm text-yellow-700 mt-1">
              You can still sort cow #{matchedAnimal.tag_number} left or right so this movement is tracked.
            </p>
          </div>
        )}

        {needsTwinWarningAck && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-center space-y-2">
            <p className="font-heading font-black text-amber-700">⚠️ Twin calves detected</p>
            <p className="text-sm text-amber-700">
              Cow #{matchedAnimal.tag_number} has {calvesForMatchedCow.length} calves in this calving season.
              Confirm this before choosing left or right.
            </p>
            <Button
              type="button"
              onClick={() => setTwinWarningSeenForCow(true)}
              className="w-full"
              style={{ background: '#D97706', color: 'white' }}
            >
              I understand — continue sorting
            </Button>
          </div>
        )}

        {cowNumber.trim() && !matchedAnimal && !showDuplicateSelector && (
          <div className="text-center bg-white rounded-2xl border-2 border-red-300 p-4">
            <p className="font-heading font-black text-lg text-red-500">❌ Cow tag not found</p>
          </div>
        )}

        {/* ── NUMERIC KEYPAD ───────────────────────────────────────── */}
        <div>
          <NumericKeypad
            value={cowNumber}
            onInput={handleKeypadInput}
            onBackspace={handleBackspace}
            onSubmit={handleSortAndNext}
            disabled={false}
          />
        </div>

        {/* ── NOTE BUTTON ────────────────────────────────────────── */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowNoteDialog(true)}
            disabled={!matchedAnimal}
            className="h-14 w-full rounded-2xl flex items-center justify-center gap-2 border-2 shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-white font-heading font-bold text-lg"
            style={{ borderColor: BLUE, color: BLUE }}
          >
            <Plus className="w-6 h-6" />
            Add Note
          </button>
        </div>

      </div>

      {/* ── NOTE DIALOG ──────────────────────────────────────────────── */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Note to #{matchedAnimal?.tag_number}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter note..."
              className="min-h-24"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-2">Timestamp added automatically</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button onClick={handleAddNote} style={{ background: BLUE, border: 'none', color: 'white' }}>Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EXIT CONFIRMATION DIALOG ──────────────────────────────── */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Exit Sorting Session?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 py-2">Save your progress before leaving.</p>
          <DialogFooter className="flex gap-2 flex-col">
            <Button onClick={() => handleEndSession(true)} style={{ background: BLUE, border: 'none', color: 'white' }}>
              Exit and Save
            </Button>
            <Button onClick={() => handleEndSession(false)} variant="outline">
              Exit Without Saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}