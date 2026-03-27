import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, LogOut, Plus as PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const PURPLE = '#6B2D5E';
const PURPLE_DARK = '#4A1F40';

export default function RanchSelector() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRanches, setUserRanches] = useState([]);
  const [availableRanches, setAvailableRanches] = useState([]);
  const [search, setSearch] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestingRanchId, setRequestingRanchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRanchName, setNewRanchName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const loadRanches = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Get user's existing ranches
        const userRanches = await base44.entities.RanchUser.filter({
          user_email: currentUser.email,
          status: 'active'
        });

        const ranches = await Promise.all(
          userRanches.map(async (ru) => {
            const ranch = await base44.entities.Ranch.read(ru.ranch_id);
            return { ...ranch, userRole: ru.role };
          })
        );

        setUserRanches(ranches);

        // Get all available ranches for discovery
        const allRanches = await base44.entities.Ranch.list();
        const available = allRanches.filter(
          r => !ranches.find(ur => ur.id === r.id) && r.status === 'active'
        );
        setAvailableRanches(available);
      } catch (error) {
        console.error('Error loading ranches:', error);
        toast.error('Failed to load ranches');
      } finally {
        setLoading(false);
      }
    };

    loadRanches();
  }, []);

  const handleSelectRanch = (ranchId) => {
    localStorage.setItem('selectedRanchId', ranchId);
    navigate('/');
  };

  const handleRequestJoin = async (ranchId) => {
    try {
      // Create pending RanchUser record
      await base44.entities.RanchUser.create({
        ranch_id: ranchId,
        user_email: user.email,
        role: 'user',
        status: 'invited',
      });
      toast.success('Join request sent to ranch admin');
      setRequestingRanchId(null);
    } catch (error) {
      toast.error('Failed to request join');
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
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
      localStorage.setItem('selectedRanchId', ranch.id);
      navigate('/');
      toast.success('Ranch created!');
    } catch (error) {
      toast.error('Failed to create ranch');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})` }}>
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4 mx-auto"></div>
          <p>Loading your ranches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})` }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-white text-center mb-8">
          <h1 className="font-heading font-black text-4xl mb-2">Elite Ranch Manager</h1>
          <p className="text-white/70">Select a ranch to continue</p>
        </div>

        {/* My Ranches */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-heading font-bold text-xl">My Ranches</h2>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="h-10 px-4 text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
            >
              <Plus className="w-4 h-4 mr-1" /> New Ranch
            </Button>
          </div>
          {userRanches.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <p className="text-white/70 text-center">You don't have any ranches yet. Request to join one below or ask an admin to add you.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userRanches.map(ranch => (
                <button
                  key={ranch.id}
                  onClick={() => handleSelectRanch(ranch.id)}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] text-left"
                >
                  <div className="flex items-start gap-3">
                    {ranch.logo_url ? (
                      <img src={ranch.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `${PURPLE_LIGHT}` }}>
                        <span className="text-2xl">🐄</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-heading font-bold text-lg" style={{ color: PURPLE_DARK }}>{ranch.ranch_name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{ranch.userRole} • Click to enter</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Discover Ranches */}
        <div>
          <h2 className="text-white font-heading font-bold text-xl mb-4">Discover Ranches</h2>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ranches..."
              className="w-full pl-10 pr-4 h-12 rounded-xl border-0 outline-none text-sm"
            />
          </div>

          {availableRanches.filter(r => r.ranch_name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <p className="text-white/70 text-center">No ranches available to join.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableRanches.filter(r => r.ranch_name.toLowerCase().includes(search.toLowerCase())).map(ranch => (
                <div key={ranch.id} className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="flex items-start gap-3 mb-4">
                    {ranch.logo_url ? (
                      <img src={ranch.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `${PURPLE}20` }}>
                        <span className="text-2xl">🐄</span>
                      </div>
                    )}
                    <h3 className="font-heading font-bold text-lg" style={{ color: PURPLE_DARK }}>{ranch.ranch_name}</h3>
                  </div>
                  <Button
                    onClick={() => handleRequestJoin(ranch.id)}
                    className="w-full h-10 text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Request to Join
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-white/20 text-white font-semibold hover:bg-white/30 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Create Ranch Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Create New Ranch</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Input
                value={newRanchName}
                onChange={(e) => setNewRanchName(e.target.value)}
                placeholder="Ranch name"
                className="h-12"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRanch()}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRanch}
                disabled={creating}
                className="text-white"
                style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
              >
                {creating ? 'Creating...' : 'Create Ranch'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

const PURPLE_LIGHT = '#F3E8F0';