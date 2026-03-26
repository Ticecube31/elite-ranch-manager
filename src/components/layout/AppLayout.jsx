import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Baby, ArrowLeftRight, TreePine, HeartPulse, Rows3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/lib/ThemeContext';
import AISearchBar from '@/components/layout/AISearchBar';

const bottomNavItems = [
  { path: '/',              icon: Home,           label: 'Home',    activeColor: 'text-primary',      activeBg: 'bg-primary/10'   },
  { path: '/calving',       icon: Baby,           label: 'Calving', activeColor: 'text-emerald-500',  activeBg: 'bg-emerald-50'   },
  { path: '/sorting',       icon: ArrowLeftRight, label: 'Sorting', activeColor: 'text-blue-500',     activeBg: 'bg-blue-50'      },
  { path: '/pastures',      icon: TreePine,       label: 'Pastures',activeColor: 'text-amber-600',    activeBg: 'bg-amber-50'     },
  { path: '/preg-checking', icon: HeartPulse,     label: 'Preg',    activeColor: 'text-orange-500',   activeBg: 'bg-orange-50'    },
  { path: '/herd',          icon: Rows3,          label: 'Herd',    activeColor: 'text-purple-700',   activeBg: 'bg-purple-50'    },
];

function UserAvatar({ user }) {
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';
  return (
    <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-white">{initials}</span>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const { sectionTheme, headerStyle } = useTheme();
  const [user, setUser] = useState(null);
  const [ranchName, setRanchName] = useState('Elite Ranch Manager');
  const [logoUrl, setLogoUrl] = useState('');

  const isColoredHeader = !!headerStyle.background;

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    base44.entities.RanchSettings.list().then(list => {
      if (list.length > 0) {
        if (list[0].ranch_name) setRanchName(list[0].ranch_name);
        if (list[0].logo_url)   setLogoUrl(list[0].logo_url);
      }
    }).catch(() => {});
  }, [location.pathname]); // refresh on nav so Settings changes reflect instantly

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b safe-top shadow-sm transition-colors duration-300"
        style={isColoredHeader
          ? { ...headerStyle, borderColor: 'rgba(255,255,255,0.15)' }
          : { background: 'hsl(var(--card) / 0.97)', backdropFilter: 'blur(12px)', borderColor: 'hsl(var(--border))' }
        }
      >
        <div className="flex items-center gap-2 px-3 h-14 max-w-3xl mx-auto w-full">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 mr-1">
            {logoUrl ? (
              <img src={logoUrl} alt="Ranch Logo" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                isColoredHeader ? 'bg-white/20' : 'bg-primary'
              )}>
                <span className={cn('font-heading font-black text-xs', isColoredHeader ? 'text-white' : 'text-primary-foreground')}>
                  ER
                </span>
              </div>
            )}
            <span className={cn(
              'font-heading font-bold text-sm truncate hidden sm:block max-w-[120px]',
              isColoredHeader ? 'text-white' : 'text-foreground'
            )}>
              {ranchName}
            </span>
          </Link>

          {/* AI Search Bar — takes remaining space */}
          <div className="flex-1">
            <AISearchBar headerStyle={headerStyle} />
          </div>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1 shrink-0">
            {[
              { path: '/calving',       label: 'Calving'  },
              { path: '/sorting',       label: 'Sorting'  },
              { path: '/pastures',      label: 'Pastures' },
              { path: '/preg-checking', label: 'Preg'     },
              { path: '/herd',          label: 'Herd'     },
            ].map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  isColoredHeader
                    ? location.pathname.startsWith(path)
                      ? 'bg-white/25 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    : location.pathname.startsWith(path)
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User Avatar */}
          {user && (
            isColoredHeader
              ? <UserAvatar user={user} />
              : (
                <div className="w-9 h-9 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {user.full_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
              )
          )}
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* ── Bottom Tab Bar ───────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-md border-t border-border safe-bottom md:hidden">
        <div className="flex items-stretch justify-around h-[60px] max-w-lg mx-auto px-0.5">
          {bottomNavItems.map(({ path, icon: Icon, label, activeColor, activeBg }) => {
            const isActive = path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex flex-col items-center justify-center gap-[2px] flex-1 rounded-lg my-1 transition-all',
                  isActive ? `${activeColor} ${activeBg}` : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('w-[22px] h-[22px]', isActive && 'stroke-[2.5px]')} />
                <span className={cn('text-[9px] leading-none font-medium', isActive && 'font-bold')}>
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