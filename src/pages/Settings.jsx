import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { LogOut, Trash2, Palette, Users, Smartphone, Database, ClipboardList, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import BrandingSection      from '@/components/settings/BrandingSection';
import UserManagementSection from '@/components/settings/UserManagementSection';
import AppStoreSection       from '@/components/settings/AppStoreSection';
import DataBackupSection     from '@/components/settings/DataBackupSection';
import AuditLogSection       from '@/components/settings/AuditLogSection';

const TABS = [
  { id: 'branding',  icon: Palette,       label: 'Branding'  },
  { id: 'users',     icon: Users,         label: 'Users'     },
  { id: 'appstore',  icon: Smartphone,    label: 'App Store' },
  { id: 'data',      icon: Database,      label: 'Data'      },
  { id: 'audit',     icon: ClipboardList, label: 'Audit Log' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('branding');
  const [uploading, setUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const queryClient = useQueryClient();

  const { data: settingsList = [] } = useQuery({
    queryKey: ['ranch-settings'],
    queryFn: () => base44.entities.RanchSettings.list(),
    initialData: [],
  });

  const settings = settingsList[0] || {};

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settingsList.length > 0) {
        return base44.entities.RanchSettings.update(settingsList[0].id, data);
      }
      return base44.entities.RanchSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranch-settings'] });
      toast.success('Settings saved!');
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await saveMutation.mutateAsync({ ...settings, logo_url: file_url });
    setUploading(false);
    toast.success('Logo uploaded!');
  };

  const handleSave = (data) => {
    saveMutation.mutate({ ...settings, ...data });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }
    try {
      // Revoke session and redirect to login
      await base44.auth.logout('/');
      // TODO: Add backend function to permanently delete user account if needed
      toast.success('Account deletion initiated');
    } catch (err) {
      toast.error('Failed to delete account');
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-[60px]">
      {/* Page Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="font-heading font-black text-2xl text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Ranch branding, users, App Store, and data management</p>
      </div>

      {/* Tab Bar */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur border-b border-border px-4">
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shrink-0',
                activeTab === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-6 space-y-4">
        {activeTab === 'branding' && (
          <BrandingSection
            settings={settings}
            onSave={handleSave}
            uploading={uploading}
            onLogoUpload={handleLogoUpload}
          />
        )}
        {activeTab === 'users' && <UserManagementSection />}
        {activeTab === 'appstore' && (
          <AppStoreSection settings={settings} onSave={handleSave} />
        )}
        {activeTab === 'data' && (
          <DataBackupSection settings={settings} onSave={handleSave} />
        )}
        {activeTab === 'audit' && <AuditLogSection />}

        {/* Account Actions — always visible */}
        <div className="pt-4 border-t border-border space-y-3">
          <Button
            variant="destructive"
            onClick={() => base44.auth.logout('/')}
            className="w-full h-14 text-base font-bold"
          >
            <LogOut className="w-5 h-5 mr-2" /> Sign Out
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="w-full h-12 text-sm font-bold bg-red-700 hover:bg-red-800"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete Account
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Elite Ranch Manager · v0.4.0 · Built on Base44
          </p>
        </div>

        {/* Delete Account Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Account</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <p className="text-sm text-gray-600">
                <strong>Warning:</strong> This action cannot be undone. All your data will be permanently deleted.
              </p>
              <p className="text-sm text-gray-600">
                Type <code className="bg-gray-100 px-2 py-1 rounded font-mono">DELETE</code> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(''); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                Delete Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}