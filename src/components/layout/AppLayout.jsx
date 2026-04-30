import React, { useEffect, useState, createContext, useContext } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Baby, ArrowLeftRight, TreePine, HeartPulse, Rows3, Moon, Sun, Settings, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/lib/ThemeContext';
import AISearchBar from '@/components/layout/AISearchBar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { saveTabPath, getTabPath } from '@/lib/tabHistory';

// Context so CalvingSeason page can register its AI open handler
export const CalvingAIContext = createContext({ openCalvingAI: null, setOpenCalvingAI: () => {} });

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
  const navigate = useNavigate();
  const { sectionTheme, headerStyle, isDark, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [ranchName, setRanchName] = useState('Elite Ranch Manager');
  const [logoUrl, setLogoUrl] = useState('');
  const [openCalvingAI, setOpenCalvingAI] = useState(null); // fn registered by CalvingSeason
  const [openHerdAI, setOpenHerdAI] = useState(null); // fn registered by HerdManagement

  const isColoredHeader = !!headerStyle.background;

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Save current path for tab restoration
  useEffect(() => { saveTabPath(location.pathname); }, [location.pathname]);

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
                    <Home className={cn('w-4 h-4', isColoredHeader ? 'text-white' : 'text-primary-foreground')} />
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
            <AISearchBar headerStyle={headerStyle} onCalvingAI={openCalvingAI || undefined} onHerdAI={openHerdAI || undefined} />
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

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors hover:opacity-80',
                    isColoredHeader
                      ? 'bg-white/20 border-2 border-white/30'
                      : 'bg-primary/15 border-2 border-primary/30'
                  )}
                >
                  <span className={cn('text-sm font-bold', isColoredHeader ? 'text-white' : 'text-primary')}>
                    {user.full_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-bold text-gray-500 uppercase">Account</p>
                  <p className="text-sm font-semibold text-gray-900">{user.full_name || 'User'}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                  {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Manage Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="flex-1 pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-6">
        <CalvingAIContext.Provider value={{ openCalvingAI, setOpenCalvingAI, openHerdAI, setOpenHerdAI }}>
          <Outlet />
        </CalvingAIContext.Provider>
      </main>

      {/* ── Bottom Tab Bar ───────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-md border-t border-border safe-bottom md:hidden">
        <div className="flex items-stretch justify-around h-[60px] max-w-lg mx-auto px-0.5">
          {bottomNavItems.map(({ path, icon: Icon, label, activeColor, activeBg }) => {
            const isActive = path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => {
                  // If already on this tab, go to root; otherwise restore last path
                  const alreadyOnTab = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
                  navigate(alreadyOnTab ? path : getTabPath(path));
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-[2px] flex-1 rounded-lg my-1 transition-all',
                  isActive ? `${activeColor} ${activeBg}` : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('w-[22px] h-[22px]', isActive && 'stroke-[2.5px]')} />
                <span className={cn('text-[9px] leading-none font-medium', isActive && 'font-bold')}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}