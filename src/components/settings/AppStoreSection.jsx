import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Smartphone, Upload, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const checklist = [
  { id: 'icon',     label: 'App Icon (1024×1024 PNG)',              hint: 'Upload your ranch logo above' },
  { id: 'name',     label: 'App Display Name set',                   hint: 'Set ranch name in Branding tab' },
  { id: 'desc',     label: 'Short Description written',              hint: 'Fill in the description below' },
  { id: 'privacy',  label: 'Privacy Policy URL added',               hint: 'Required for App Store review' },
  { id: 'bundle',   label: 'Bundle ID set (com.yourranch.app)',      hint: 'Set below' },
  { id: 'creds',    label: 'Apple Developer credentials ready',      hint: 'Issuer ID, Key ID, Team ID, .p8 key' },
];

const DEFAULT_DESC = `Elite Ranch Manager is the complete field cattle management system for working ranchers. 
Tag calves, link to mothers, perform fast calf sorting by cow number, and manage your pastures — all from your iPhone, even with gloves on.

Built for real ranch work: large buttons, high-contrast text, works in bright sunlight, and supports offline entry.`;

const DEFAULT_KEYWORDS = 'cattle, ranch, calves, sorting, pasture, calf tagging, livestock, beef, rancher, cow';

export default function AppStoreSection({ settings, onSave }) {
  const [desc, setDesc]         = useState(settings?.app_description || DEFAULT_DESC);
  const [keywords, setKeywords] = useState(settings?.app_keywords    || DEFAULT_KEYWORDS);
  const [privacy, setPrivacy]   = useState(settings?.privacy_policy_url || '');
  const [bundle, setBundle]     = useState(settings?.app_store_bundle_id || 'com.myranch.eliteranchmanager');
  const [splashUrl, setSplashUrl] = useState(settings?.splash_url || '');
  const [uploadingSplash, setUploadingSplash] = useState(false);

  const handleSplashUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSplash(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setSplashUrl(file_url);
    setUploadingSplash(false);
    toast.success('Splash image uploaded!');
  };

  const handleSave = () => {
    onSave({ app_description: desc, app_keywords: keywords, privacy_policy_url: privacy, app_store_bundle_id: bundle, splash_url: splashUrl });
    toast.success('App Store settings saved!');
  };

  const completedItems = [
    settings?.logo_url   && 'icon',
    settings?.ranch_name && 'name',
    desc                 && 'desc',
    privacy              && 'privacy',
    bundle               && 'bundle',
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Checklist */}
      <div className="bg-muted rounded-2xl p-4 space-y-2">
        <p className="font-heading font-bold text-base mb-3">App Store Readiness Checklist</p>
        {checklist.map(({ id, label, hint }) => {
          const done = completedItems.includes(id);
          return (
            <div key={id} className="flex items-start gap-3">
              {done
                ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                : <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
              <div>
                <p className={`text-sm font-semibold ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
                {!done && <p className="text-[11px] text-muted-foreground">{hint}</p>}
              </div>
            </div>
          );
        })}
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-semibold text-foreground">
            {completedItems.length}/{checklist.length} items complete
          </p>
          <div className="w-full bg-background rounded-full h-2 mt-1">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${(completedItems.length / checklist.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Splash Screen */}
      <div>
        <Label className="text-sm font-semibold">Splash Screen / Launch Image</Label>
        <p className="text-xs text-muted-foreground mb-2">Shown while the app loads. 1242×2688 PNG recommended.</p>
        <label className="cursor-pointer block">
          <div className="h-16 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center gap-2 text-primary font-semibold hover:bg-primary/10 transition-colors">
            <Upload className="w-5 h-5" />
            {uploadingSplash ? 'Uploading...' : splashUrl ? '✅ Splash Uploaded — Replace' : 'Upload Splash Screen'}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleSplashUpload} />
        </label>
      </div>

      {/* Bundle ID */}
      <div>
        <Label className="text-sm font-semibold">Bundle ID</Label>
        <p className="text-xs text-muted-foreground mb-1">Unique identifier for your app (from Apple Developer account)</p>
        <Input value={bundle} onChange={e => setBundle(e.target.value)} placeholder="com.yourranch.eliteranchmanager" className="h-12 text-base mt-1 font-mono" />
      </div>

      {/* Description */}
      <div>
        <Label className="text-sm font-semibold">App Store Description</Label>
        <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={6} className="text-sm mt-1" />
      </div>

      {/* Keywords */}
      <div>
        <Label className="text-sm font-semibold">Keywords (comma-separated)</Label>
        <Input value={keywords} onChange={e => setKeywords(e.target.value)} className="h-12 text-sm mt-1" />
      </div>

      {/* Privacy Policy */}
      <div>
        <Label className="text-sm font-semibold">Privacy Policy URL</Label>
        <p className="text-xs text-muted-foreground mb-1">Required for Apple App Store. Can be a simple Google Doc or website page.</p>
        <Input value={privacy} onChange={e => setPrivacy(e.target.value)} placeholder="https://yourranch.com/privacy" className="h-12 text-base mt-1" />
      </div>

      {/* IPA Export */}
      <div className="bg-card border-2 border-primary/20 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-bold text-base">Generate IPA for App Store</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To export your app as an IPA file for the Apple App Store, go to the <strong className="text-foreground">Base44 Builder Dashboard</strong> → <strong className="text-foreground">Publish</strong> → <strong className="text-foreground">Mobile App</strong> tab.
        </p>
        <div className="bg-muted rounded-xl p-3 space-y-1 text-xs text-muted-foreground">
          <p className="font-bold text-foreground mb-1">You'll need from Apple Developer:</p>
          <p>📋 <strong>Issuer ID</strong> — from App Store Connect → Keys</p>
          <p>🔑 <strong>Key ID</strong> — shown next to your API key</p>
          <p>🏢 <strong>Team ID</strong> — from developer.apple.com → Membership</p>
          <p>📄 <strong>.p8 Key File</strong> — downloaded when you create the API key</p>
        </div>
        <Button
          variant="outline"
          className="w-full h-12 font-semibold"
          onClick={() => window.open('https://app.base44.com', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" /> Open Base44 Publish Dashboard
        </Button>
        <Button className="w-full h-12 font-semibold" onClick={() => toast.info('Go to Base44 dashboard → Publish → Mobile App to run the scanner')}>
          🔍 Run App Store Guideline Scanner
        </Button>
      </div>

      <Button onClick={handleSave} className="w-full h-14 text-base font-bold">
        Save App Store Settings
      </Button>
    </div>
  );
}