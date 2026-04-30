import React from 'react';
import { Beef, Baby, TreePine } from 'lucide-react';

const stats = [
  { key: 'totalAnimals',  label: 'Total Animals',         icon: Beef,           bg: 'bg-primary/10',     text: 'text-primary'      },
  { key: 'calvesThisYear', label: 'Calves This Year',     icon: Baby,           bg: 'bg-emerald-100',    text: 'text-emerald-700'  },
  { key: 'activePastures', label: 'Active Pastures',      icon: TreePine,       bg: 'bg-amber-100',      text: 'text-amber-700'    },
];

export default function HeroStats({ values }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(({ key, label, icon: Icon, bg, text }) => (
        <div
          key={key}
          className="bg-card rounded-xl border border-border px-2 py-3 flex flex-col items-center justify-center gap-1.5"
        >
          <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${text}`} />
          </div>
          <div className="text-center">
            <p className={`text-xl font-heading font-black leading-none ${text}`}>
              {values[key] ?? 0}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-tight">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}