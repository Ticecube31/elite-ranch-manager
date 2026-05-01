import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

const PURPLE = '#6B2D5E';

export default function ChildrenCell({ animalId, animals, onAddChild, onRemoveChild }) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [search, setSearch] = useState('');
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  
  // Get current animal and check if female
  const currentAnimal = animals.find(a => a.id === animalId);
  const isFemale = currentAnimal?.sex === 'Female';
  
  // Find all calves with this animal as mother (strict mother_id relationship)
  const calves = isFemale ? animals.filter(a => a.mother_id === animalId) : [];
  
  // Get potential children (animals not already linked as calves)
  const potentialChildren = animals.filter(a => 
    a.id !== animalId && 
    !calves.find(c => c.id === a.id)
  );

  // Filter by search
  const filteredChildren = potentialChildren.filter(a =>
    a.tag_number.toString().includes(search) || a.animal_type.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddChild = (childId) => {
    onAddChild?.(childId);
    setShowMenu(false);
  };

  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  }, [showMenu]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target) && buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Non-female animals show only a dash
  if (!isFemale) {
    return <span className="text-xs text-gray-300">—</span>;
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 items-start">
        {calves.length > 0 ? (
          <>
            {calves.map(calf => (
              <div
                key={calf.id}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap"
                style={{ background: '#E8F5E9', color: '#2E7D32' }}
              >
                #{calf.tag_number}
                <button
                  onClick={() => onRemoveChild?.(calf.id)}
                  className="ml-1 hover:opacity-70 transition-opacity"
                  title="Remove child"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
        
        {/* Add child button - only for females */}
        <button
          ref={buttonRef}
          onClick={() => setShowMenu(!showMenu)}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-purple-50 transition-colors"
          style={{ color: PURPLE }}
          title="Add child"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Dropdown menu */}
      {showMenu && (
        <div ref={menuRef} className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] min-w-[240px]" style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}>
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full px-3 py-2 text-xs border-b border-gray-200 outline-none focus:bg-purple-50"
          />
          <div className="max-h-48 overflow-y-auto p-2">
            {filteredChildren.length > 0 ? (
              filteredChildren.map(child => (
                <button
                  key={child.id}
                  onClick={() => {
                    handleAddChild(child.id);
                    setSearch('');
                  }}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-purple-50 rounded text-gray-700 whitespace-nowrap"
                >
                  <strong>#{child.tag_number}</strong> ({child.animal_type}) ({child.birth_year || '—'})
                </button>
              ))
            ) : (
              <p className="text-xs text-gray-400 px-2 py-1">No animals found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}