import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

const BLUE = '#2196F3';
const BLUE_DARK = '#1976D2';
const BLUE_BG = '#E3F2FD';
const BLUE_LIGHT = '#BBDEFB';

function SexButton({ sex, selected, onTap }) {
  return (
    <button
      onClick={() => onTap(sex)}
      className={`w-full h-16 rounded-2xl font-heading font-bold text-base transition-all active:scale-[0.98] border-2 ${
        selected
          ? 'text-white border-0 shadow-lg'
          : 'border-blue-200 text-gray-600 bg-white hover:bg-blue-50'
      }`}
      style={selected ? { background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})` } : {}}
    >
      {sex === 'Male' ? '♂ Male / Steer' : '♀ Female / Heifer'}
    </button>
  );
}

export default function PreSessionSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const [sessionName, setSessionName] = useState(`Sorting Session - ${format(new Date(), 'MMM d')}`);
  const [sessionDate, setSessionDate] = useState(today);
  const [leftSex, setLeftSex] = useState(null);
  const [rightSex, setRightSex] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Derive labels
  const leftLabel = leftSex || '(unassigned)';
  const rightLabel = rightSex || '(unassigned)';

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SortingSessions.create(data),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['sorting-sessions'] });
      toast.success('Session created!');
      navigate(`/sorting/${newSession.id}`);
    },
    onError: () => {
      toast.error('Failed to create session');
      setSaving(false);
    },
  });

  const handleLeftSexChange = (sex) => {
    if (leftSex === sex) {
      setLeftSex(null);
    } else {
      setLeftSex(sex);
      // Auto-assign opposite to right if needed
      if (rightSex === sex) {
        setRightSex(null);
      }
    }
  };

  const handleRightSexChange = (sex) => {
    if (rightSex === sex) {
      setRightSex(null);
    } else {
      setRightSex(sex);
      // Auto-assign opposite to left if needed
      if (leftSex === sex) {
        setLeftSex(null);
      }
    }
  };

  const isReady = leftSex !== null && rightSex !== null && leftSex !== rightSex;

  const handleStart = async () => {
    if (!isReady) return;
    setSaving(true);
    await createMutation.mutateAsync({
      session_name: sessionName,
      session_date: sessionDate,
      status: 'Active',
      left_pen_label: `${leftSex === 'Male' ? '♂ Male / Steer' : '♀ Female / Heifer'}`,
      right_pen_label: `${rightSex === 'Male' ? '♂ Male / Steer' : '♀ Female / Heifer'}`,
      sorted_animals: [],
      total_sorted: 0,
      left_count: 0,
      right_count: 0,
      notes: notes || '',
    });
  };

  return (
    <div className="min-h-screen pb-32 flex flex-col" style={{ background: BLUE_BG }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 shrink-0 flex items-center justify-between px-4 h-14" style={{ background: BLUE_DARK }}>
        <button onClick={() => navigate('/sorting')} className="text-white/80 hover:text-white p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-heading font-black text-white text-lg">New Sorting Session</h1>
        <div className="w-10" />
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto w-full space-y-6">

        {/* ── Session Name & Date ────────────────────────── */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Session Name</label>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="e.g., Spring Calf Sort 2026"
            className="w-full h-12 px-4 rounded-2xl border border-blue-200 bg-white text-base font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* ── Session Date ────────────────────────────────── */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</label>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="w-full h-12 px-4 rounded-2xl border border-blue-200 bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* ── Assign Pens to Sexes (MAIN SECTION) ────────── */}
        <div className="space-y-4">
          <h2 className="font-heading font-black text-xl" style={{ color: BLUE_DARK }}>Assign pens to sexes</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Left Pen */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-600">Left Pen</p>
              <SexButton sex="Male" selected={leftSex === 'Male'} onTap={handleLeftSexChange} />
              <SexButton sex="Female" selected={leftSex === 'Female'} onTap={handleLeftSexChange} />
            </div>

            {/* Right Pen */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-600">Right Pen</p>
              <SexButton sex="Male" selected={rightSex === 'Male'} onTap={handleRightSexChange} />
              <SexButton sex="Female" selected={rightSex === 'Female'} onTap={handleRightSexChange} />
            </div>
          </div>

          {/* Live Preview */}
          <div className="mt-4 rounded-2xl p-4 border-2 border-blue-200" style={{ background: BLUE_LIGHT }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview</p>
            <p className="font-heading font-bold text-base" style={{ color: BLUE_DARK }}>
              Left = {leftLabel}
            </p>
            <p className="font-heading font-bold text-base mt-1" style={{ color: BLUE_DARK }}>
              Right = {rightLabel}
            </p>
          </div>
        </div>

        {/* ── Session Notes ──────────────────────────────── */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Weather, crew, pen conditions..."
            className="w-full px-4 py-3 rounded-2xl border border-blue-200 bg-white text-base font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none h-20"
          />
        </div>

      </div>

      {/* ── Bottom Action Bar ──────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-blue-100 shadow-2xl">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleStart}
            disabled={!isReady || saving}
            className={`w-full h-14 rounded-2xl font-heading font-bold text-base text-white shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
              isReady ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
            }`}
            style={{ background: isReady ? `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})` : '#BDBDBD' }}
          >
            {saving ? 'Creating Session...' : 'Start Sorting Session'}
            {!saving && <ChevronRight className="w-5 h-5" />}
          </button>
          {!isReady && (
            <p className="text-center text-xs text-gray-500 mt-2">Assign both left and right pens to start</p>
          )}
        </div>
      </div>
    </div>
  );
}