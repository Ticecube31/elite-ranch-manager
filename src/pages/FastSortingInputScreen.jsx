import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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

  // Auto-focus input on load
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Real-time lookup as user types
  useEffect(() => {
    if (!cowNumber.trim()) {
      setMatchedAnimal(null);
      return;
    }
    const found = animals.find(a => a.tag_number === cowNumber.trim());
    setMatchedAnimal(found || null);
  }, [cowNumber, animals]);

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

  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BLUE_LIGHT }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: `${BLUE}30`, borderTopColor: BLUE }} />
      </div>
    );
  }

  const isMatchingLeft = matchedAnimal && matchedAnimal.sex === 'Male';
  const isMatchingRight = matchedAnimal && matchedAnimal.sex === 'Female';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BLUE_LIGHT }}>

      {/* ── TOP HEADER ──────────────────────────────────────── */}
      <div className="sticky top-0 z-20 shrink-0 flex items-center justify-between px-4 h-16" style={{ background: BLUE_DARK }}>
        <button
          onClick={handleEndSession}
          className="text-white/80 hover:text-white p-2 -ml-2 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Sorting Session</p>
          <p className="font-heading font-black text-white text-base leading-tight">{session.session_name || 'Session'}</p>
          {session.session_date && (
            <p className="text-white/60 text-xs mt-0.5">{format(new Date(session.session_date), 'MMM d, yyyy')}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-white/60 text-xs font-semibold">Sorted</p>
          <p className="font-heading font-black text-white text-xl leading-tight">{session.total_sorted || 0}</p>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── COW NUMBER INPUT (Top third) ──────────────────── */}
        <div className="shrink-0 px-4 pt-6 pb-2 flex flex-col gap-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Enter Cow #</label>
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
        </div>

        {/* ── SEX DISPLAY ────────────────────────────────────── */}
        <div className="shrink-0 px-4 py-3 text-center">
          {matchedAnimal ? (
            <div>
              <p className="font-heading font-black text-2xl" style={{ color: BLUE_DARK }}>
                Cow #{matchedAnimal.tag_number} → {matchedAnimal.sex.toUpperCase()}
              </p>
              <p className="text-lg font-bold mt-1" style={{ color: BLUE }}>
                {matchedAnimal.animal_type}
              </p>
            </div>
          ) : cowNumber.trim() ? (
            <p className="font-heading font-black text-xl text-red-500">❌ No matching cow found</p>
          ) : (
            <p className="text-lg text-gray-400">Enter a cow number to begin</p>
          )}
        </div>

        {/* ── SORTING ZONES (left/right split) ───────────────── */}
        <div className="flex-1 flex overflow-hidden gap-0">

          {/* ── LEFT ZONE ────────────────────────────────────── */}
          <button
            onClick={() => handleSort('Left')}
            disabled={!matchedAnimal}
            className={`flex-1 flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
            style={{
              background: isMatchingLeft ? `linear-gradient(135deg, ${SKY_BLUE}, ${BLUE_LIGHT})` : BLUE_LIGHT,
              boxShadow: isMatchingLeft ? `inset 0 0 40px ${BLUE}40` : 'none',
            }}
          >
            <ChevronLeft className="w-24 h-24 stroke-[1.5px]" style={{ color: isMatchingLeft ? BLUE_DARK : '#ccc' }} />
            <p className="font-heading font-black text-2xl mt-4" style={{ color: isMatchingLeft ? BLUE_DARK : '#999' }}>
              {session.left_pen_label || 'LEFT'}
            </p>
            <p className="text-sm font-semibold mt-2 text-gray-400">{session.left_count || 0} sorted</p>
          </button>

          {/* ── RIGHT ZONE ───────────────────────────────────── */}
          <button
            onClick={() => handleSort('Right')}
            disabled={!matchedAnimal}
            className={`flex-1 flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
            style={{
              background: isMatchingRight ? `linear-gradient(135deg, ${SKY_BLUE}, ${BLUE_LIGHT})` : BLUE_LIGHT,
              boxShadow: isMatchingRight ? `inset 0 0 40px ${BLUE}40` : 'none',
            }}
          >
            <ChevronRight className="w-24 h-24 stroke-[1.5px]" style={{ color: isMatchingRight ? BLUE_DARK : '#ccc' }} />
            <p className="font-heading font-black text-2xl mt-4" style={{ color: isMatchingRight ? BLUE_DARK : '#999' }}>
              {session.right_pen_label || 'RIGHT'}
            </p>
            <p className="text-sm font-semibold mt-2 text-gray-400">{session.right_count || 0} sorted</p>
          </button>
        </div>
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
            className="h-16 w-16 rounded-2xl flex items-center justify-center border-2 shadow-lg transition-all active:scale-[0.98]"
            style={{ borderColor: BLUE, color: BLUE }}
            title="Add note for this calf"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}