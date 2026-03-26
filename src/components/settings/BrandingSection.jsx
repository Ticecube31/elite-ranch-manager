import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Upload, Sun, Moon, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/lib/ThemeContext';
import { toast } from 'sonner';

const SECTION_COLORS = [
  { key: 'calving',  label: 'Calving Season',      default: '#4CAF50', desc: 'Fresh green — new life' },
  { key: 'sorting',  label: 'Calf Sorting',         default: '#2196F3', desc: 'Sky blue — sorting pen' },
  { key: 'pastures', label: 'Pasture Management',   default: '#8D6E63', desc: 'Earth brown — land & grazing' },
];

const THEME_MODES = [
  { id: 'light',         icon: Sun,  label: 'Light',         desc: 'Standard ranch look' },
  { id: 'dark',          icon: Moon, label: 'Dark',          desc: 'Night-friendly' },
  { id: 'high-contrast', icon: Zap,  label: 'High Contrast', desc: 'Max sunlight readability' },
];

export default function BrandingSection({ settings, onSave, uploading, onLogoUpload }) {
  const { mode, setMode } = useTheme();
  const [ranchName, setRanchName] = useState(settings?.ranch_name || '');

  const handleSave = () => {
    onSave({ ranch_name: ranchName });
  };

  return (
    <div className="space-y-6">
      {/* Ranch Name */}
      <div>
        <Label className="text-sm font-semibold">Ranch Name</Label>
        <Input
          value={ranchName}
          onChange={(e) => setRanchName(e.target.value)}
          placeholder="e.g. Circle B Ranch"
          className="h-14 text-lg mt-1 font-semibold"
        />
      </div>

      {/* Logo */}
      <div>
        <Label className="text-sm font-semibold">Ranch Logo</Label>
        <p className="text-xs text-muted-foreground mb-2">Square PNG or JPG, 512×512 or 1024×1024 (used as app icon)</p>
        <div className="flex items-center gap-4">
          {settings?.logo_url ? (
            <div className="relative">
              <img src={settings.logo_url} alt="Ranch Logo" className="w-20 h-20 rounded-2xl object-cover border-2 border-border shadow-sm" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">✓</span>
              </div>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-muted flex items-center justify-center">
              <span className="text-2xl">🐄</span>
            </div>
          )}
          <label className="cursor-pointer flex-1">
            <div className="h-14 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center gap-2 text-primary font-semibold hover:bg-primary/10 transition-colors">
              <Upload className="w-5 h-5" />
              {uploading ? 'Uploading...' : 'Upload Logo / App Icon'}
            </div>
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onLogoUpload} />
          </label>
        </div>
        {/* iPhone home screen preview */}
        {settings?.logo_url && (
          <div className="mt-3 p-3 bg-muted rounded-xl">
            <p className="text-xs text-muted-foreground mb-2 font-medium">iPhone Home Screen Preview</p>
            <div className="flex items-end gap-2">
              <div className="flex flex-col items-center gap-1">
                <img src={settings.logo_url} alt="Icon" className="w-14 h-14 rounded-[14px] shadow-md object-cover" />
                <span className="text-[10px] font-medium text-foreground text-center leading-tight max-w-[56px] truncate">
                  {ranchName || 'Elite Ranch'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground italic">← how it looks on iPhone</p>
            </div>
          </div>
        )}
      </div>

      {/* Section Colors */}
      <div>
        <Label className="text-sm font-semibold">Section Colors</Label>
        <p className="text-xs text-muted-foreground mb-3">These colors identify each major section of the app</p>
        <div className="space-y-3">
          {SECTION_COLORS.map(({ key, label, default: dflt, desc }) => (
            <div key={key} className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
              <div
                className="w-10 h-10 rounded-xl shrink-0 shadow-sm border border-border/50"
                style={{ background: dflt }}
              />
              <div className="flex-1">
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <div
                className="w-8 h-8 rounded-lg border-2 border-border overflow-hidden shrink-0"
                style={{ background: dflt }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Theme Mode */}
      <div>
        <Label className="text-sm font-semibold">Display Mode</Label>
        <p className="text-xs text-muted-foreground mb-3">High Contrast is best for working outdoors in bright sunlight</p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_MODES.map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                mode === id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-bold leading-none">{label}</span>
              <span className="text-[9px] text-center leading-tight opacity-70">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} className="w-full h-14 text-base font-bold">
        <Save className="w-5 h-5 mr-2" /> Save Branding
      </Button>
    </div>
  );
}