import React from 'react';

const STATUS_COLOR = {
  Alive: '#2E7D32',
  Sold: '#1565C0',
  Died: '#666666',
  Missing: '#F57F17',
};

const STATUS_BG = {
  Alive: '#4CAF50',
  Sold: '#1E5A96',
  Died: '#808080',
  Missing: '#FFA500',
};

function AnimalNode({ animal, onNavigate, offspring = null, isMother = false }) {
  if (!animal) return null;

  const statusColor = STATUS_COLOR[animal.status] || STATUS_COLOR.Alive;
  const statusBg = STATUS_BG[animal.status] || STATUS_BG.Alive;
  const sexInitial = animal.sex === 'Male' ? 'M' : 'F';

  return (
    <button
      onClick={() => onNavigate(animal.id)}
      className="flex flex-col items-center gap-3 group"
    >
      <div
        className="rounded-3xl px-6 py-4 transition-all hover:shadow-lg active:scale-95 border-4 border-black min-w-[180px] text-center relative"
        style={{ backgroundColor: statusBg }}
      >
        {/* Sex and Status badges */}
        <div className="absolute -top-2 left-3 flex gap-1">
          <div className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs border-2 border-black">
            {sexInitial}
          </div>
          <div
            className="text-white rounded-full px-3 h-7 flex items-center font-bold text-xs border-2 border-black"
            style={{ backgroundColor: statusColor }}
          >
            {animal.status}
          </div>
        </div>

        {/* Content */}
        <div className="mt-4">
          <p className="font-heading font-black text-white text-xl">
            {animal.tag_number}
          </p>
          <p className="text-white text-sm font-semibold">
            {animal.birth_year || '—'}
          </p>
          {offspring !== null && (
            <p className="text-white text-xs font-semibold mt-1">
              Total Offspring: {offspring}
            </p>
          )}
        </div>
      </div>
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

  const offspringCount = calves.length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-8">
        🌳 Family Tree
      </p>

      <div className="flex flex-col items-center gap-0">
        {/* Mother row */}
        {mother && (
          <>
            <AnimalNode
              animal={mother}
              onNavigate={onNavigateToAnimal}
              offspring={offspringCount}
            />
            {/* Connecting line from mother to current */}
            <div className="w-1 h-8 bg-blue-400"></div>
          </>
        )}

        {/* Current animal */}
        <AnimalNode
          animal={animal}
          onNavigate={onNavigateToAnimal}
          isMother={true}
        />

        {/* Calves section */}
        {calves.length > 0 && (
          <>
            {/* Connecting line from current to calves */}
            <div className="w-1 h-8 bg-blue-400"></div>

            {/* Horizontal line connecting all calves */}
            <div className="flex items-start gap-0">
              <div className="w-1 h-8 bg-blue-400 absolute left-1/2 transform -translate-x-1/2"></div>
              <div className="relative flex gap-12 px-4">
                {calves.length === 1 ? (
                  // Single calf - just vertical line
                  <div className="flex flex-col items-center gap-0">
                    <div className="w-1 h-8 bg-blue-400"></div>
                    <AnimalNode
                      animal={calves[0]}
                      onNavigate={onNavigateToAnimal}
                    />
                  </div>
                ) : (
                  // Multiple calves - horizontal line with vertical branches
                  <>
                    {/* Top horizontal line */}
                    <svg
                      className="absolute top-0 left-0 w-full h-8 pointer-events-none"
                      style={{ minWidth: calves.length * 240 }}
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="100%"
                        y2="0"
                        stroke="#60A5FA"
                        strokeWidth="4"
                      />
                    </svg>

                    {/* Calves with vertical branches */}
                    {calves.map((calf, idx) => (
                      <div key={calf.id} className="flex flex-col items-center gap-0">
                        <div className="w-1 h-8 bg-blue-400"></div>
                        <AnimalNode
                          animal={calf}
                          onNavigate={onNavigateToAnimal}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* No offspring message */}
        {calves.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">No offspring recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}