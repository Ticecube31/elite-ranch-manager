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
    if (pasture.last_grazed_date) {
      return differenceInDays(TODAY, new Date(pasture.last_grazed_date));
    }
    return 0;
  } else {
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
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 h-12 font-body text-sm font-medium transition-all relative"
              style={{
                color: activeTab === tab ? '#1a1a1a' : '#9ca3af',
                fontWeight: activeTab === tab ? 700 : 400,
              }}
            >
              {tab}
              {activeTab === tab && (
                <span
                  className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                  style={{ background: '#8BAF8B' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-4">

        {activeTab === 'Overview' && (
          <>
            {sorted.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">🌾</p>
                <p className="font-heading font-bold text-xl text-gray-800">No pastures yet</p>
                <p className="text-sm mt-1 text-gray-400">Tap + to add your first pasture</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
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
          </>
        )}

        {activeTab === 'Map' && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-5xl">🗺️</span>
            <p className="font-heading font-bold text-xl text-gray-700">Map Coming Soon</p>
          </div>
        )}

        {activeTab === 'Table' && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="text-5xl">📋</span>
            <p className="font-heading font-bold text-xl text-gray-700">Table Coming Soon</p>
          </div>
        )}
      </div>

      {/* ── Floating Add Button ───────────────────────────── */}
      <div className="fixed bottom-0 right-0 px-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-3">
        <button
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ background: '#8BAF8B' }}
          onClick={() => {/* Add pasture */}}
        >
          <Plus className="w-7 h-7 text-white stroke-[2.5px]" />
        </button>
      </div>

    </div>
  );
}