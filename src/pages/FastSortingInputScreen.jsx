import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const BLUE = '#2196F3';
const BLUE_DARK = '#1565C0';
const BLUE_LIGHT = '#E3F2FD';
const SKY_BLUE = '#81D4FA';

export default function FastSortingInputScreen() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const queryClient = useQueryClient();
  
  const inputRef = useRef(null);
  
  const [cowNumber, setCowNumber] = useState('');
  const [matchedAnimal, setMatchedAnimal] = useState(null);
  const [noteSynced, setNoteSynced] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateSelector, setShowDuplicateSelector] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');

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

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SortingSessions.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sorting-session', sessionId] });
    },
  });

  // Update animal mutation for notes
  const updateAnimalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Animals.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
    },
  });

  // Auto-focus input on load
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Real-time lookup as user types
  useEffect(() => {
    if (!cowNumber.trim()) {
      setMatchedAnimal(null);
      setDuplicates([]);
      setShowDuplicateSelector(false);
      return;
    }
    const cowTypes = ['Cow', '1st Calf Heifer'];
    const matches = animals.filter(a => a.tag_number === cowNumber.trim() && cowTypes.includes(a.animal_type));
    if (matches.length === 1) {
      setMatchedAnimal(matches[0]);
      setDuplicates([]);
      setShowDuplicateSelector(false);
    } else if (matches.length > 1) {
      setDuplicates(matches);
      setShowDuplicateSelector(true);
      setMatchedAnimal(null);
    } else {
      setMatchedAnimal(null);
      setDuplicates([]);
      setShowDuplicateSelector(false);
    }
  }, [cowNumber, animals]);

  const getMotherBirthYear = (animal) => {
    if (!animal?.mother_animal_number) return null;
    const mother = animals.find(a => a.tag_number === animal.mother_animal_number);
    return mother?.birth_year || 'unknown';
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
      sorted_by: (await base44.auth.me())?.email || 'unknown',
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
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleEndSession = async () => {
    const confirmed = window.confirm('End sorting session and save progress?');
    if (!confirmed) return;
    await updateSessionMutation.mutateAsync({
      id: session.id,
      data: { status: 'Completed', completed_at: new Date().toISOString() },
    });
    navigate('/sorting');
  };

  const handleAddNote = async () => {
    if (!matchedAnimal || !noteText.trim()) {
      toast.error('Please enter a note');
      return;
    }

    const timestamp = new Date().toISOString();
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

  // Find the calf of the matched animal to determine pen direction based on baby's sex
  const calf = matchedAnimal ? animals.find(a => a.mother_animal_number === matchedAnimal.tag_number) : null;
  const calfSex = calf?.sex;
  const isMatchingLeft = calfSex === 'Male';
  const isMatchingRight = calfSex === 'Female';

  return (
    <div className="min-h-screen flex flex-col pb-[60px] bg-background">

      {/* ── TOP HEADER ──────────────────────────────────────── */}
      <div className="sticky top-0 z-20 shrink-0 flex items-center justify-between px-4 h-12" style={{ background: BLUE_DARK }}>
        <button
          onClick={handleEndSession}
          className="text-white/80 hover:text-white p-2 -ml-2 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="font-heading font-bold text-white text-sm">{session.session_name || 'Session'}</p>
        <p className="font-heading font-black text-white text-lg">{session.total_sorted || 0}</p>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── SORTING ZONES (left/right split) ───────────────── */}
        <div className="flex-1 flex overflow-hidden gap-0">

          {/* ── LEFT ZONE ────────────────────────────────────── */}
          <button
            onClick={() => handleSort('Left')}
            disabled={!matchedAnimal}
            className={`flex-1 flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
            style={{
              background: isMatchingLeft ? '#0D47A1' : BLUE_LIGHT,
              boxShadow: isMatchingLeft ? `0 0 30px ${BLUE}, inset 0 0 50px ${BLUE}60` : 'none',
            }}
          >
            <ChevronLeft className="w-16 h-16 stroke-[2.5px]" style={{ color: isMatchingLeft ? '#fff' : '#ccc' }} />
            <p className="font-heading font-black text-lg mt-2" style={{ color: isMatchingLeft ? '#fff' : '#999' }}>
              {session.left_pen_label || 'LEFT'}
            </p>
          </button>

          {/* ── RIGHT ZONE ───────────────────────────────────── */}
          <button
            onClick={() => handleSort('Right')}
            disabled={!matchedAnimal}
            className={`flex-1 flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
            style={{
              background: isMatchingRight ? '#0D47A1' : BLUE_LIGHT,
              boxShadow: isMatchingRight ? `0 0 30px ${BLUE}, inset 0 0 50px ${BLUE}60` : 'none',
            }}
          >
            <ChevronRight className="w-16 h-16 stroke-[2.5px]" style={{ color: isMatchingRight ? '#fff' : '#ccc' }} />
            <p className="font-heading font-black text-lg mt-2" style={{ color: isMatchingRight ? '#fff' : '#999' }}>
              {session.right_pen_label || 'RIGHT'}
            </p>
          </button>
        </div>
      </div>

      {/* ── COW NUMBER INPUT + INFO ────────────────────────── */}
      <div className="shrink-0 px-4 pt-4 pb-2 flex flex-col gap-3">
        <input
          ref={inputRef}
          type="number"
          value={cowNumber}
          onChange={(e) => setCowNumber(e.target.value)}
          placeholder="Enter Cow #"
          inputMode="numeric"
          className="w-full h-20 text-center text-5xl font-heading font-black border-0 rounded-2xl shadow-md"
          style={{
            background: 'white',
            color: matchedAnimal ? BLUE_DARK : '#999',
            outline: `3px solid ${matchedAnimal ? SKY_BLUE : '#ddd'}`,
            outlineOffset: '-3px',
          }}
        />
        
        {/* Duplicate selector */}
        {showDuplicateSelector && duplicates.length > 1 && (
          <div className="bg-white rounded-2xl border-2 p-3 space-y-2" style={{ borderColor: SKY_BLUE }}>
            <p className="text-xs font-bold text-gray-600 text-center">Multiple cows found. Select one:</p>
            {duplicates.map(dup => {
              const motherYear = getMotherBirthYear(dup);
              return (
                <button
                  key={dup.id}
                  onClick={() => {
                    setMatchedAnimal(dup);
                    setShowDuplicateSelector(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-sm font-bold bg-blue-50 border border-blue-200 hover:bg-blue-100 text-left"
                >
                  #{dup.tag_number} {dup.animal_type} {motherYear && `(Mom: ${motherYear})`}
                </button>
              );
            })}
          </div>
        )}

        {/* Sex Display */}
        {matchedAnimal && (
          <div className="text-center bg-white rounded-2xl p-3">
            <p className="font-heading font-black text-2xl" style={{ color: BLUE_DARK }}>
              Cow #{matchedAnimal.tag_number} · Born {matchedAnimal.birth_year || '—'}
            </p>
            <p className="text-lg font-bold mt-1" style={{ color: BLUE }}>
              {matchedAnimal.animal_type}
            </p>
            {getMotherBirthYear(matchedAnimal) && (
              <p className="text-sm text-gray-600 mt-1">Mom born: {getMotherBirthYear(matchedAnimal)}</p>
            )}
          </div>
        )}

        {cowNumber.trim() && !matchedAnimal && !showDuplicateSelector && (
          <p className="font-heading font-black text-xl text-red-500 text-center">❌ No matching cow found</p>
        )}
      </div>

      {/* ── BOTTOM ACTION BAR ────────────────────────────────── */}
      <div className="px-4 pt-2 pb-4 bg-white border-t-2" style={{ borderColor: BLUE_LIGHT }}>
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={() => { setCowNumber(''); inputRef.current?.focus(); }}
            className="flex-1 h-16 rounded-2xl font-heading font-black text-base text-white shadow-lg transition-all active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})` }}
          >
            CLEAR & NEXT
          </button>
          <button
            onClick={() => setShowNoteDialog(true)}
            disabled={!matchedAnimal}
            className="h-16 w-16 rounded-2xl flex items-center justify-center border-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: BLUE, color: BLUE }}
            title="Add note for this cow"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* ── NOTE DIALOG ──────────────────────────────────────── */}
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
            <p className="text-xs text-gray-400 mt-2">Timestamp will be added automatically</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button onClick={handleAddNote} style={{ background: BLUE, border: 'none', color: 'white' }}>Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}