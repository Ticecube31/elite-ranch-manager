import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TreePine, MessageCircle, ChevronRight } from 'lucide-react';

export default function PastureComing() {
  const navigate = useNavigate();

  return (
    <div className="rounded-3xl overflow-hidden relative text-white shadow-lg"
      style={{ background: 'linear-gradient(135deg, #8D6E63 0%, #6D4C41 60%, #4E342E 100%)' }}>
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

      <div className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-inner">
            🌾
          </div>
          <span className="text-[11px] font-bold bg-white/25 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
            Coming Soon
          </span>
        </div>

        <h2 className="font-heading font-black text-2xl leading-tight tracking-tight mb-2">
          PASTURE MANAGEMENT
        </h2>
        <p className="text-white/80 text-sm leading-relaxed mb-4">
          Move herds, track grass conditions, water sources, fence status, and full rotation history.
        </p>
        <p className="text-white/60 text-xs italic mb-5">
          We'll build this together — tell the AI exactly what you need.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/pastures')}
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all min-h-[48px]"
          >
            Preview <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/ai-assistant')}
            className="inline-flex items-center gap-2 bg-white/90 text-amber-900 hover:bg-white border border-white/50 font-bold text-sm px-5 py-3 rounded-xl transition-all min-h-[48px]"
          >
            <MessageCircle className="w-4 h-4" />
            Describe What You Want
          </button>
        </div>
      </div>
    </div>
  );
}