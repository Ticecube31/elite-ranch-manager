import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createSvgIcon(emoji, size = 24) {
  return L.divIcon({
    html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6));">${emoji}</div>`,
    className: '',
    iconAnchor: [size / 2, size / 2],
    iconSize: [size, size],
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

// ── Fullscreen drawing overlay ──────────────────────────────────────────────
function FullscreenDrawMap({ pasture, onSave, onCancel }) {
  const [viewMode, setViewMode] = useState('satellite');
  const [drawPoints, setDrawPoints] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleAddPoint = useCallback((latlng) => {
    setDrawPoints(prev => [...prev, latlng]);
  }, []);

  const handleUndo = () => setDrawPoints(prev => prev.slice(0, -1));

  const handleSave = async () => {
    if (drawPoints.length < 3) { toast.error('Draw at least 3 points'); return; }
    setSaving(true);
    await onSave(drawPoints);
    setSaving(false);
  };

  const defaultCenter = pasture.geometry?.length > 2
    ? pasture.geometry[0]
    : [39.5, -105.0];

  const satelliteTile = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const outlineTile = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="fixed inset-0 z-[9000] flex flex-col" style={{ background: '#000' }}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[9100] flex items-center gap-2 p-3">
        {/* View toggle */}
        <div className="flex rounded-xl overflow-hidden border border-white/20 shadow-lg">
          {['satellite', 'outlines'].map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className="h-9 px-3 text-xs font-bold transition-all"
              style={{
                background: viewMode === v ? '#1E5F8E' : 'rgba(0,0,0,0.6)',
                color: '#fff',
              }}
            >
              {v === 'satellite' ? '🛰 Sat' : '🗺 Map'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
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
            {saving ? 'Saving...' : '✓ Save'}
          </button>
          <button
            onClick={onCancel}
            className="h-9 px-3 rounded-xl text-xs font-bold text-white shadow-lg"
            style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            ✕ Cancel
          </button>
        </div>
      </div>

      {/* Instruction banner */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[9100]">
        <div className="bg-black/70 text-white text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap">
          {drawPoints.length === 0
            ? 'Tap the map to start drawing the boundary'
            : `${drawPoints.length} points — tap Save when finished`}
        </div>
      </div>

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

        <DrawingHandler drawing={true} onAddPoint={handleAddPoint} />
        <AddressSearch />

        {/* Existing boundary (faded) */}
        {pasture.geometry?.length > 2 && (
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

        {/* Point markers */}
        {drawPoints.map((pt, i) => (
          <Marker key={i} position={pt} icon={createSvgIcon('📍', 24)} />
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
          <button
            onClick={() => setDrawing(true)}
            className="h-8 px-3 rounded-xl text-xs font-bold text-white"
            style={{ background: hasGeometry ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg,#1565c0,#1976d2)' }}
          >
            {hasGeometry ? '✏️ Redraw' : '✏️ Draw Boundary'}
          </button>
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
          <div style={{ height: 260 }}>
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
            </MapContainer>
          </div>
        )}
      </div>
    </>
  );
}