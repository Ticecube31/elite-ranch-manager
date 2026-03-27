import React, { useState, useEffect, useContext } from 'react';
import { base44 } from '@/api/base44Client';
import { RanchContext } from '@/lib/RanchContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Upload, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PURPLE = '#6B2D5E';
const PURPLE_DARK = '#4A1F40';

export default function RanchAdminSection() {
  const { currentRanch, userRole } = useContext(RanchContext);
  const [showUploadLogo, setShowUploadLogo] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showChangeLog, setShowChangeLog] = useState(false);
  const queryClient = useQueryClient();

  // Only admins can access this
  if (userRole !== 'admin') {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center">
        <p className="text-red-700 font-semibold">⚠️ Admin access required</p>
      </div>
    );
  }

  // Fetch ranch users
  const { data: ranchUsers = [] } = useQuery({
    queryKey: ['ranch-users', currentRanch?.id],
    queryFn: () =>
      base44.entities.RanchUser.filter({
        ranch_id: currentRanch.id,
      }),
    enabled: !!currentRanch?.id,
    initialData: [],
  });

  // Fetch change logs
  const { data: changeLogs = [] } = useQuery({
    queryKey: ['change-logs', currentRanch?.id],
    queryFn: () =>
      base44.entities.DataChangeLog.filter(
        { ranch_id: currentRanch.id },
        '-timestamp',
        100
      ),
    enabled: !!currentRanch?.id,
    initialData: [],
  });

  const updateRanchMutation = useMutation({
    mutationFn: (data) => base44.entities.Ranch.update(currentRanch.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranches'] });
      toast.success('Ranch updated!');
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: (data) => base44.entities.RanchUser.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranch-users'] });
      setNewUserEmail('');
      setNewUserRole('user');
      setShowInviteForm(false);
      toast.success('User invited!');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => base44.entities.RanchUser.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranch-users'] });
      toast.success('User removed');
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ id, role }) =>
      base44.entities.RanchUser.update(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranch-users'] });
      toast.success('User role updated');
    },
  });

  const handleUploadLogo = async () => {
    if (!logoFile) {
      toast.error('Select an image first');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: logoFile });
      await updateRanchMutation.mutateAsync({ logo_url: file_url });
      setLogoFile(null);
      setShowUploadLogo(false);
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!newUserEmail.trim()) {
      toast.error('Enter an email');
      return;
    }

    // Check if user already exists
    const existing = ranchUsers.find(
      (u) => u.user_email === newUserEmail.trim()
    );
    if (existing) {
      toast.error('User already in ranch');
      return;
    }

    await inviteUserMutation.mutateAsync({
      ranch_id: currentRanch.id,
      user_email: newUserEmail.trim(),
      role: newUserRole,
      status: 'invited',
    });
  };

  return (
    <div className="space-y-6">
      {/* Ranch Branding */}
      <div>
        <h3 className="font-heading font-bold text-lg mb-4" style={{ color: PURPLE_DARK }}>
          🏔️ Ranch Branding
        </h3>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-4">
            {currentRanch.logo_url ? (
              <img src={currentRanch.logo_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-purple-50 flex items-center justify-center text-3xl">
                🐄
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-bold">{currentRanch.ranch_name}</h4>
              <p className="text-sm text-gray-500">This logo appears in the app header</p>
            </div>
            <button
              onClick={() => setShowUploadLogo(!showUploadLogo)}
              className="h-10 px-4 rounded-xl border-2 font-semibold text-sm flex items-center gap-2"
              style={{ borderColor: PURPLE, color: PURPLE }}
            >
              <Upload className="w-4 h-4" /> Change Logo
            </button>
          </div>

          {showUploadLogo && (
            <div className="pt-4 border-t space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="block w-full text-sm border border-gray-200 rounded-xl p-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowUploadLogo(false);
                    setLogoFile(null);
                  }}
                  className="flex-1 h-10 rounded-xl border-2 border-gray-200 font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadLogo}
                  disabled={!logoFile || uploading}
                  className="flex-1 h-10 rounded-xl text-white font-bold text-sm"
                  style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-lg" style={{ color: PURPLE_DARK }}>
            👥 User Management
          </h3>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="h-9 px-3 rounded-xl text-white text-sm font-bold flex items-center gap-1.5"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
          >
            <Plus className="w-4 h-4" /> Invite User
          </button>
        </div>

        {showInviteForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 space-y-3">
            <Input
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="user@example.com"
              className="h-10"
              type="email"
            />
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm"
            >
              <option value="user">User (Read-only)</option>
              <option value="manager">Manager (Can edit data)</option>
              <option value="admin">Admin (Full access)</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowInviteForm(false);
                  setNewUserEmail('');
                  setNewUserRole('user');
                }}
                className="flex-1 h-10 rounded-xl border-2 border-gray-200 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                className="flex-1 h-10 rounded-xl text-white font-bold text-sm"
                style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}
              >
                Send Invite
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {ranchUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No users yet</div>
          ) : (
            <div className="divide-y">
              {ranchUsers.map((ru) => (
                <div key={ru.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{ru.user_email}</p>
                    <p className="text-xs text-gray-500">
                      {ru.status === 'invited' ? '📬 Invited' : '✓ Active'} • {ru.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ru.status === 'active' && (
                      <select
                        value={ru.role}
                        onChange={(e) =>
                          updateUserRoleMutation.mutate({
                            id: ru.id,
                            role: e.target.value,
                          })
                        }
                        className="h-8 rounded-lg border border-gray-200 px-2 text-xs"
                      >
                        <option value="user">User</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    <button
                      onClick={() => deleteUserMutation.mutate(ru.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Change Log */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-lg" style={{ color: PURPLE_DARK }}>
            📋 Data Change Log
          </h3>
          <button
            onClick={() => setShowChangeLog(!showChangeLog)}
            className="h-9 px-3 rounded-xl text-sm font-bold flex items-center gap-1.5"
            style={{ color: PURPLE, borderColor: PURPLE, border: '2px solid' }}
          >
            <Eye className="w-4 h-4" /> {showChangeLog ? 'Hide' : 'View'}
          </button>
        </div>

        {showChangeLog && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {changeLogs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No changes yet</div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {changeLogs.map((log, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50 text-sm">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="font-semibold">
                          {log.action === 'create' && '➕'}
                          {log.action === 'update' && '✏️'}
                          {log.action === 'delete' && '🗑️'} {log.change_summary}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {log.entity_label} • {log.entity_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                      <span>{log.user_full_name || log.user_email}</span>
                      <span>{format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}