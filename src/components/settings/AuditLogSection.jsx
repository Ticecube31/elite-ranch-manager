import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';
import { ClipboardList } from 'lucide-react';

const ACTION_COLORS = {
  Created: 'bg-emerald-100 text-emerald-700',
  Updated: 'bg-blue-100 text-blue-700',
  Deleted: 'bg-red-100 text-red-700',
  Sorted:  'bg-purple-100 text-purple-700',
  Moved:   'bg-amber-100 text-amber-700',
  Archived:'bg-slate-100 text-slate-600',
};

export default function AuditLogSection() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 50),
    initialData: [],
  });

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!logs.length) return (
    <div className="text-center py-12">
      <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground font-medium">No activity recorded yet.</p>
      <p className="text-sm text-muted-foreground">Changes to animals, sessions, and pastures will appear here.</p>
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-3">Last 50 changes across all sections</p>
      {logs.map(log => (
        <div key={log.id} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 mt-0.5 ${ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground'}`}>
            {log.action}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{log.entity_label || log.entity_type}</p>
            {log.change_summary && <p className="text-xs text-muted-foreground mt-0.5">{log.change_summary}</p>}
            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
              <span>{log.changed_by_name || log.changed_by}</span>
              {log.created_date && (
                <>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(log.created_date), { addSuffix: true })}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}