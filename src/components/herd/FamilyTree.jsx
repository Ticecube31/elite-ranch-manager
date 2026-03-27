import React from 'react';
import { ChevronRight } from 'lucide-react';

const STATUS_COLOR = {
  Alive: '#2E7D32',
  Sold: '#1565C0',
  Died: '#C62828',
  Missing: '#F57F17',
};

const STATUS_BG = {
  Alive: '#E8F5E9',
  Sold: '#E3F2FD',
  Died: '#FFEBEE',
  Missing: '#FFF8E1',
};

function AnimalNode({ animal, onNavigate, isMain = false }) {
  if (!animal) return null;

  const statusColor = STATUS_COLOR[animal.status] || STATUS_COLOR.Alive;
  const statusBg = STATUS_BG[animal.status] || STATUS_BG.Alive;

  return (
    <button
      onClick={() => onNavigate(animal.id)}
      className={`rounded-xl border-2 px-3 py-2 transition-all hover:shadow-md active:scale-95 flex flex-col items-center text-center gap-1 ${
        isMain ? 'min-w-[140px]' : 'min-w-[110px]'
      }`}
      style={{
        background: statusBg,
        borderColor: statusColor,
        color: statusColor,
      }}
    >
      <p className={`font-heading font-black ${isMain ? 'text-lg' : 'text-base'}`}>
        #{animal.tag_number}
      </p>
      <p className={`text-xs font-semibold ${isMain ? 'text-sm' : ''}`}>
        {animal.birth_year || '—'}
      </p>
      <p className={`text-xs opacity-75 ${isMain ? '' : 'hidden'}`}>
        {animal.status}
      </p>
    </button>
  );
}

export default function FamilyTree({ animal, animals = [], onNavigateToAnimal }) {
  // Find mother
  const mother = animals.find(
    a => a.tag_number === animal.mother_animal_number
  );

  // Find all calves
  const calves = animals
    .filter(
      a =>
        a.mother_id === animal.id ||
        a.mother_animal_number === animal.tag_number
    )
    .sort((a, b) => (b.date_of_birth || '') - (a.date_of_birth || ''));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 overflow-x-auto no-scrollbar">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
        🌳 Family Tree
      </p>

      <div className="flex flex-col gap-6 min-w-max">
        {/* Mother row */}
        {mother && (
          <div className="flex items-center gap-4">
            <AnimalNode
              animal={mother}
              onNavigate={onNavigateToAnimal}
              isMain={false}
            />
            <div className="text-gray-300 text-lg font-bold">→</div>
          </div>
        )}

        {/* Current animal */}
        <div className="flex justify-center">
          <AnimalNode
            animal={animal}
            onNavigate={onNavigateToAnimal}
            isMain={true}
          />
        </div>

        {/* Calves row */}
        {calves.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Offspring ({calves.length})
            </p>
            <div className="flex gap-3 flex-wrap">
              {calves.map(calf => (
                <AnimalNode
                  key={calf.id}
                  animal={calf}
                  onNavigate={onNavigateToAnimal}
                  isMain={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* No offspring message */}
        {calves.length === 0 && mother && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">No offspring recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}