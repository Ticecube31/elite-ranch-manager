import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function PastureCard({ pasture, daysValue, isActive }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/pastures/${pasture.id}`)}
      className="w-full text-left rounded-2xl bg-white border border-gray-200 active:scale-[0.98] transition-transform p-4 flex flex-col gap-3"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
    >
      {/* Name + Days */}
      <div>
        <p className="font-heading font-bold text-gray-900 text-xl leading-tight">
          {pasture.pasture_name}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">
          {isActive ? (
            <>Days w/ Cows: <span className="font-semibold text-gray-700">{daysValue}</span></>
          ) : (
            <>Days w/o Cows: <span className="font-semibold text-gray-700">{daysValue}</span></>
          )}
        </p>
      </div>

      {/* Big count circle */}
      <div className="flex justify-center py-2">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: '#8BAF8B' }}
        >
          <span className="font-heading font-bold text-white text-4xl">
            {pasture.current_herd_count ?? 0}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-end">
        <ArrowRight className="w-5 h-5 text-gray-800" />
      </div>
    </button>
  );
}