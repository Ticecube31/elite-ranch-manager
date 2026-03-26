import React from 'react';
import { Link } from 'react-router-dom';
import { Baby, ArrowLeftRight, TreePine, Beef, TrendingUp, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import StatCard from '@/components/shared/StatCard';
import AIHelpButton from '@/components/shared/AIHelpButton';

const sectionCards = [
  {
    path: '/calving',
    icon: Baby,
    title: 'Calving Season',
    description: 'Log new calves, mother info, sex, location, notes. View records & export.',
    gradient: 'from-emerald-600 to-green-700',
    iconBg: 'bg-emerald-500/20',
  },
  {
    path: '/sorting',
    icon: ArrowLeftRight,
    title: 'Calf Sorting',
    description: 'Quick sex lookup & fast right/left sorting by cow number.',
    gradient: 'from-blue-600 to-sky-700',
    iconBg: 'bg-blue-500/20',
  },
  {
    path: '/pastures',
    icon: TreePine,
    title: 'Pasture Management',
    description: 'Move herds, track pastures, grass & rotations.',
    badge: 'Coming Soon',
    gradient: 'from-amber-700 to-yellow-800',
    iconBg: 'bg-amber-500/20',
  },
];

export default function Home() {
  const { data: animals = [] } = useQuery({
    queryKey: ['animals-stats'],
    queryFn: () => base44.entities.Animals.list(),
    initialData: [],
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sorting-stats'],
    queryFn: () => base44.entities.SortingSessions.list(),
    initialData: [],
  });

  const currentYear = new Date().getFullYear();
  const totalAnimals = animals.filter(a => a.status === 'Alive').length;
  const calvesThisYear = animals.filter(
    a => a.animal_type === 'Calf' && a.date_of_birth && new Date(a.date_of_birth).getFullYear() === currentYear
  ).length;
  const activeSessions = sessions.filter(s => s.status === 'Active').length;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Beef className="w-3.5 h-3.5" />
          Field-Ready Ranch Tool
        </div>
        <h1 className="font-heading font-black text-3xl sm:text-4xl text-foreground leading-tight">
          Elite Ranch Manager
        </h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Tag calves. Sort them fast. Manage your pastures. All from your phone.
        </p>
      </div>

      {/* Section Cards */}
      <div className="space-y-4">
        {sectionCards.map(({ path, icon: Icon, title, description, gradient, iconBg, badge }) => (
          <Link
            key={path}
            to={path}
            className={`block rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-lg hover:shadow-xl transition-all active:scale-[0.98]`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-xl">{title}</h2>
                  {badge && (
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-white/80 text-sm mt-1 leading-relaxed">{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div>
        <h2 className="font-heading font-bold text-lg text-foreground mb-3">Ranch at a Glance</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Beef} label="Total Animals" value={totalAnimals} color="bg-primary/10 text-primary" />
          <StatCard icon={Baby} label="Calves This Year" value={calvesThisYear} color="bg-emerald-100 text-emerald-700" />
          <StatCard icon={ArrowLeftRight} label="Active Sorts" value={activeSessions} color="bg-blue-100 text-blue-700" />
          <StatCard icon={TrendingUp} label="Alive Rate" value={totalAnimals > 0 ? `${Math.round((animals.filter(a => a.status === 'Alive').length / animals.length) * 100)}%` : '—'} color="bg-amber-100 text-amber-700" />
        </div>
      </div>

      <AIHelpButton context="home dashboard" />
    </div>
  );
}