import React, { useState, useEffect, useContext } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, LogOut, Settings, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { RanchContext } from '@/lib/RanchContext';

const PURPLE = '#6B2D5E';
const PURPLE_DARK = '#4A1F40';
const PURPLE_LIGHT = '#F3E8F0';

export default function RanchSelector() {
  const navigate = useNavigate();
  const { currentRanch, userRanches, loading, switchRanch } = useContext(RanchContext);
  const [user, setUser] = useState(null);
  const [allRanches, setAllRanches] = useState([]);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRanchName, setNewRanchName] = useState('');
  const [creating, setCreating] = useState(false);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchAllRanches = async () => {
      try {
        const all = await base44.entities.Ranch.list();
        setAllRanches(all || []);
      } catch (error) {
        console.error('Error loading all ranches:', error);
      }
    };
    fetchAllRanches();
  }, []);



  const handleSelectRanch = (ranchId) => {
    switchRanch(ranchId);
    navigate('/');
  };

  const handleJoinRanch = async (ranchId) => {
    try {
      await base44.entities.RanchUser.create({
        ranch_id: ranchId,
        user_email: user.email,
        role: 'user',
        status: 'active'
      });
      toast.success('Joined ranch!');
      switchRanch(ranchId);
      navigate('/');
    } catch (error) {
      console.error('Error joining ranch:', error);
      toast.error('Failed to join ranch');
    }
  };

  const handleCreateRanch = async () => {
    if (!newRanchName.trim()) {
      toast.error('Ranch name required');
      return;
    }
    setCreating(true);
    try {
      const ranch = await base44.entities.Ranch.create({
        ranch_name: newRanchName,
        owner_id: user.id,
        owner_email: user.email,
        status: 'active'
      });

      await base44.entities.RanchUser.create({
        ranch_id: ranch.id,
        user_email: user.email,
        role: 'admin',
        status: 'active'
      });

      setNewRanchName('');
      setShowCreateDialog(false);
      switchRanch(ranch.id);
      navigate('/');
      toast.success('Ranch created!');
    } catch (error) {
      toast.error('Failed to create ranch');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout('/');
  };

  const handleGoToSettings = async () => {
    if (currentRanch) {
      switchRanch(currentRanch.id);
      navigate('/settings');
    } else {
      toast.error('No ranches available. Create or join one first.');
    }
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    html.classList.toggle('dark');
    setIsDark(!isDark);
  };

  const discoverRanches = allRanches.filter(
    r => !userRanches.find(ur => ur.id === r.id) && r.status === 'active'
  ).filter(r => r.ranch_name.toLowerCase().includes(search.toLowerCase()));

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})` }}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <span className="text-white font-heading font-black text-2xl">ER</span>
          </div>
          <h1 className="text-white font-heading font-black text-3xl mb-2">Elite Ranch Manager</h1>
          <p className="text-white/70 mb-8">Manage your cattle with confidence</p>
          <Button
            onClick={() => base44.auth.redirectToLogin()}
            className="h-13 px-8 text-base font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})` }}>
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4 mx-auto"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})` }}>
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <span className="text-white font-heading font-black text-lg">ER</span>
            </div>
            <div>
              <p className="text-white font-heading font-bold">Elite Ranch Manager</p>
              <p className="text-white/60 text-xs">{user?.full_name || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {user?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-bold text-gray-500 uppercase">Account</p>
                  <p className="text-sm font-semibold text-gray-900">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                  {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
                {userRanches.length > 0 && (
                  <DropdownMenuItem onClick={handleGoToSettings} className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* My Ranches Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-heading font-black text-2xl">My Ranches</h2>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="h-11 px-4 text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
            >
              <Plus className="w-4 h-4 mr-2" /> New Ranch
            </Button>
          </div>

          {userRanches.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 text-center">
              <p className="text-white/70 mb-4">You don't have access to any ranches yet.</p>
              <p className="text-white/50 text-sm">Create a new ranch or explore available ones below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userRanches.map(ranch => (
                <button
                  key={ranch.id}
                  onClick={() => handleSelectRanch(ranch.id)}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] text-left group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {ranch.logo_url ? (
                      <img src={ranch.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ background: PURPLE_LIGHT }}>
                        🐄
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-heading font-bold text-lg" style={{ color: PURPLE_DARK }}>
                        {ranch.ranch_name}
                      </h3>
                      <p className="text-xs text-gray-500 capitalize">{ranch.userRole} • Click to enter</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">Enter Ranch →</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Discover Ranches Section */}
        <div>
          <h2 className="text-white font-heading font-black text-2xl mb-6">Discover Ranches</h2>
          
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ranches..."
              className="w-full pl-12 pr-4 h-12 rounded-2xl border-0 outline-none text-sm"
            />
          </div>

          {discoverRanches.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 text-center">
              <p className="text-white/70">
                {allRanches.length === 0
                  ? 'No other ranches available at the moment.'
                  : 'No ranches match your search.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoverRanches.map(ranch => (
                <div key={ranch.id} className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="flex items-start gap-3 mb-4">
                    {ranch.logo_url ? (
                      <img src={ranch.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ background: PURPLE_LIGHT }}>
                        🐄
                      </div>
                    )}
                    <h3 className="font-heading font-bold text-lg" style={{ color: PURPLE_DARK }}>
                      {ranch.ranch_name}
                    </h3>
                  </div>
                  <Button
                    onClick={() => handleJoinRanch(ranch.id)}
                    className="w-full h-11 text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Join Ranch
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Ranch Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Ranch</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newRanchName}
              onChange={(e) => setNewRanchName(e.target.value)}
              placeholder="Ranch name"
              className="h-12 text-base"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRanch()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewRanchName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRanch}
              disabled={creating || !newRanchName.trim()}
              className="text-white"
              style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
            >
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}