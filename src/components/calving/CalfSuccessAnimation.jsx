import React, { useEffect, useState } from 'react';

const sparklePositions = [
  { x: 10, y: 20 }, { x: 85, y: 15 }, { x: 20, y: 75 },
  { x: 80, y: 70 }, { x: 50, y: 5 },  { x: 5, y: 50 },
  { x: 92, y: 45 }, { x: 40, y: 90 }, { x: 70, y: 85 },
  { x: 30, y: 10 }, { x: 60, y: 92 }, { x: 95, y: 25 },
];

function Sparkle({ x, y, delay }) {
  return (
    <div
      className="absolute text-lg select-none pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animation: `sparkle-pop 0.6s ease-out ${delay}s both`,
      }}
    >
      ✨
    </div>
  );
}

function RedAngusCalf({ bounce }) {
  return (
    <svg
      viewBox="0 0 160 160"
      width="180"
      height="180"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.18))',
        animation: bounce ? 'calf-jump 0.55s ease-in-out' : 'calf-idle 2.5s ease-in-out infinite',
      }}
    >
      {/* Body */}
      <ellipse cx="82" cy="100" rx="42" ry="28" fill="#8B2500" />

      {/* Neck */}
      <ellipse cx="62" cy="80" rx="14" ry="18" fill="#8B2500" />

      {/* Head */}
      <ellipse cx="50" cy="62" rx="22" ry="19" fill="#7A2200" />

      {/* Face marking (lighter snout area) */}
      <ellipse cx="40" cy="70" rx="12" ry="9" fill="#C87850" />

      {/* White muzzle */}
      <ellipse cx="38" cy="73" rx="8" ry="6" fill="#F5E6D8" />

      {/* Nostrils */}
      <ellipse cx="35" cy="73" rx="2" ry="1.5" fill="#5a1800" />
      <ellipse cx="41" cy="73" rx="2" ry="1.5" fill="#5a1800" />

      {/* Left Eye */}
      <ellipse cx="55" cy="58" rx="5" ry="5.5" fill="#1a0a00" />
      <circle cx="57" cy="56" r="1.5" fill="white" />
      {/* Eyelash */}
      <line x1="51" y1="54" x2="49" y2="51" stroke="#1a0a00" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="54" y1="53" x2="53" y2="50" stroke="#1a0a00" strokeWidth="1.2" strokeLinecap="round"/>

      {/* Right Eye (partially visible) */}
      <ellipse cx="43" cy="59" rx="3.5" ry="4" fill="#1a0a00" />
      <circle cx="44" cy="57.5" r="1" fill="white" />

      {/* Ear left */}
      <ellipse cx="67" cy="48" rx="7" ry="10" fill="#7A2200" transform="rotate(-20 67 48)" />
      <ellipse cx="67" cy="49" rx="4" ry="6.5" fill="#C87850" transform="rotate(-20 67 49)" />

      {/* Ear right */}
      <ellipse cx="37" cy="48" rx="7" ry="10" fill="#7A2200" transform="rotate(20 37 48)" />
      <ellipse cx="37" cy="49" rx="4" ry="6.5" fill="#C87850" transform="rotate(20 37 49)" />

      {/* Happy mouth / smile */}
      <path d="M33 77 Q38 81 43 77" stroke="#5a1800" strokeWidth="1.8" fill="none" strokeLinecap="round"/>

      {/* Front legs */}
      <rect x="58" y="122" width="10" height="26" rx="5" fill="#7A2200"
        style={{ animation: bounce ? 'leg-kick-front 0.55s ease-in-out' : 'none', transformOrigin: '63px 122px' }} />
      <rect x="73" y="122" width="10" height="26" rx="5" fill="#7A2200"
        style={{ animation: bounce ? 'leg-kick-front 0.55s ease-in-out 0.05s' : 'none', transformOrigin: '78px 122px' }} />

      {/* Back legs */}
      <rect x="90" y="122" width="10" height="26" rx="5" fill="#7A2200"
        style={{ animation: bounce ? 'leg-kick-back 0.55s ease-in-out 0.08s' : 'none', transformOrigin: '95px 122px' }} />
      <rect x="105" y="122" width="10" height="26" rx="5" fill="#7A2200"
        style={{ animation: bounce ? 'leg-kick-back 0.55s ease-in-out 0.12s' : 'none', transformOrigin: '110px 122px' }} />

      {/* Hooves */}
      <rect x="58" y="144" width="10" height="6" rx="3" fill="#2a1000"/>
      <rect x="73" y="144" width="10" height="6" rx="3" fill="#2a1000"/>
      <rect x="90" y="144" width="10" height="6" rx="3" fill="#2a1000"/>
      <rect x="105" y="144" width="10" height="6" rx="3" fill="#2a1000"/>

      {/* Tail */}
      <path
        d="M124 96 Q138 85 135 75 Q133 68 128 72"
        stroke="#7A2200"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        style={{ animation: 'tail-wag 0.4s ease-in-out infinite alternate', transformOrigin: '124px 96px' }}
      />
      {/* Tail tuft */}
      <circle cx="128" cy="72" r="5" fill="#5a1800" />

      {/* Belly highlight */}
      <ellipse cx="82" cy="112" rx="22" ry="8" fill="#A03010" opacity="0.5" />
    </svg>
  );
}

export default function CalfSuccessAnimation({ calfData, onAddAnother, onBack }) {
  const [phase, setPhase] = useState('enter'); // enter → celebrate → buttons
  const [bounce, setBounce] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    // Trigger jump at 0.3s
    const t1 = setTimeout(() => setBounce(true), 300);
    const t2 = setTimeout(() => setBounce(false), 900);
    // Second jump
    const t3 = setTimeout(() => setBounce(true), 1400);
    const t4 = setTimeout(() => setBounce(false), 1950);
    // Show buttons after 2.8s
    const t5 = setTimeout(() => { setPhase('buttons'); setShowButtons(true); }, 2800);

    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
  }, []);

  return (
    <>
      <style>{`
        @keyframes sparkle-pop {
          0%   { opacity: 0; transform: scale(0) rotate(0deg); }
          50%  { opacity: 1; transform: scale(1.4) rotate(20deg); }
          100% { opacity: 0; transform: scale(0.8) rotate(-10deg) translateY(-12px); }
        }
        @keyframes calf-idle {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-4px) rotate(1deg); }
        }
        @keyframes calf-jump {
          0%   { transform: translateY(0px) scaleY(1) scaleX(1); }
          25%  { transform: translateY(-28px) scaleY(1.08) scaleX(0.94) rotate(-4deg); }
          55%  { transform: translateY(-36px) scaleY(1.1) scaleX(0.92) rotate(4deg); }
          80%  { transform: translateY(-6px) scaleY(0.95) scaleX(1.04); }
          100% { transform: translateY(0px) scaleY(1) scaleX(1); }
        }
        @keyframes leg-kick-front {
          0%   { transform: rotate(0deg); }
          40%  { transform: rotate(-30deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes leg-kick-back {
          0%   { transform: rotate(0deg); }
          40%  { transform: rotate(25deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes tail-wag {
          from { transform: rotate(-18deg); }
          to   { transform: rotate(18deg); }
        }
        @keyframes slide-up-fade {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #E8F5E9 0%, #F1F8F1 60%, #DCEDC8 100%)' }}
      >
        {/* Sparkles */}
        <div className="absolute inset-0 pointer-events-none">
          {sparklePositions.map((pos, i) => (
            <Sparkle key={i} x={pos.x} y={pos.y} delay={0.1 + i * 0.15} />
          ))}
          {/* Second wave of sparkles */}
          {sparklePositions.map((pos, i) => (
            <Sparkle key={`b${i}`} x={pos.x + 5} y={pos.y + 5} delay={1.5 + i * 0.12} />
          ))}
        </div>

        {/* Calf */}
        <div className="relative z-10 mb-2">
          <RedAngusCalf bounce={bounce} />
        </div>

        {/* Text */}
        <h1
          className="font-heading font-black text-3xl text-gray-900 mb-1 z-10"
          style={{ animation: 'slide-up-fade 0.5s ease-out 0.2s both' }}
        >
          Calf Added! 🎉
        </h1>

        {calfData && (
          <div style={{ animation: 'slide-up-fade 0.5s ease-out 0.4s both' }} className="z-10">
            <p className="text-2xl font-black mb-1" style={{ color: '#2E7D32' }}>
              #{calfData.tag_number}
            </p>
            <p className="text-gray-500 text-base">
              {calfData.sex} · {calfData.animal_type}
            </p>
          </div>
        )}

        {/* Buttons */}
        {showButtons && (
          <div
            className="w-full max-w-xs space-y-4 mt-10 z-10"
            style={{ animation: 'slide-up-fade 0.4s ease-out both' }}
          >
            <button
              onClick={onAddAnother}
              className="w-full h-16 rounded-2xl font-heading font-black text-xl text-white shadow-lg active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg, #4CAF50, #2E7D32)' }}
            >
              + Add Another Calf
            </button>
            <button
              onClick={onBack}
              className="w-full h-14 rounded-2xl font-semibold text-base border-2 border-gray-300 bg-white text-gray-700 active:scale-[0.98] transition-all"
            >
              Back to Main Screen
            </button>
          </div>
        )}
      </div>
    </>
  );
}