import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Plus } from 'lucide-react';
import { format, isToday } from 'date-fns';

const BLUE = '#2196F3';
const BLUE_DARK = '#1976D2';
const BLUE_BG = '#E3F2FD';
const BLUE_LIGHT = '#BBDEFB';

function SummaryCard({ emoji, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 flex flex-col items-center justify-center text-center min-h-[110px]">
      <p className="text-3xl mb-2">{emoji}</p>
      <p className="font-heading font-black text-3xl" style={{ color: accent || BLUE }}>{value}</p>
      <p className="text-xs text-gray-500 font-semibold mt-1 leading-tight">{label}</p>
    </div>
  );
}

function SessionCard({ session }) {
  return (
    <button className="w-full text-left bg-white rounded-2xl border border-blue-100 p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-heading font-bold text-lg" style={{ color: BLUE_DARK }}>
            {session.session_name}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {session.session_date ? format(new Date(session.session_date), 'MMM d, yyyy') : 'No date'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-heading font-black text-2xl" style={{ color: BLUE }}>{session.total_sorted || 0}</p>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">sorted</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3 text-xs font-bold">
        <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">L: {session.left_count || 0}</span>
        <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">R: {session.right_count || 0}</span>
      </div>
    </button>
  );
}

export default function CalfSortingDashboard() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: sortingSessions = [] } = useQuery({
    queryKey: ['sorting-sessions'],
    queryFn: () => base44.entities.SortingSessions.list('-session_date'),
    initialData: [],
  });

  // Calculate summary stats
  const todaySorted = sortingSessions
    .filter(s => s.session_date && isToday(new Date(s.session_date)))
    .reduce((sum, s) => sum + (s.total_sorted || 0), 0);

  const totalSeasonSorted = sortingSessions.reduce((sum, s) => sum + (s.total_sorted || 0), 0);

  const activeSessions = sortingSessions.filter(s => s.status === 'Active');
  const currentSession = activeSessions.length > 0 ? activeSessions[0] : null;

  const recentSessions = sortingSessions.slice(0, 3);

  return (
    <div className="min-h-screen pb-20" style={{ background: BLUE_BG }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-5" style={{ background: `linear-gradient(135deg, ${BLUE_DARK}, ${BLUE})` }}>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">Phase 2</p>
        <h1 className="font-heading font-black text-white text-3xl leading-tight mt-0.5">Calf Sorting</h1>
        <p className="text-white/70 text-sm mt-1">Organize and sort your calves into groups</p>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">

        {/* ── Start New Session Button ────────────────────── */}
        <button
          className="w-full h-28 rounded-2xl font-heading font-black text-xl text-white shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          style={{ background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})` }}
        >
          <Plus className="w-7 h-7 stroke-[2.5px]" />
          Start New Sorting Session
        </button>

        {/* ── Quick Summary Cards ────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Summary</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <SummaryCard emoji="📊" label="Sorted Today" value={todaySorted} accent={BLUE_DARK} />
            <SummaryCard emoji="✅" label="This Season" value={totalSeasonSorted} accent="#1565C0" />
          </div>
          {currentSession && (
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Active Session</p>
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: BLUE_LIGHT, color: BLUE_DARK }}>
                  Live
                </span>
              </div>
              <p className="font-heading font-black text-2xl" style={{ color: BLUE_DARK }}>
                {currentSession.session_name || 'Session'}
              </p>
              <p className="text-sm text-gray-500 mt-1">{currentSession.total_sorted || 0} calves sorted</p>
            </div>
          )}
        </div>

        {/* ── Recent Sessions ────────────────────────────── */}
        {recentSessions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Recent Sessions</p>
            <div className="space-y-2">
              {recentSessions.map(session => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          </div>
        )}

        {/* ── View All Groups Button ──────────────────────── */}
        <button
          className="w-full h-14 rounded-2xl font-heading font-bold text-base border-2 bg-white active:scale-[0.98] transition-all flex items-center justify-between px-5"
          style={{ borderColor: BLUE, color: BLUE }}
        >
          <span>View All Sorted Groups</span>
          <ArrowRight className="w-5 h-5" />
        </button>

      </div>
    </div>
  );
}