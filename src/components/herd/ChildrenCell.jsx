import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

const PURPLE = '#6B2D5E';
const PURPLE_DARK = '#4A1F40';

export default function ChildrenCell({ animalId, animals, onAddChild, onRemoveChild }) {
  const [showMenu, setShowMenu] = useState(false);
  
  // Find all calves with this animal as parent
  const calves = animals.filter(a => a.mother_id === animalId || (a.mother_animal_number && animals.find(p => p.id === animalId)?.tag_number === a.mother_animal_number));
  
  // Get potential children (animals born after this one that could be offspring)
  const parentAnimal = animals.find(a => a.id === animalId);
  const potentialChildren = animals.filter(a => 
    a.id !== animalId && 
    !calves.find(c => c.id === a.id) &&
    a.mother_animal_number !== parentAnimal?.tag_number
  );

  const handleAddChild = (childId) => {
    onAddChild?.(childId);
    setShowMenu(false);
  };

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
        
        {/* Add child button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-purple-50 transition-colors"
          style={{ color: PURPLE }}
          title="Add child"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Dropdown menu */}
      {showMenu && potentialChildren.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-[9999] max-h-48 overflow-y-auto min-w-[200px]">
          {potentialChildren.map(child => (
            <button
              key={child.id}
              onClick={() => handleAddChild(child.id)}
              className="w-full text-left px-2 py-1 text-xs hover:bg-purple-50 rounded text-gray-700 whitespace-nowrap"
            >
              #{child.tag_number} ({child.animal_type})
            </button>
          ))}
        </div>
      )}
      
      {showMenu && potentialChildren.length === 0 && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-[9999] text-xs text-gray-400 min-w-[150px]">
          No available animals
        </div>
      )}
    </div>
  );
}