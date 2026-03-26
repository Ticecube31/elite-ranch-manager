import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-react';

const typeEmoji = { Cow: '🐮', Heifer: '🐮', Calf: '🐄', Bull: '🐂', Steer: '🐂' };
const sexColor  = { Male: 'text-blue-600 bg-blue-50', Female: 'text-pink-600 bg-pink-50' };

export default function RecentActivity({ animals, sessions }) {
  // Merge & sort last 5 by created_date
  const items = [
    ...animals.slice(0, 8).map(a => ({ kind: 'animal', ...a })),
    ...sessions.slice(0, 4).map(s => ({ kind: 'session', ...s })),
  ]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  if (!items.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-bold text-lg text-foreground">Recent Activity</h2>
        <Link to="/calving" className="text-sm text-primary font-semibold flex items-center gap-1">
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className="bg-card rounded-xl border border-border px-4 py-3 flex items-center gap-3"
          >
            {item.kind === 'animal' ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                  {typeEmoji[item.animal_type] ?? '🐄'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">#{item.animal_number}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${sexColor[item.sex] ?? 'text-muted-foreground bg-muted'}`}>
                      {item.sex}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.animal_type}</span>
                  </div>
                  {item.created_date && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Logged {formatDistanceToNow(new Date(item.created_date), { addSuffix: true })}
                    </p>
                  )}
                </div>
                <Link to="/calving" className="text-muted-foreground hover:text-foreground p-1">
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl shrink-0">
                  🔀
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-foreground">{item.session_name}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Sorting session · {item.sorted_animals?.length ?? 0} sorted
                  </p>
                </div>
                <Link to="/sorting" className="text-muted-foreground hover:text-foreground p-1">
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}