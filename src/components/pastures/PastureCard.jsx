import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function PastureCard({ pasture, daysValue, isActive }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/pastures/${pasture.id}`)}
      className="w-full text-left rounded-2xl active:scale-[0.98] transition-transform"
      style={{
        background: isActive
          ? 'linear-gradient(135deg, #C0592A 0%, #A0421E 100%)'
          : 'linear-gradient(135deg, #D9855A 0%, #C4714A 100%)',
        boxShadow: isActive
          ? '0 4px 16px rgba(160,66,30,0.35)'
          : '0 2px 8px rgba(180,100,60,0.18)',
      }}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex-1 min-w-0">
          <p
            className="font-heading font-black text-white leading-tight"
            style={{ fontSize: isActive ? '1.45rem' : '1.25rem' }}
          >
            {pasture.pasture_name}
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {isActive ? (
              <>Days w/ Cows: <strong>{daysValue}</strong></>
            ) : (
              <>Days <strong>w/o</strong> Cows: <strong>{daysValue}</strong></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span
            className="font-heading font-black text-white"
            style={{ fontSize: isActive ? '2rem' : '1.6rem', opacity: isActive ? 1 : 0.8 }}
          >
            {pasture.current_herd_count ?? 0}
          </span>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: '#1E5F8E' }}
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </button>
  );
}