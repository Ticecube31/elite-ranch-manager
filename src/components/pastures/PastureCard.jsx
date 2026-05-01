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
          ? 'linear-gradient(160deg, #5ba3ff 0%, #2979ff 40%, #1a56d6 100%)'
          : 'linear-gradient(135deg, #1e3a6e 0%, #243f7a 100%)',
        border: isActive ? '2px solid rgba(200,225,255,0.8)' : '1px solid rgba(255,255,255,0.18)',
        boxShadow: isActive
          ? '0 12px 40px rgba(41,121,255,0.7), 0 3px 0 rgba(255,255,255,0.25) inset, 0 -4px 0 rgba(0,0,0,0.35) inset, 0 0 60px rgba(41,121,255,0.3)'
          : '0 2px 8px rgba(0,0,0,0.2)',
        transform: isActive ? 'translateY(-2px)' : 'none',
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
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {isActive ? (
              <>Days w/ Cows: <strong className="text-white">{daysValue}</strong></>
            ) : (
              <>Days <strong className="text-white">w/o</strong> Cows: <strong className="text-white">{daysValue}</strong></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span
            className="font-heading font-black text-white"
            style={{ fontSize: isActive ? '2rem' : '1.6rem', opacity: isActive ? 1 : 0.85 }}
          >
            {pasture.current_herd_count ?? 0}
          </span>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1565c0, #1976d2)' }}
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </button>
  );
}