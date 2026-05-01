import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import MapFilterPanel from './MapFilterPanel';

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TODAY = new Date();

const WATER_ICONS = {
  'Water Tank': '🪣',
  'Pond': '💧',
  'Dam': '🏗️',
  'Lake': '🌊',
};

const ACTIVE_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ef4444', '#eab308', '#06b6d4', '#ec4899'];

function getDaysLabel(pasture) {
  const hasAnimals = (pasture.current_herd_count ?? 0) > 0;
  if (hasAnimals && pasture.last_grazed_date) {
    const days = differenceInDays(TODAY, new Date(pasture.last_grazed_date));
    return `${days}d w/ cows`;
  }
  const refDate = pasture.last_grazed_date;
  if (refDate) {
    const days = differenceInDays(TODAY, new Date(refDate));
    return `${days}d empty`;
  }
  return 'No history';
}

function createSvgIcon(emoji, size = 32) {
  return L.divIcon({
    html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6));">${emoji}</div>`,
    className: '',
    iconAnchor: [size / 2, size / 2],
    iconSize: [size, size],
  });
}

// Component to handle drawing clicks
function DrawingHandler({ drawing, onAddPoint }) {
  useMapEvents({
    click(e) {
      if (drawing) {
        onAddPoint([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

// Component to handle pin placement
function PinPlacementHandler({ placingPin, onPlacePin }) {
  useMapEvents({
    click(e) {
      if (placingPin) {
        onPlacePin([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

// Address search bar (collapsible, bottom-right)
function AddressSearch() {
  const map = useMap();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        map.setView([parseFloat(lat), parseFloat(lon)], 15);
        setQuery('');
        setOpen(false);
      } else {
        alert('Location not found');
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

// Auto-fit map to pastures that have geometry
function AutoFit({ pastures }) {
  const map = useMap();
  useEffect(() => {
    const withGeometry = pastures.filter(p => p.geometry?.length > 2);
    if (withGeometry.length === 0) return;
    const allPoints = withGeometry.flatMap(p => p.geometry.map(([lat, lng]) => [lat, lng]));
    const bounds = L.latLngBounds(allPoints);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [pastures, map]);
  return null;
}

// Name pasture dialog
function NamePastureDialog({ points, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(name.trim());
    setSaving(false);
  };

  return (
    <div className="absolute inset-0 z-[9999] flex items-end justify-center pb-8 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md mx-4 bg-white rounded-3xl shadow-2xl p-6 border border-gray-200">
        <h3 className="font-heading font-bold text-lg text-gray-900 mb-1">Name this Pasture</h3>
        <p className="text-sm text-gray-500 mb-4">{points.length} boundary points drawn</p>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="e.g. North Pasture, Back 40..."
          className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-green-500 outline-none text-base font-medium mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-12 rounded-xl border-2 border-gray-200 font-bold text-gray-600 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 h-12 rounded-xl font-bold text-white text-sm disabled:opacity-50"
            style={{ background: '#16a34a' }}
          >
            {saving ? 'Saving...' : 'Save Pasture'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Pasture popup panel
function PasturePopup({ pasture, onClose, onViewDetails }) {
  const isActive = (pasture.current_herd_count ?? 0) > 0;
  const daysLabel = getDaysLabel(pasture);

  return (
    <div className="absolute bottom-6 left-4 right-4 z-[9999] pointer-events-none flex justify-center">
      <div className="pointer-events-auto w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-heading font-bold text-lg text-gray-900 leading-tight">{pasture.pasture_name}</h3>
              <span
                className="inline-block text-xs font-bold px-2 py-0.5 rounded-full text-white mt-1"
                style={{ background: isActive ? '#16a34a' : '#6b7280' }}
              >
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg font-bold leading-none -mt-1 -mr-1"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-2xl p-3 text-center">
              <p className="text-2xl font-heading font-black text-gray-900">{pasture.current_herd_count ?? 0}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">head of cattle</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3 text-center">
              <p className="text-base font-heading font-black text-gray-900 leading-tight">{daysLabel}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{isActive ? 'days w/ cows' : 'days empty'}</p>
            </div>
          </div>

          <button
            onClick={() => onViewDetails(pasture.id)}
            className="w-full h-11 rounded-2xl font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, #C0592A, #A0421E)' }}
          >
            View Full Pasture Details →
          </button>
        </div>
      </div>
    </div>
  );
}

// Place pin type selector
function PinTypeSelector({ onSelect, onCancel }) {
  const types = [
    { label: 'Water Tank', icon: '🪣' },
    { label: 'Pond', icon: '💧' },
    { label: 'Dam', icon: '🏗️' },
    { label: 'Lake', icon: '🌊' },
    { label: 'Gate', icon: '🚧' },
  ];
  return (
    <div className="absolute bottom-6 left-4 right-4 z-[9999] pointer-events-none">
      <div className="pointer-events-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-5">
        <h3 className="font-heading font-bold text-base text-gray-900 mb-3">What are you pinning?</h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {types.map(t => (
            <button
              key={t.label}
              onClick={() => onSelect(t.label)}
              className="flex flex-col items-center gap-1 py-3 rounded-2xl border-2 border-gray-100 bg-gray-50 active:scale-95 transition-transform"
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="text-xs font-bold text-gray-700">{t.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="w-full h-10 rounded-xl border-2 border-gray-200 font-bold text-sm text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function PastureMap({ pastures }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState('satellite'); // 'satellite' | 'outlines'
  const [filters, setFilters] = useState({
    waterTypes: new Set(['Water Tank', 'Pond', 'Dam', 'Lake']),
    showGates: true,
    pastures: new Set(pastures.map(p => p.id)),
  });
  const [mode, setMode] = useState('view'); // 'view' | 'draw' | 'pin-select' | 'pin-place'
  const [drawPoints, setDrawPoints] = useState([]);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [selectedPasture, setSelectedPasture] = useState(null);
  const [pinType, setPinType] = useState(null);
  const [activePinPasture, setActivePinPasture] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Assign colors to pastures
  const pastureColors = {};
  pastures.forEach((p, i) => {
    pastureColors[p.id] = ACTIVE_COLORS[i % ACTIVE_COLORS.length];
  });

  const defaultCenter = [39.5, -105.0]; // Colorado default — will auto-fit if pastures exist
  const defaultZoom = 14;

  const handleAddPoint = useCallback((latlng) => {
    setDrawPoints(prev => [...prev, latlng]);
  }, []);

  const handleUndoPoint = () => setDrawPoints(prev => prev.slice(0, -1));

  const handleFinishDraw = () => {
    if (drawPoints.length < 3) { toast.error('Draw at least 3 points'); return; }
    setShowNameDialog(true);
  };

  const handleSavePasture = async (name) => {
    await base44.entities.Pastures.create({
      pasture_name: name,
      geometry: drawPoints,
      status: 'Inactive',
      current_herd_count: 0,
    });
    queryClient.invalidateQueries({ queryKey: ['pastures'] });
    toast.success(`"${name}" saved!`);
    setDrawPoints([]);
    setShowNameDialog(false);
    setMode('view');
  };

  const handleCancelDraw = () => {
    setDrawPoints([]);
    setShowNameDialog(false);
    setMode('view');
  };

  const handlePastureClick = (pasture) => {
    if (mode !== 'view') return;
    setSelectedPasture(pasture);
  };

  const handlePinTypeSelected = (type) => {
    setPinType(type);
    // If it's a gate, ask which pasture it belongs to (we'll just place it globally for now)
    setMode('pin-place');
  };

  const handlePlacePin = async (latlng) => {
    if (!pinType) return;
    // Find the pasture whose polygon contains the pin, or default to first
    const isGate = pinType === 'Gate';
    const target = selectedPasture || pastures.find(p => p.geometry?.length > 2);
    if (!target) { toast.error('No pasture found. Draw a pasture first.'); setMode('view'); return; }

    if (isGate) {
      const existing = target.gates || [];
      await base44.entities.Pastures.update(target.id, { gates: [...existing, { lat: latlng[0], lng: latlng[1] }] });
    } else {
      const existing = target.water_sources || [];
      await base44.entities.Pastures.update(target.id, { water_sources: [...existing, { type: pinType, lat: latlng[0], lng: latlng[1] }] });
    }
    queryClient.invalidateQueries({ queryKey: ['pastures'] });
    toast.success(`${pinType} placed!`);
    setPinType(null);
    setMode('view');
  };

  const satelliteTile = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const outlineTile = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div
      className="relative w-full"
      style={fullscreen
        ? { position: 'fixed', inset: 0, zIndex: 9000, height: '100dvh' }
        : { height: 'calc(100vh - 160px - 5rem - env(safe-area-inset-bottom, 0px))' }
      }
    >

      {/* Map */}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden' }}
        zoomControl={false}
      >
        <TileLayer
          key={viewMode}
          url={viewMode === 'satellite' ? satelliteTile : outlineTile}
          attribution={viewMode === 'satellite' ? '© Esri' : '© OpenStreetMap'}
          maxZoom={20}
        />

        {pastures.length > 0 && <AutoFit pastures={pastures} />}
        <AddressSearch />

        <DrawingHandler drawing={mode === 'draw'} onAddPoint={handleAddPoint} />
        <PinPlacementHandler placingPin={mode === 'pin-place'} onPlacePin={handlePlacePin} />

        {/* Saved pasture polygons */}
        {pastures.filter(p => p.geometry?.length > 2 && filters.pastures.has(p.id)).map(p => (
          <Polygon
            key={p.id}
            positions={p.geometry}
            pathOptions={{
              color: pastureColors[p.id],
              fillColor: pastureColors[p.id],
              fillOpacity: (selectedPasture?.id === p.id) ? 0.45 : 0.25,
              weight: (selectedPasture?.id === p.id) ? 3 : 2,
            }}
            eventHandlers={{ click: () => handlePastureClick(p) }}
          />
        ))}

        {/* Drawing preview polygon */}
        {drawPoints.length > 1 && (
          <Polygon
            positions={drawPoints}
            pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.2, dashArray: '8 4', weight: 2 }}
          />
        )}

        {/* Drawing point markers */}
        {drawPoints.map((pt, i) => (
          <Marker
            key={i}
            position={pt}
            icon={createSvgIcon('📍', 24)}
          />
        ))}

        {/* Water source markers */}
        {pastures.flatMap(p => (p.water_sources || [])
          .filter(ws => filters.waterTypes.has(ws.type))
          .map((ws, i) => (
            <Marker key={`ws-${p.id}-${i}`} position={[ws.lat, ws.lng]} icon={createSvgIcon(WATER_ICONS[ws.type] || '💧', 30)} />
          ))
        )}

        {/* Gate markers */}
        {filters.showGates && pastures.flatMap(p => (p.gates || []).map((g, i) => (
          <Marker key={`gate-${p.id}-${i}`} position={[g.lat, g.lng]} icon={createSvgIcon('🚧', 30)} />
        )))}

      </MapContainer>

      {/* ── Top Controls ─────────────────────────── */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2">
        {/* Filter Panel */}
        <MapFilterPanel
          viewMode={viewMode}
          setViewMode={setViewMode}
          filters={filters}
          setFilters={setFilters}
          pastures={pastures}
        />

        {/* Mode controls */}
        {mode === 'view' && (
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => { setMode('draw'); setSelectedPasture(null); }}
              className="h-9 px-3 rounded-xl text-xs font-bold text-white shadow-lg"
              style={{ background: '#16a34a' }}
            >
              ✏️ Draw
            </button>
            <button
              onClick={() => { setMode('pin-select'); setSelectedPasture(null); }}
              className="h-9 px-3 rounded-xl text-xs font-bold text-white shadow-lg"
              style={{ background: '#1E5F8E' }}
            >
              📍 Pin
            </button>
          </div>
        )}

        {mode === 'draw' && (
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleUndoPoint}
              disabled={drawPoints.length === 0}
              className="h-9 px-3 rounded-xl text-xs font-bold bg-white/90 text-gray-700 shadow-lg disabled:opacity-40"
            >
              ↩ Undo
            </button>
            <button
              onClick={handleFinishDraw}
              disabled={drawPoints.length < 3}
              className="h-9 px-3 rounded-xl text-xs font-bold text-white shadow-lg disabled:opacity-40"
              style={{ background: '#16a34a' }}
            >
              ✓ Done
            </button>
            <button
              onClick={handleCancelDraw}
              className="h-9 px-3 rounded-xl text-xs font-bold bg-white/90 text-gray-700 shadow-lg"
            >
              ✕
            </button>
          </div>
        )}

        {mode === 'pin-place' && (
          <div className="flex gap-2 ml-auto items-center">
            <span className="bg-white/90 text-gray-800 text-xs font-bold px-3 py-2 rounded-xl shadow">
              Tap map to place {pinType}
            </span>
            <button
              onClick={() => { setPinType(null); setMode('view'); }}
              className="h-9 px-3 rounded-xl text-xs font-bold bg-white/90 text-gray-700 shadow-lg"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── Fullscreen Button (bottom-left) ──────── */}
      <button
        onClick={() => setFullscreen(f => !f)}
        className="absolute bottom-4 left-3 z-[999] w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-white text-base font-bold"
        style={{ background: '#1E5F8E' }}
      >
        {fullscreen ? '⊠' : '⛶'}
      </button>

      {/* ── Draw instruction ─────────────────────── */}
      {mode === 'draw' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="bg-black/70 text-white text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap">
            {drawPoints.length === 0 ? 'Tap map to start drawing boundary' : `${drawPoints.length} points — tap Done when finished`}
          </div>
        </div>
      )}

      {/* ── Pasture Popup ─────────────────────────── */}
      {selectedPasture && mode === 'view' && (
        <PasturePopup
          pasture={selectedPasture}
          onClose={() => setSelectedPasture(null)}
          onViewDetails={(id) => navigate(`/pastures/${id}`)}
        />
      )}

      {/* ── Name Dialog ───────────────────────────── */}
      {showNameDialog && (
        <NamePastureDialog
          points={drawPoints}
          onSave={handleSavePasture}
          onCancel={handleCancelDraw}
        />
      )}

      {/* ── Pin Type Selector ─────────────────────── */}
      {mode === 'pin-select' && (
        <PinTypeSelector
          onSelect={handlePinTypeSelected}
          onCancel={() => setMode('view')}
        />
      )}
    </div>
  );
}