import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import PastureCard from '@/components/pastures/PastureCard';
import PastureMap from '@/components/pastures/PastureMap';
import MoveCowsSheet from '@/components/pastures/MoveCowsSheet';

const TABS = ['Map', 'Overview', 'Table'];
const TODAY = new Date();

function getDaysValue(pasture, isActive) {
  if (isActive) {
    // Days since the pasture was last grazed (i.e. animals moved in)
    if (pasture.last_grazed_date) {
      return differenceInDays(TODAY, new Date(pasture.last_grazed_date));
    }
    return 0;
  } else {
    // Days since cows left (rest_start_date) or since last_grazed_date
    const refDate = pasture.rest_start_date || pasture.last_grazed_date;
    if (refDate) {
      return differenceInDays(TODAY, new Date(refDate));
    }
    return 0;
  }
}

export default function PastureManagement() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [showMoveCows, setShowMoveCows] = useState(false);

  const { data: pastures = [] } = useQuery({
    queryKey: ['pastures'],
    queryFn: () => base44.entities.Pastures.list('pasture_name'),
    initialData: [],
  });

  // Split and sort pastures
  const active = pastures
    .filter(p => (p.current_herd_count ?? 0) > 0)
    .map(p => ({ ...p, daysValue: getDaysValue(p, true) }))
    .sort((a, b) => b.daysValue - a.daysValue);

  const inactive = pastures
    .filter(p => (p.current_herd_count ?? 0) === 0)
    .map(p => ({ ...p, daysValue: getDaysValue(p, false) }))
    .sort((a, b) => b.daysValue - a.daysValue);

  const sorted = [...active, ...inactive];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1e3a6e' }}>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.15)' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 h-9 rounded-xl font-heading font-bold text-sm transition-all active:scale-95"
              style={{
                background: activeTab === tab ? 'linear-gradient(135deg, #1565c0, #1976d2)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.75)',
                boxShadow: activeTab === tab ? '0 2px 12px rgba(21,101,192,0.5)' : 'none',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-[calc(8rem+env(safe-area-inset-bottom,0px))]">

        {activeTab === 'Overview' && (
          <div className="space-y-3 pt-2">
            <h2 className="font-heading font-black text-white text-2xl tracking-wide uppercase mb-2">Pasture Overview</h2>
            {sorted.length === 0 && (
              <div className="text-center py-16">
                <p className="text-2xl mb-2">🌾</p>
                <p className="font-heading font-bold text-lg text-white">No pastures yet</p>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Tap + to add your first pasture</p>
              </div>
            )}
            {sorted.map(p => (
              <PastureCard
                key={p.id}
                pasture={p}
                daysValue={p.daysValue}
                isActive={(p.current_herd_count ?? 0) > 0}
              />
            ))}
          </div>
        )}

        {activeTab === 'Map' && (
          <div className="pt-2">
            <PastureMap pastures={pastures} />
          </div>
        )}

        {activeTab === 'Table' && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-5xl">📋</span>
            <p className="font-heading font-bold text-xl text-white">Table Coming Soon</p>
          </div>
        )}
      </div>

      {/* ── Bottom Action Buttons (Overview only) ────────────────────────── */}
      {activeTab === 'Overview' && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-3" style={{ background: 'linear-gradient(to top, #1e3a6e 70%, transparent)' }}>
          <div className="flex gap-3">
            <button
              className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform font-heading font-bold text-white text-base"
              style={{ background: 'linear-gradient(135deg, #1565c0, #1976d2)', boxShadow: '0 4px 20px rgba(21,101,192,0.5)' }}
              onClick={() => setShowMoveCows(true)}
            >
              🐄 Move Cows
            </button>
            <button
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, #1565c0, #1976d2)', boxShadow: '0 4px 20px rgba(21,101,192,0.5)' }}
              onClick={() => {/* Add pasture — phase 3.2 */}}
            >
              <Plus className="w-7 h-7 text-white stroke-[2.5px]" />
            </button>
          </div>
        </div>
      )}

      <MoveCowsSheet open={showMoveCows} onOpenChange={setShowMoveCows} pastures={pastures} />

    </div>
  );
}