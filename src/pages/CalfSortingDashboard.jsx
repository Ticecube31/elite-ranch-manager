import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Play, Check, Edit2 } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

function SessionCard({ session, onResume, onFinish, onEdit }) {
  const isActive = session.status === 'Active';
  
  return (
    <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
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
      <div className="flex gap-2 mb-3 text-xs font-bold">
        <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">L: {session.left_count || 0}</span>
        <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">R: {session.right_count || 0}</span>
      </div>
      <div className="flex gap-2">
        {isActive ? (
          <>
            <button
              onClick={() => onResume(session.id)}
              className="flex-1 h-9 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-1"
              style={{ background: BLUE }}
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
            <button
              onClick={() => onFinish(session.id)}
              className="h-9 w-9 rounded-lg flex items-center justify-center border-2 transition-all"
              style={{ borderColor: BLUE, color: BLUE }}
              title="Mark as finished"
            >
              <Check className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => onResume(session.id)}
            className="flex-1 h-9 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-1"
            style={{ background: BLUE }}
          >
            <Play className="w-4 h-4" />
            Resume
          </button>
        )}
        <button
          onClick={() => onEdit(session)}
          className="h-9 w-9 rounded-lg flex items-center justify-center border-2 transition-all"
          style={{ borderColor: BLUE, color: BLUE }}
          title="Edit session"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function CalfSortingDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLeftLabel, setEditLeftLabel] = useState('');
  const [editRightLabel, setEditRightLabel] = useState('');

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: sortingSessions = [] } = useQuery({
    queryKey: ['sorting-sessions'],
    queryFn: () => base44.entities.SortingSessions.list('-session_date'),
    initialData: [],
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SortingSessions.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sorting-sessions'] });
      toast.success('Session updated');
      setEditingSession(null);
    },
  });

  // Calculate summary stats
  const todaySorted = sortingSessions
    .filter(s => s.session_date && isToday(new Date(s.session_date)))
    .reduce((sum, s) => sum + (s.total_sorted || 0), 0);

  const totalSeasonSorted = sortingSessions.reduce((sum, s) => sum + (s.total_sorted || 0), 0);

  const activeSessions = sortingSessions.filter(s => s.status === 'Active');
  const currentSession = activeSessions.length > 0 ? activeSessions[0] : null;

  const recentSessions = sortingSessions.slice(0, 3);

  const handleResume = (sessionId) => {
    navigate(`/sorting/${sessionId}`);
  };

  const handleFinish = async (sessionId) => {
    await updateSessionMutation.mutateAsync({
      id: sessionId,
      data: { status: 'Completed', completed_at: new Date().toISOString() },
    });
    toast.success('Session marked as completed');
  };

  const handleEdit = (session) => {
    setEditingSession(session);
    setEditName(session.session_name);
    setEditLeftLabel(session.left_pen_label || 'Left');
    setEditRightLabel(session.right_pen_label || 'Right');
  };

  const handleSaveEdit = async () => {
    await updateSessionMutation.mutateAsync({
      id: editingSession.id,
      data: {
        session_name: editName,
        left_pen_label: editLeftLabel,
        right_pen_label: editRightLabel,
      },
    });
  };

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
          onClick={() => navigate('/sorting/setup')}
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
                 <SessionCard 
                   key={session.id} 
                   session={session}
                   onResume={handleResume}
                   onFinish={handleFinish}
                   onEdit={handleEdit}
                 />
               ))}
             </div>
           </div>
         )}

        {/* ── View All Groups Button ──────────────────────── */}
         <button
           onClick={() => navigate('/sorting/groups')}
           className="w-full h-14 rounded-2xl font-heading font-bold text-base border-2 bg-white active:scale-[0.98] transition-all flex items-center justify-between px-5"
           style={{ borderColor: BLUE, color: BLUE }}
         >
           <span>View All Sorted Groups</span>
           <ArrowRight className="w-5 h-5" />
         </button>

        </div>

        {/* ── Edit Session Dialog ──────────────────────────── */}
        <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
         <DialogContent className="max-w-sm">
           <DialogHeader>
             <DialogTitle>Edit Session Settings</DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div>
               <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Session Name</label>
               <input
                 type="text"
                 value={editName}
                 onChange={(e) => setEditName(e.target.value)}
                 className="w-full mt-1 h-10 px-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
               />
             </div>
             <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Left Pen</label>
                 <input
                   type="text"
                   value={editLeftLabel}
                   onChange={(e) => setEditLeftLabel(e.target.value)}
                   className="w-full mt-1 h-10 px-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                 />
               </div>
               <div>
                 <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Right Pen</label>
                 <input
                   type="text"
                   value={editRightLabel}
                   onChange={(e) => setEditRightLabel(e.target.value)}
                   className="w-full mt-1 h-10 px-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                 />
               </div>
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setEditingSession(null)}>Cancel</Button>
             <Button onClick={handleSaveEdit} style={{ background: BLUE, color: 'white', border: 'none' }}>Save</Button>
           </DialogFooter>
         </DialogContent>
        </Dialog>
        </div>
        );
        }