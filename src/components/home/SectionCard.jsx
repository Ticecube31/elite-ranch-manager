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
      'rounded-2xl p-4 text-white shadow-lg overflow-hidden relative',
      gradient
    )}>
      {/* Decorative circle */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

      {/* Top row: icon + title + badge */}
      <div className="flex items-center gap-3 mb-2 relative">
        <div className={cn('w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-2xl shadow-inner', iconBg)}>
          {emoji ?? <Icon className="w-6 h-6 text-white" />}
        </div>
        <h2 className="font-heading font-black text-lg leading-tight tracking-tight flex-1">
          {title}
        </h2>
        {badge && (
          <span className="text-[10px] font-bold bg-white/25 backdrop-blur-sm px-2 py-1 rounded-full border border-white/20 shrink-0">
            {badge}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-white/80 text-xs leading-relaxed mb-3">
        {description}
      </p>

      {/* CTA Button */}
      <div className="flex">
        <span className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:bg-white/10 border border-white/30 text-white font-semibold text-xs px-3 py-2 rounded-lg transition-all">
          {buttonLabel}
          <ChevronRight className="w-3.5 h-3.5" />
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