import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

const BLUE_DARK = '#1565C0';
const BLUE_LIGHT = '#E3F2FD';

export default function SortedAnimalsTable() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const { data: session, isLoading } = useQuery({
    queryKey: ['sorting-session', sessionId],
    queryFn: () => base44.entities.SortingSessions.filter({ id: sessionId }).then(list => list[0]),
    enabled: !!sessionId,
  });

  const { data: animals = [] } = useQuery({
    queryKey: ['animals'],
    queryFn: () => base44.entities.Animals.list('-created_date'),
    initialData: [],
  });

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BLUE_LIGHT }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: `${BLUE_DARK}30`, borderTopColor: BLUE_DARK }} />
      </div>
    );
  }

  const sorted = session.sorted_animals || [];

  // Build rows: sorted entry + notes from Animals entity
  const rows = sorted.map(entry => {
    const animal = animals.find(a => a.tag_number === entry.animal_number || a.tag_number === entry.tag_number);
    return {
      ...entry,
      notes: animal?.notes || '',
    };
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BLUE_LIGHT }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 h-14 flex items-center justify-between shrink-0" style={{ background: BLUE_DARK }}>
        <button
          onClick={() => navigate(`/sorting/${sessionId}`)}
          className="text-white/80 hover:text-white p-2 -ml-2 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <p className="font-heading font-bold text-white truncate">{session.session_name} — Log</p>
        <p className="font-heading font-black text-white text-xl">{sorted.length}</p>
      </div>

      {/* Pen labels */}
      <div className="flex gap-3 px-4 pt-4 pb-2 max-w-2xl mx-auto w-full">
        <div className="flex-1 bg-white rounded-xl border border-blue-200 px-3 py-2 text-center text-sm font-bold" style={{ color: BLUE_DARK }}>
          ← {session.left_pen_label || 'Left'}: {session.left_count || 0}
        </div>
        <div className="flex-1 bg-white rounded-xl border border-blue-200 px-3 py-2 text-center text-sm font-bold" style={{ color: BLUE_DARK }}>
          {session.right_pen_label || 'Right'}: {session.right_count || 0} →
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 px-4 pb-6 max-w-2xl mx-auto w-full">
        {rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🐄</p>
            <p className="font-semibold">No animals sorted yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-blue-200 overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1.5fr_1fr] border-b border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">
              <span>Cow #</span>
              <span>Calf Type</span>
              <span>Direction</span>
            </div>
            {/* Table rows */}
            <div className="divide-y divide-blue-50">
              {rows.map((row, idx) => (
                <div key={idx} className="px-4 py-3">
                  <div className="grid grid-cols-[1fr_1.5fr_1fr] items-center">
                    <span className="font-heading font-black text-base" style={{ color: BLUE_DARK }}>#{row.animal_number || row.tag_number}</span>
                    <span className="text-sm text-gray-600">{row.animal_type || '—'}</span>
                    <span className={`text-sm font-bold ${row.direction === 'Left' ? 'text-blue-700' : 'text-green-700'}`}>
                      {row.direction === 'Left' ? `← ${session.left_pen_label || 'Left'}` : `${session.right_pen_label || 'Right'} →`}
                    </span>
                  </div>
                  {row.notes ? (
                    <p className="mt-1.5 text-xs text-gray-400 italic leading-snug line-clamp-2">{row.notes}</p>
                  ) : null}
                  {row.timestamp && (
                    <p className="mt-0.5 text-[10px] text-gray-300">{format(new Date(row.timestamp), 'h:mm a')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}