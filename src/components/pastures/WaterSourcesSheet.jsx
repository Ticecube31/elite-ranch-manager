import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, Trash2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const TYPES = ['Water Tank', 'Pond', 'Dam', 'Lake'];
const TYPE_ICONS = { 'Water Tank': '🪣', 'Pond': '💧', 'Dam': '🏗️', 'Lake': '🌊' };

export default function WaterSourcesSheet({ open, onOpenChange, pasture }) {
  const queryClient = useQueryClient();
  const [addingType, setAddingType] = useState(null);
  const [saving, setSaving] = useState(false);

  const sources = pasture?.water_sources || [];

  const handleAdd = async () => {
    if (!addingType) return;
    setSaving(true);
    const updated = [...sources, { type: addingType, lat: null, lng: null }];
    await base44.entities.Pastures.update(pasture.id, { water_sources: updated });
    queryClient.invalidateQueries({ queryKey: ['pasture', pasture.id] });
    queryClient.invalidateQueries({ queryKey: ['pastures'] });
    toast.success(`${addingType} added`);
    setAddingType(null);
    setSaving(false);
  };

  const handleDelete = async (index) => {
    const updated = sources.filter((_, i) => i !== index);
    await base44.entities.Pastures.update(pasture.id, { water_sources: updated });
    queryClient.invalidateQueries({ queryKey: ['pasture', pasture.id] });
    queryClient.invalidateQueries({ queryKey: ['pastures'] });
    toast.success('Water source removed');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl pb-10">
        <SheetHeader className="mb-5">
          <SheetTitle className="font-heading text-xl">Water Sources — {pasture?.pasture_name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-1">

          {/* Existing sources */}
          {sources.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No water sources added yet</p>
          ) : (
            <div className="space-y-2">
              {sources.map((ws, i) => {
                const hasPinMissing = ws.lat == null || ws.lng == null;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ background: hasPinMissing ? 'rgba(234,179,8,0.08)' : 'rgba(0,0,0,0.04)', border: hasPinMissing ? '1px solid rgba(234,179,8,0.35)' : '1px solid rgba(0,0,0,0.08)' }}
                  >
                    <span className="text-2xl">{TYPE_ICONS[ws.type] || '💧'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{ws.type}</p>
                      {hasPinMissing ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0" />
                          <p className="text-xs text-yellow-600 font-medium">Pin missing — drop it on the Map tab</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Pinned on map</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(i)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-red-400 hover:text-red-600 active:scale-95 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new source */}
          <div>
            <Label className="text-sm font-semibold">Add Water Source</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setAddingType(addingType === t ? null : t)}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl border-2 font-medium text-sm active:scale-95 transition-all"
                  style={{
                    borderColor: addingType === t ? '#1976d2' : 'rgba(0,0,0,0.1)',
                    background: addingType === t ? 'rgba(25,118,210,0.08)' : 'white',
                    color: addingType === t ? '#1976d2' : '#374151',
                  }}
                >
                  <span className="text-xl">{TYPE_ICONS[t]}</span>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {addingType && (
            <div className="rounded-2xl px-4 py-3 flex items-start gap-2" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
              <MapPin className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700 font-medium leading-snug">
                This will be saved without a map pin. To place the pin, go to the <strong>Map tab</strong> on the Pastures screen and tap 📍 Pin.
              </p>
            </div>
          )}

          <Button
            onClick={handleAdd}
            disabled={!addingType || saving}
            className="w-full h-12 font-bold"
          >
            {saving ? 'Saving...' : addingType ? `Add ${addingType}` : 'Select a type above'}
          </Button>

        </div>
      </SheetContent>
    </Sheet>
  );
}