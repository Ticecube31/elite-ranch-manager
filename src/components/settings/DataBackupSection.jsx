import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Download, Wifi, WifiOff, Archive } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function toCSV(data) {
  if (!data.length) return '';
  const keys = Object.keys(data[0]);
  return [keys.join(','), ...data.map(row =>
    keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(',')
  )].join('\n');
}

function downloadBlob(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function DataBackupSection({ settings, onSave }) {
  const [exporting, setExporting] = useState(false);
  const [archiveMonths, setArchiveMonths] = useState(String(settings?.archive_after_months || '12'));
  const offlineEnabled = settings?.offline_mode_enabled || false;

  const handleExportAll = async () => {
    setExporting(true);
    const [animals, sessions, pastures, movements, auditLog] = await Promise.all([
      base44.entities.Animals.list(),
      base44.entities.SortingSessions.list(),
      base44.entities.Pastures.list(),
      base44.entities.AnimalMovements.list(),
      base44.entities.AuditLog.list('-created_date', 50),
    ]);

    // Export animals as CSV (main data)
    downloadBlob(toCSV(animals), `animals-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');

    // Export full JSON backup
    setTimeout(() => {
      downloadBlob(
        JSON.stringify({ animals, sessions, pastures, movements, auditLog, exportDate: new Date().toISOString() }, null, 2),
        `ranch-backup-${new Date().toISOString().split('T')[0]}.json`,
        'application/json'
      );
    }, 400);

    toast.success('Animals CSV + full JSON backup downloaded!');
    setExporting(false);
  };

  return (
    <div className="space-y-5">
      {/* Export */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Download className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-bold text-base">Export All Data</h3>
        </div>
        <p className="text-sm text-muted-foreground">Downloads your Animals table as CSV (for Excel) and a full JSON backup of all data.</p>
        <Button onClick={handleExportAll} disabled={exporting} className="w-full h-14 text-base font-bold">
          <Download className="w-5 h-5 mr-2" />
          {exporting ? 'Preparing...' : 'Export Animals CSV + Full Backup'}
        </Button>
      </div>

      {/* Offline Mode */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          {offlineEnabled ? <Wifi className="w-5 h-5 text-emerald-500" /> : <WifiOff className="w-5 h-5 text-muted-foreground" />}
          <h3 className="font-heading font-bold text-base">Offline Mode</h3>
          <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${offlineEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
            {offlineEnabled ? 'On' : 'Off'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          When enabled, the app caches your animal records so you can log calves and sort even with no cell signal. Data syncs automatically when you reconnect.
        </p>
        <Button
          variant="outline"
          className="w-full h-12 font-semibold"
          onClick={() => onSave({ offline_mode_enabled: !offlineEnabled })}
        >
          {offlineEnabled ? '🔴 Turn Off Offline Mode' : '🟢 Enable Offline Mode'}
        </Button>
      </div>

      {/* Auto-Archive */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Archive className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-bold text-base">Auto-Archive Sold / Deceased Animals</h3>
        </div>
        <p className="text-sm text-muted-foreground">Automatically hide sold and deceased animals from active lists after this many months.</p>
        <Select value={archiveMonths} onValueChange={v => { setArchiveMonths(v); onSave({ archive_after_months: Number(v) }); }}>
          <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 months</SelectItem>
            <SelectItem value="6">6 months</SelectItem>
            <SelectItem value="12">12 months (recommended)</SelectItem>
            <SelectItem value="24">24 months</SelectItem>
            <SelectItem value="0">Never archive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}