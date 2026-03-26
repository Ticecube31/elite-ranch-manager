import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SectionCard({
  path,
  icon: Icon,
  emoji,
  title,
  description,
  buttonLabel,
  gradient,
  iconBg,
  badge,
  onButtonClick,
}) {
  const Inner = (
    <div className={cn(
      'rounded-3xl p-6 text-white shadow-lg overflow-hidden relative',
      gradient
    )}>
      {/* Decorative circle */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

      {/* Top row: icon + badge */}
      <div className="flex items-start justify-between mb-4 relative">
        <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner', iconBg)}>
          {emoji ?? <Icon className="w-8 h-8 text-white" />}
        </div>
        {badge && (
          <span className="text-[11px] font-bold bg-white/25 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
            {badge}
          </span>
        )}
      </div>

      {/* Text */}
      <h2 className="font-heading font-black text-2xl leading-tight tracking-tight mb-2">
        {title}
      </h2>
      <p className="text-white/80 text-sm leading-relaxed mb-5">
        {description}
      </p>

      {/* CTA Button */}
      <div className="flex">
        <span className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 active:bg-white/10 border border-white/30 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all min-h-[48px]">
          {buttonLabel}
          <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  );

  if (onButtonClick) {
    return (
      <button onClick={onButtonClick} className="w-full text-left active:scale-[0.98] transition-transform">
        {Inner}
      </button>
    );
  }

  return (
    <Link to={path} className="block active:scale-[0.98] transition-transform">
      {Inner}
    </Link>
  );
}