import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Baby, ArrowLeftRight, TreePine, Settings, MessageCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

const bottomNavItems = [
  { path: '/',         icon: Home,           label: 'Home',     activeColor: 'text-primary',     activeBg: 'bg-primary/10'     },
  { path: '/calving',  icon: Baby,           label: 'Calving',  activeColor: 'text-emerald-600', activeBg: 'bg-emerald-50'     },
  { path: '/sorting',  icon: ArrowLeftRight, label: 'Sorting',  activeColor: 'text-blue-600',    activeBg: 'bg-blue-50'        },
  { path: '/pastures', icon: TreePine,       label: 'Pastures', activeColor: 'text-amber-700',   activeBg: 'bg-amber-50'       },
  { path: '/settings', icon: Settings,       label: 'Settings', activeColor: 'text-slate-700',   activeBg: 'bg-slate-100'      },
];

function UserAvatar({ user }) {
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';
  return (
    <div className="w-9 h-9 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-primary">{initials}</span>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [ranchName, setRanchName] = useState('Elite Ranch Manager');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.RanchSettings.list().then(list => {
      if (list.length > 0) {
        if (list[0].ranch_name) setRanchName(list[0].ranch_name);
        if (list[0].logo_url) setLogoUrl(list[0].logo_url);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border safe-top shadow-sm">
        <div className="flex items-center justify-between px-4 h-14 max-w-3xl mx-auto w-full">

          {/* Logo + Title */}
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Ranch Logo" className="w-9 h-9 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-heading font-black text-sm tracking-tight">ER</span>
              </div>
            )}
            <span className="font-heading font-bold text-base text-foreground truncate hidden sm:block">
              {ranchName}
            </span>
          </Link>

          {/* Desktop nav (≥ md) */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { path: '/calving',  label: 'Calving',  color: 'hover:text-emerald-600' },
              { path: '/sorting',  label: 'Sorting',  color: 'hover:text-blue-600'    },
              { path: '/pastures', label: 'Pastures', color: 'hover:text-amber-700'   },
            ].map(({ path, label, color }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                  color,
                  location.pathname.startsWith(path)
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <Link
              to="/ai-assistant"
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === '/ai-assistant'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">AI Help</span>
            </Link>
            {user && <UserAvatar user={user} />}
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* ── Floating AI Button (mobile) ──────────────────────── */}
      <Link
        to="/ai-assistant"
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform md:hidden"
        aria-label="AI Ranch Assistant"
      >
        <MessageCircle className="w-6 h-6" />
      </Link>

      {/* ── Bottom Tab Bar (mobile only) ─────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-md border-t border-border safe-bottom md:hidden">
        <div className="flex items-stretch justify-around h-[64px] max-w-lg mx-auto px-1">
          {bottomNavItems.map(({ path, icon: Icon, label, activeColor, activeBg }) => {
            const isActive = path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex flex-col items-center justify-center gap-[3px] flex-1 rounded-xl my-1.5 transition-all',
                  isActive ? `${activeColor} ${activeBg}` : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('w-[26px] h-[26px]', isActive && 'stroke-[2.5px]')} />
                <span className={cn('text-[10px] leading-none font-medium', isActive && 'font-bold')}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}