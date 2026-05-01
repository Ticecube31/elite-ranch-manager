import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import PastureCard from '@/components/pastures/PastureCard';

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
    <div className="min-h-screen flex flex-col" style={{ background: '#F5E6D8' }}>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex gap-2">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 h-12 rounded-xl font-heading font-bold text-sm transition-all active:scale-95"
              style={{
                background: activeTab === tab ? '#1E5F8E' : '#2778B0',
                color: '#fff',
                opacity: activeTab === tab ? 1 : 0.75,
                boxShadow: activeTab === tab
                  ? '0 4px 12px rgba(30,95,142,0.45)'
                  : 'none',
                transform: activeTab === tab ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="mt-3 h-0.5 rounded-full" style={{ background: '#1E5F8E', opacity: 0.4 }} />
      </div>

      {/* ── Tab Content ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">

        {activeTab === 'Overview' && (
          <div className="space-y-3 pt-2">
            {sorted.length === 0 && (
              <div className="text-center py-16">
                <p className="text-2xl mb-2">🌾</p>
                <p className="font-heading font-bold text-lg" style={{ color: '#7A4A2A' }}>No pastures yet</p>
                <p className="text-sm mt-1" style={{ color: '#A0704A' }}>Tap + to add your first pasture</p>
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
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-5xl">🗺️</span>
            <p className="font-heading font-bold text-xl" style={{ color: '#7A4A2A' }}>Map Coming Soon</p>
          </div>
        )}

        {activeTab === 'Table' && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-5xl">📋</span>
            <p className="font-heading font-bold text-xl" style={{ color: '#7A4A2A' }}>Table Coming Soon</p>
          </div>
        )}
      </div>

      {/* ── Add New Pasture Button ────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 px-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-3" style={{ background: 'linear-gradient(to top, #F5E6D8 70%, transparent)' }}>
        <button
          className="w-full h-16 rounded-2xl flex items-center justify-center shadow-lg active:scale-[0.98] transition-transform"
          style={{ background: '#C8B8A8' }}
          onClick={() => {/* Add pasture — phase 3.2 */}}
        >
          <Plus className="w-9 h-9 text-white stroke-[2.5px]" />
        </button>
      </div>

    </div>
  );
}