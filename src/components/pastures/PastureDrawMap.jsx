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
    const bounds = L.latLngBounds(geometry);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [geometry, map]);
  return null;
}

export default function PastureDrawMap({ pasture }) {
  const queryClient = useQueryClient();
  const hasGeometry = pasture.geometry?.length > 2;

  const [drawing, setDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleAddPoint = useCallback((latlng) => {
    setDrawPoints(prev => [...prev, latlng]);
  }, []);

  const handleUndo = () => setDrawPoints(prev => prev.slice(0, -1));

  const handleSave = async () => {
    if (drawPoints.length < 3) { toast.error('Draw at least 3 points'); return; }
    setSaving(true);
    await base44.entities.Pastures.update(pasture.id, { geometry: drawPoints });
    queryClient.invalidateQueries({ queryKey: ['pasture', pasture.id] });
    queryClient.invalidateQueries({ queryKey: ['pastures'] });
    toast.success('Boundary saved!');
    setDrawPoints([]);
    setDrawing(false);
    setSaving(false);
  };

  const handleCancel = () => {
    setDrawPoints([]);
    setDrawing(false);
  };

  const defaultCenter = hasGeometry
    ? pasture.geometry[0]
    : [39.5, -105.0];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.12)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🗺️</span>
          <p className="font-heading font-bold text-white text-sm">Pasture Boundary</p>
        </div>
        {!drawing && (
          <button
            onClick={() => setDrawing(true)}
            className="h-8 px-3 rounded-xl text-xs font-bold text-white"
            style={{ background: hasGeometry ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg,#1565c0,#1976d2)' }}
          >
            {hasGeometry ? '✏️ Redraw' : '✏️ Draw Boundary'}
          </button>
        )}
        {drawing && (
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              disabled={drawPoints.length === 0}
              className="h-8 px-3 rounded-xl text-xs font-bold bg-white/10 text-white disabled:opacity-40"
            >
              ↩ Undo
            </button>
            <button
              onClick={handleSave}
              disabled={drawPoints.length < 3 || saving}
              className="h-8 px-3 rounded-xl text-xs font-bold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
            >
              {saving ? '...' : '✓ Save'}
            </button>
            <button
              onClick={handleCancel}
              className="h-8 px-3 rounded-xl text-xs font-bold bg-white/10 text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Drawing instruction */}
      {drawing && (
        <div className="px-4 py-2 text-center text-xs font-bold text-white/80" style={{ background: 'rgba(21,101,192,0.4)' }}>
          {drawPoints.length === 0 ? 'Tap the map to start drawing the boundary' : `${drawPoints.length} points — tap Save when finished`}
        </div>
      )}

      {/* No boundary yet and not drawing */}
      {!hasGeometry && !drawing && (
        <div className="flex flex-col items-center gap-2 py-8" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <span className="text-4xl">📍</span>
          <p className="font-heading font-bold text-white text-sm">No boundary drawn yet</p>
          <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>Tap "Draw Boundary" to outline this pasture on the map</p>
        </div>
      )}

      {/* Map */}
      {(hasGeometry || drawing) && (
        <div style={{ height: 300 }}>
          <MapContainer
            center={defaultCenter}
            zoom={14}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="© Esri"
              maxZoom={20}
            />

            {hasGeometry && <AutoFit geometry={pasture.geometry} />}

            <DrawingHandler drawing={drawing} onAddPoint={handleAddPoint} />

            {/* Saved polygon */}
            {hasGeometry && drawPoints.length === 0 && (
              <Polygon
                positions={pasture.geometry}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.25, weight: 2 }}
              />
            )}

            {/* Drawing preview */}
            {drawPoints.length > 1 && (
              <Polygon
                positions={drawPoints}
                pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.2, dashArray: '8 4', weight: 2 }}
              />
            )}

            {/* Drawing point markers */}
            {drawPoints.map((pt, i) => (
              <Marker key={i} position={pt} icon={createSvgIcon('📍', 20)} />
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}