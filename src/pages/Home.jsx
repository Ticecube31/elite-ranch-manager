import React, { useEffect, useState } from 'react';
import { Baby, ArrowLeftRight, Beef, Settings, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

import HeroStats from '@/components/home/HeroStats';
import SectionCard from '@/components/home/SectionCard';
import RecentActivity from '@/components/home/RecentActivity';
import PastureComing from '@/components/home/PastureComing';

export default function Home() {
  const [user, setUser] = useState(null);
  const [ranchName, setRanchName] = useState('Elite Ranch Manager');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.RanchSettings.list().then(list => {
      if (list.length > 0 && list[0].ranch_name) setRanchName(list[0].ranch_name);
    }).catch(() => {});
  }, []);

  const { data: animals = [] } = useQuery({
    queryKey: ['animals-stats'],
    queryFn: () => base44.entities.Animals.list(),
    refetchInterval: 30_000,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sorting-stats'],
    queryFn: () => base44.entities.SortingSessions.list(),
    refetchInterval: 30_000,
  });

  const { data: pastures = [] } = useQuery({
    queryKey: ['pastures-stats'],
    queryFn: () => base44.entities.Pastures.list(),
    initialData: [],
  });

  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().split('T')[0];

  const statsValues = {
    totalAnimals:   animals.filter(a => a.status === 'Alive').length,
    calvesThisYear: animals.filter(a =>
      a.animal_type === 'Calf' &&
      a.date_of_birth &&
      new Date(a.date_of_birth).getFullYear() === currentYear
    ).length,
    activeSessions: sessions.filter(s =>
      s.status === 'Active' && s.session_date === today
    ).length,
    activePastures: pastures.filter(p => p.status === 'Active').length,
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Rancher';

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto space-y-7 pb-6">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="space-y-1 pt-1">
        <p className="text-sm text-muted-foreground font-medium">
          {greeting()}, <span className="text-foreground font-semibold">{firstName}</span> 👋
        </p>
        <h1 className="font-heading font-black text-3xl sm:text-4xl text-foreground leading-tight">
          Welcome to<br className="sm:hidden" /> Elite Ranch Manager
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed max-w-md">
          Your complete field ranch management system —&nbsp;
          tag, sort, and pasture from your phone.
        </p>
      </div>

      {/* ── Live Stats ───────────────────────────────────────── */}
      <HeroStats values={statsValues} />

      {/* ── Section: Calving ─────────────────────────────────── */}
      <SectionCard
        path="/calving"
        icon={Baby}
        emoji="🐄"
        title="CALVING SEASON"
        description="Log new calves, link to mother (Cow or Heifer), auto-generate unique Animal record, record sex, location, notes, and photos."
        buttonLabel="Enter Calving Season"
        gradient="bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-800"
        iconBg="bg-white/20"
      />

      {/* ── Section: Sorting ─────────────────────────────────── */}
      <SectionCard
        path="/sorting"
        icon={ArrowLeftRight}
        emoji="🔀"
        title="CALF SORTING"
        description="Fast cow-number lookup, instant sex display (Male / Steer or Female / Heifer), pre-session right/left mapping, one-tap sorting."
        buttonLabel="Enter Calf Sorting"
        gradient="bg-gradient-to-br from-blue-500 via-sky-600 to-blue-800"
        iconBg="bg-white/20"
      />

      {/* ── Section: Pastures (Coming Soon) ──────────────────── */}
      <PastureComing />

      {/* ── Recent Activity ──────────────────────────────────── */}
      <RecentActivity animals={animals} sessions={sessions} />

      {/* ── Footer Links ─────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Link
          to="/settings"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <Link
          to="/ai-assistant"
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-semibold transition-colors"
        >
          <Beef className="w-4 h-4" />
          AI Ranch Assistant
        </Link>
      </div>

    </div>
  );
}