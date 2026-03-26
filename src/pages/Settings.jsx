import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Upload, LogOut, Users, Database, Shield, Sun, Moon, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import AIHelpButton from '@/components/shared/AIHelpButton';

export default function Settings() {
  const queryClient = useQueryClient();
  const [ranchName, setRanchName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));

  const { data: settingsList = [] } = useQuery({
    queryKey: ['ranch-settings'],
    queryFn: async () => {
      const list = await base44.entities.RanchSettings.list();
      if (list.length > 0) {
        setRanchName(list[0].ranch_name || '');
        setLogoUrl(list[0].logo_url || '');
      }
      return list;
    },
    initialData: [],
  });

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
    setLogoUrl(file_url);
    setUploading(false);
  };

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setDarkMode(!darkMode);
  };

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  const handleExport = async () => {
    const animals = await base44.entities.Animals.list();
    const sessions = await base44.entities.SortingSessions.list();
    const data = { animals, sessions, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ranch-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported!');
  };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
      <h1 className="font-heading font-black text-2xl text-foreground">Settings</h1>

      {/* Ranch Info */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h2 className="font-heading font-bold text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Ranch Details
        </h2>
        <div>
          <Label className="text-sm font-semibold">Ranch Name</Label>
          <Input
            value={ranchName}
            onChange={(e) => setRanchName(e.target.value)}
            placeholder="My Ranch"
            className="h-12 text-base mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold">Ranch Logo</Label>
          <div className="flex items-center gap-3 mt-1">
            {logoUrl && <img src={logoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-cover" />}
            <label className="cursor-pointer">
              <Button variant="outline" className="h-10" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Logo'}
                </span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>
        </div>
        <Button
          onClick={() => saveMutation.mutate({ ranch_name: ranchName, logo_url: logoUrl })}
          className="h-12 w-full font-semibold"
        >
          <Save className="w-5 h-5 mr-2" /> Save Settings
        </Button>
      </div>

      {/* Appearance */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h2 className="font-heading font-bold text-lg flex items-center gap-2">
          {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
          Appearance
        </h2>
        <Button variant="outline" onClick={toggleDarkMode} className="w-full h-12 font-semibold">
          {darkMode ? <Sun className="w-5 h-5 mr-2" /> : <Moon className="w-5 h-5 mr-2" />}
          Switch to {darkMode ? 'Light' : 'Dark'} Mode
        </Button>
      </div>

      {/* Data */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h2 className="font-heading font-bold text-lg flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" /> Data Management
        </h2>
        <Button variant="outline" onClick={handleExport} className="w-full h-12 font-semibold">
          <Database className="w-5 h-5 mr-2" /> Export All Data (Backup)
        </Button>
      </div>

      {/* App Store */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h2 className="font-heading font-bold text-lg flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" /> App Store Publishing
        </h2>
        <p className="text-sm text-muted-foreground">
          Your app is ready for Apple App Store export on the Builder plan. Go to the
          "Publish" tab in Base44's dashboard to generate your IPA file. You'll need your
          Apple Developer credentials (Issuer ID, Key ID, Team ID, and .p8 key).
        </p>
        <div className="bg-muted rounded-xl p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Checklist:</p>
          <p>✅ App icon (1024×1024) — upload via logo above</p>
          <p>✅ Splash screen — auto-generated from your branding</p>
          <p>✅ Privacy policy — add URL in Publish settings</p>
          <p>✅ App description — set in Publish tab</p>
        </div>
      </div>

      {/* Logout */}
      <Button variant="destructive" onClick={handleLogout} className="w-full h-14 text-base font-semibold">
        <LogOut className="w-5 h-5 mr-2" /> Sign Out
      </Button>

      <AIHelpButton context="app settings and configuration" />
    </div>
  );
}