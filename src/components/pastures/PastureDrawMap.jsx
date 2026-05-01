import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import MarkerPopup from './MarkerPopup';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createSvgIcon(emoji, size = 24, hasLabel = false) {
  return L.divIcon({
    html: `<div style="font-size:${hasLabel ? size * 0.65 : size}px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6));text-align:center;">${emoji}</div>`,
    className: '',
    iconAnchor: [size / 2, size / 2],
    iconSize: [size, hasLabel ? size + 16 : size],
  });
}

function DrawingHandler({ drawing, onAddPoint }) {
  useMapEvents({
    click(e) {
      if (drawing) onAddPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function AutoFit({ geometry }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !geometry?.length) return;
    fitted.current = true;
    map.fitBounds(L.latLngBounds(geometry), { padding: [40, 40] });
  }, [geometry, map]);
  return null;
}

function AddressSearch() {
  const map = useMap();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        map.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 15);
        setQuery('');
        setOpen(false);
      } else {
        toast.error('Location not found');
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="absolute bottom-4 right-3 z-[1001] flex flex-col items-end gap-2">
      {open && (
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search address..."
            className="h-9 px-3 rounded-xl text-sm font-medium border border-gray-200 shadow-lg outline-none w-52"
            style={{ background: 'rgba(255,255,255,0.95)' }}
          />
          <button
            type="submit"
            disabled={searching}
            className="h-9 px-3 rounded-xl text-xs font-bold text-white shadow-lg disabled:opacity-50"
            style={{ background: '#1E5F8E' }}
          >
            {searching ? '...' : '→'}
          </button>
        </form>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-white text-lg"
        style={{ background: '#1E5F8E' }}
      >
        🔍
      </button>
    </div>
  );
}

const WATER_ICONS = { 'Water Tank': '🪣', 'Pond': '💧', 'Dam': '🏗️', 'Lake': '🌊' };
const PIN_TYPES = [
  { label: 'Water Tank', icon: '🪣' },
  { label: 'Pond', icon: '💧' },
  { label: 'Dam', icon: '🏗️' },
  { label: 'Lake', icon: '🌊' },
  { label: 'Gate', icon: '🚧' },
];

function PinPlacementHandler({ placing, onPlace }) {
  useMapEvents({
    click(e) {
      if (placing) onPlace([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// ── Fullscreen drawing overlay ──────────────────────────────────────────────
function FullscreenDrawMap({ pasture, onSave, onCancel, initialMode = 'draw' }) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('satellite');
  const [mode, setMode] = useState(initialMode); // 'draw' | 'pin-select' | 'pin-place'
  const [drawPoints, setDrawPoints] = useState([]);
  const [pinType, setPinType] = useState(null);
  const [saving, setSaving] = useState(false);
  const isPinOnlySession = initialMode === 'pin-select';

  // Local copies of water sources & gates so they save immediately
  const [waterSources, setWaterSources] = useState(pasture.water_sources || []);
  const [gates, setGates] = useState(pasture.gates || []);
  // Selected marker popup: { itemType: 'water'|'gate', index: number }
  const [selectedMarker, setSelectedMarker] = useState(null);

  const handleAddPoint = useCallback((latlng) => {
    if (mode === 'draw') setDrawPoints(prev => [...prev, latlng]);
  }, [mode]);

  const handleUndo = () => setDrawPoints(prev => prev.slice(0, -1));

  const handlePlacePin = async (latlng) => {
    if (pinType === 'Gate') {
      const updated = [...gates, { lat: latlng[0], lng: latlng[1] }];
      setGates(updated);
      await base44.entities.Pastures.update(pasture.id, { gates: updated });
    } else {
      // Check if there's an existing unpinned water source of this type to associate
      const unpinnedIndex = waterSources.findIndex(ws => ws.type === pinType && (ws.lat == null || ws.lng == null));
      let updated;
      if (unpinnedIndex >= 0) {
        // Associate pin with the existing unpinned entry
        updated = waterSources.map((ws, i) =>
          i === unpinnedIndex ? { ...ws, lat: latlng[0], lng: latlng[1] } : ws
        );
        toast.success(`${pinType} pinned on map!`);
      } else {
        // No unpinned entry of this type — create a new one
        updated = [...waterSources, { type: pinType, lat: latlng[0], lng: latlng[1] }];
        toast.success(`${pinType} placed!`);
      }
      setWaterSources(updated);
      await base44.entities.Pastures.update(pasture.id, { water_sources: updated });
    }
    queryClient.invalidateQueries({ queryKey: ['pastures'] });
    queryClient.invalidateQueries({ queryKey: ['pasture', pasture.id] });
    setPinType(null);
    setMode('pin-select');
  };

  const handleSave = async () => {
    if (drawPoints.length < 3) { toast.error('Draw at least 3 points'); return; }
    setSaving(true);
    await onSave(drawPoints);
    setSaving(false);
  };

  const handleMarkerSaveName = async (newName) => {
    if (!selectedMarker) return;
    const { itemType, index } = selectedMarker;
    if (itemType === 'water') {
      const updated = waterSources.map((ws, i) => i === index ? { ...ws, name: newName || null } : ws);
      setWaterSources(updated);
      await base44.entities.Pastures.update(pasture.id, { water_sources: updated });
    } else {
      const updated = gates.map((g, i) => i === index ? { ...g, name: newName || null } : g);
      setGates(updated);
      await base44.entities.Pastures.update(pasture.id, { gates: updated });
    }
    queryClient.invalidateQueries({ queryKey: ['pasture', pasture.id] });
    queryClient.invalidateQueries({ queryKey: ['pastures'] });
    toast.success('Name saved');
  };

  const handleMarkerDelete = async () => {
    if (!selectedMarker) return;
    const { itemType, index } = selectedMarker;
    if (itemType === 'water') {
      const updated = waterSources.filter((_, i) => i !== index);
      setWaterSources(updated);
      await base44.entities.Pastures.update(pasture.id, { water_sources: updated });
      toast.success('Water source removed');
    } else {
      const updated = gates.filter((_, i) => i !== index);
      setGates(updated);
      await base44.entities.Pastures.update(pasture.id, { gates: updated });
      toast.success('Gate removed');
    }
    queryClient.invalidateQueries({ queryKey: ['pasture', pasture.id] });
    queryClient.invalidateQueries({ queryKey: ['pastures'] });
    setSelectedMarker(null);
  };

  const defaultCenter = pasture.geometry?.length > 2 ? pasture.geometry[0] : [39.5, -105.0];
  const satelliteTile = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const outlineTile = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="fixed inset-0 z-[9000]" style={{ background: '#000' }}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[9100] flex items-center gap-2 p-3 safe-top">
        {/* View toggle */}
        <div className="flex rounded-xl overflow-hidden border border-white/20 shadow-lg">
          {['satellite', 'outlines'].map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className="h-9 px-3 text-xs font-bold"
              style={{ background: viewMode === v ? '#1E5F8E' : 'rgba(0,0,0,0.6)', color: '#fff' }}
            >
              {v === 'satellite' ? '🛰 Sat' : '🗺 Map'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          {mode === 'draw' && (
            <>
              <button
                onClick={() => setMode('pin-select')}
                className="h-9 px-3 rounded-xl text-xs font-bold text-white shadow-lg"
                style={{ background: '#1E5F8E' }}
              >
                📍 Pin
              </button>
              <button
                onClick={handleUndo}
                disabled={drawPoints.length === 0}
                className="h-9 px-3 rounded-xl text-xs font-bold text-white shadow-lg disabled:opacity-40"
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                ↩ Undo
              </button>
              <button
                onClick={handleSave}
                disabled={drawPoints.length < 3 || saving}
                className="h-9 px-3 rounded-xl text-xs font-bold text-white shadow-lg disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
              >
                {saving ? '...' : '✓ Save'}
              </button>
              <button
                onClick={onCancel}
                className="h-9 px-3 rounded-xl text-xs font-bold text-white shadow-lg"
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                ✕
              </button>
            </>
          )}
          {mode === 'pin-place' && (
            <>
              <span className="bg-white/90 text-gray-800 text-xs font-bold px-3 py-2 rounded-xl shadow">
                Tap to place {pinType}
              </span>
              <button
                onClick={() => { setPinType(null); setMode('draw'); }}
                className="h-9 px-3 rounded-xl text-xs font-bold text-white shadow-lg"
                style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>

      {/* Instruction banner */}
      {mode === 'draw' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[9100]">
          <div className="bg-black/70 text-white text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap">
            {drawPoints.length === 0
              ? 'Tap the map to start drawing the boundary'
              : `${drawPoints.length} points — tap ✓ Save when finished`}
          </div>
        </div>
      )}

      {/* Marker popup */}
      {selectedMarker && mode !== 'pin-place' && (() => {
        const { itemType, index } = selectedMarker;
        const item = itemType === 'water' ? waterSources[index] : gates[index];
        if (!item) return null;
        return (
          <MarkerPopup
            item={item}
            itemType={itemType}
            onClose={() => setSelectedMarker(null)}
            onSave={handleMarkerSaveName}
            onDelete={handleMarkerDelete}
          />
        );
      })()}

      {/* Pin type selector (bottom sheet) */}
      {mode === 'pin-select' && (
        <div className="absolute bottom-6 left-4 right-4 z-[9100]">
          <div className="bg-white rounded-3xl shadow-2xl p-5">
            <h3 className="font-heading font-bold text-base text-gray-900 mb-3">What are you pinning?</h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {PIN_TYPES.map(t => (
                <button
                  key={t.label}
                  onClick={() => { setPinType(t.label); setMode('pin-place'); setSelectedMarker(null); }}
                  className="flex flex-col items-center gap-1 py-3 rounded-2xl border-2 border-gray-100 bg-gray-50 active:scale-95 transition-transform"
                >
                  <span className="text-2xl">{t.icon}</span>
                  <span className="text-xs font-bold text-gray-700">{t.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {isPinOnlySession && (
                <button
                  onClick={onCancel}
                  className="flex-1 h-10 rounded-xl font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
                >
                  ✓ Done
                </button>
              )}
              <button
                onClick={() => isPinOnlySession ? onCancel() : setMode('draw')}
                className="flex-1 h-10 rounded-xl border-2 border-gray-200 font-bold text-sm text-gray-600"
              >
                {isPinOnlySession ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={defaultCenter}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          key={viewMode}
          url={viewMode === 'satellite' ? satelliteTile : outlineTile}
          attribution={viewMode === 'satellite' ? '© Esri' : '© OpenStreetMap'}
          maxZoom={20}
        />

        {pasture.geometry?.length > 2 && <AutoFit geometry={pasture.geometry} />}

        <DrawingHandler drawing={mode === 'draw'} onAddPoint={handleAddPoint} />
        <PinPlacementHandler placing={mode === 'pin-place'} onPlace={handlePlacePin} />
        <AddressSearch />

        {/* Existing boundary (faded) when redrawing */}
        {pasture.geometry?.length > 2 && drawPoints.length === 0 && (
          <Polygon
            positions={pasture.geometry}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, dashArray: '6 4', weight: 1.5 }}
          />
        )}

        {/* Drawing preview */}
        {drawPoints.length > 1 && (
          <Polygon
            positions={drawPoints}
            pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.2, dashArray: '8 4', weight: 2 }}
          />
        )}

        {/* Boundary point markers */}
        {drawPoints.map((pt, i) => (
          <Marker key={i} position={pt} icon={createSvgIcon('📍', 24)} />
        ))}

        {/* Water source markers */}
        {waterSources.filter(ws => ws.lat != null && ws.lng != null).map((ws, i) => (
          <Marker
            key={`ws-${i}`}
            position={[ws.lat, ws.lng]}
            icon={createSvgIcon(
              ws.name
                ? `<span style="font-size:22px">${WATER_ICONS[ws.type] || '💧'}</span><span style="display:block;font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.9);white-space:nowrap;text-align:center">${ws.name}</span>`
                : (WATER_ICONS[ws.type] || '💧'),
              ws.name ? 36 : 30, ws.name
            )}
            eventHandlers={{ click: () => { if (mode !== 'pin-place') setSelectedMarker({ itemType: 'water', index: i }); } }}
          />
        ))}

        {/* Gate markers */}
        {gates.filter(g => g.lat != null && g.lng != null).map((g, i) => (
          <Marker
            key={`gate-${i}`}
            position={[g.lat, g.lng]}
            icon={createSvgIcon(
              g.name
                ? `<span style="font-size:22px">🚧</span><span style="display:block;font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.9);white-space:nowrap;text-align:center">${g.name}</span>`
                : '🚧',
              g.name ? 36 : 30, g.name
            )}
            eventHandlers={{ click: () => { if (mode !== 'pin-place') setSelectedMarker({ itemType: 'gate', index: i }); } }}
          />
        ))}
      </MapContainer>
    </div>
  );
}

// ── Main card component ─────────────────────────────────────────────────────
export default function PastureDrawMap({ pasture }) {
  const queryClient = useQueryClient();
  const hasGeometry = pasture.geometry?.length > 2;
  const [drawing, setDrawing] = useState(false);
  const [drawInitialMode, setDrawInitialMode] = useState('draw');

  const handleSave = async (drawPoints) => {
    await base44.entities.Pastures.update(pasture.id, { geometry: drawPoints });
    queryClient.invalidateQueries({ queryKey: ['pasture', pasture.id] });
    queryClient.invalidateQueries({ queryKey: ['pastures'] });
    toast.success('Boundary saved!');
    setDrawing(false);
  };

  const defaultCenter = hasGeometry ? pasture.geometry[0] : [39.5, -105.0];

  return (
    <>
      {/* Fullscreen draw mode */}
      {drawing && (
        <FullscreenDrawMap
          pasture={pasture}
          onSave={handleSave}
          onCancel={() => setDrawing(false)}
          initialMode={drawInitialMode}
        />
      )}

      {/* Card (always visible in detail page) */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺️</span>
            <p className="font-heading font-bold text-white text-sm">Pasture Boundary</p>
          </div>
          <div className="flex gap-2">
            {hasGeometry && (pasture.water_sources || []).some(ws => ws.lat == null || ws.lng == null) && (
              <button
                onClick={() => { setDrawInitialMode('pin-select'); setDrawing(true); }}
                className="h-8 px-3 rounded-xl text-xs font-bold"
                style={{ background: 'rgba(234,179,8,0.3)', border: '1px solid rgba(234,179,8,0.6)', color: '#fcd34d' }}
              >
                📍 Add Pins
              </button>
            )}
            <button
              onClick={() => { setDrawInitialMode('draw'); setDrawing(true); }}
              className="h-8 px-3 rounded-xl text-xs font-bold text-white"
              style={{ background: hasGeometry ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg,#1565c0,#1976d2)' }}
            >
              {hasGeometry ? '✏️ Redraw' : '✏️ Draw Boundary'}
            </button>
          </div>
        </div>

        {/* No boundary yet */}
        {!hasGeometry && (
          <div className="flex flex-col items-center gap-2 py-8" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <span className="text-4xl">📍</span>
            <p className="font-heading font-bold text-white text-sm">No boundary drawn yet</p>
            <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Tap "Draw Boundary" to outline this pasture on the map
            </p>
          </div>
        )}

        {/* Saved boundary preview */}
        {hasGeometry && (
          <div style={{ height: 260, zIndex: 0, position: 'relative' }}>
            <MapContainer
              center={defaultCenter}
              zoom={14}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
            >
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="© Esri"
                maxZoom={20}
              />
              <AutoFit geometry={pasture.geometry} />
              <Polygon
                positions={pasture.geometry}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.3, weight: 2 }}
              />
              {(pasture.water_sources || []).filter(ws => ws.lat != null && ws.lng != null).map((ws, i) => (
                <Marker key={`ws-${i}`} position={[ws.lat, ws.lng]} icon={createSvgIcon(
                  ws.name
                    ? `<span style="font-size:22px">${WATER_ICONS[ws.type] || '💧'}</span><span style="display:block;font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.9);white-space:nowrap;margin-top:1px;text-align:center">${ws.name}</span>`
                    : (WATER_ICONS[ws.type] || '💧'),
                  ws.name ? 36 : 30, ws.name
                )} />
              ))}
              {(pasture.gates || []).filter(g => g.lat != null && g.lng != null).map((g, i) => (
                <Marker key={`gate-${i}`} position={[g.lat, g.lng]} icon={createSvgIcon(
                  g.name
                    ? `<span style="font-size:22px">🚧</span><span style="display:block;font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.9);white-space:nowrap;margin-top:1px;text-align:center">${g.name}</span>`
                    : '🚧',
                  g.name ? 36 : 30, g.name
                )} />
              ))}
            </MapContainer>
          </div>
        )}
      </div>
    </>
  );
}