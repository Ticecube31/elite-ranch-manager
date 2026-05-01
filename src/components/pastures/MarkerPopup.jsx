import React, { useState } from 'react';
import { Pencil, Trash2, X, Check } from 'lucide-react';

/**
 * A floating popup card shown when a water source or gate marker is tapped on the map.
 * Props:
 *   item      - the water source or gate object
 *   itemType  - 'water' | 'gate'
 *   onClose   - dismiss the popup
 *   onSave    - async (newName: string) => void
 *   onDelete  - async () => void
 */

const TYPE_ICONS = { 'Water Tank': '🪣', 'Pond': '💧', 'Dam': '🏗️', 'Lake': '🌊', Gate: '🚧' };

export default function MarkerPopup({ item, itemType, onClose, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name || '');
  const [saving, setSaving] = useState(false);

  const displayIcon = itemType === 'gate' ? '🚧' : (TYPE_ICONS[item.type] || '💧');
  const displayLabel = item.name || (itemType === 'gate' ? 'Gate' : item.type);
  const subLabel = item.name ? (itemType === 'gate' ? 'Gate' : item.type) : null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(name.trim());
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="absolute bottom-6 left-4 right-4 z-[9200] pointer-events-none">
      <div className="pointer-events-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3">
          <span className="text-3xl">{displayIcon}</span>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                placeholder={itemType === 'gate' ? 'e.g. North Entry' : `e.g. East ${item.type}`}
                className="w-full h-9 px-3 rounded-xl border-2 border-blue-400 outline-none text-sm font-semibold text-gray-900"
              />
            ) : (
              <>
                <p className="font-heading font-bold text-base text-gray-900 truncate">{displayLabel}</p>
                {subLabel && <p className="text-xs text-gray-400">{subLabel}</p>}
              </>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-10 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{ background: '#16a34a' }}
              >
                <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Name'}
              </button>
              <button
                onClick={() => { setEditing(false); setName(item.name || ''); }}
                className="h-10 px-4 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-600"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex-1 h-10 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-1.5"
                style={{ background: '#1E5F8E' }}
              >
                <Pencil className="w-4 h-4" /> Edit Name
              </button>
              <button
                onClick={onDelete}
                className="h-10 w-10 rounded-2xl flex items-center justify-center border-2 border-red-100 text-red-400 hover:text-red-600 active:scale-95 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}