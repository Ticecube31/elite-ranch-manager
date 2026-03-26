import React from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const statusColors = {
  Alive: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Sold: 'bg-blue-100 text-blue-800 border-blue-200',
  Died: 'bg-red-100 text-red-800 border-red-200',
};

const typeIcons = {
  'Cow':          '🐮',
  '1st Calf Heifer': '🐮',
  'Calf - Heifer':'🐄',
  'Bull':         '🐂',
  'Calf - Steer': '🐂',
};

export default function AnimalCard({ animal, onClick, pastures = [] }) {
  const pastureName = pastures.find(p => p.id === animal.pasture_id)?.pasture_name;
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        {animal.photo_url ? (
          <img src={animal.photo_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
            {typeIcons[animal.animal_type] || '🐄'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-lg text-foreground truncate">
              #{animal.animal_number}
            </h3>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[animal.status] || ''}`}>
              {animal.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span className="font-medium">{animal.animal_type}</span>
            <span>•</span>
            <span>{animal.sex}</span>
            {animal.mother_animal_number && (
              <>
                <span>•</span>
                <span>Dam: #{animal.mother_animal_number}</span>
              </>
            )}
          </div>
          {animal.date_of_birth && (
            <p className="text-xs text-muted-foreground mt-1">
              Born: {format(new Date(animal.date_of_birth), 'MMM d, yyyy')}
            </p>
          )}
          {pastureName && (
            <p className="text-xs text-muted-foreground mt-0.5">📍 {pastureName}</p>
          )}
        </div>
      </div>
    </button>
  );
}