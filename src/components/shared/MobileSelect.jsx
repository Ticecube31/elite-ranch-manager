import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const isMobile = () => window.innerWidth < 768;

/**
 * On mobile: renders a bottom-sheet drawer picker.
 * On desktop: falls back to Radix UI Select.
 *
 * Props mirror a minimal subset of Radix Select:
 *   value, onValueChange, placeholder, className, triggerClassName
 *   children: array of <MobileSelectItem> or plain JSX (mobile uses title/value props)
 *
 * Usage:
 *   <MobileSelect value={v} onValueChange={setV} placeholder="Choose...">
 *     <MobileSelectItem value="a">Option A</MobileSelectItem>
 *     <MobileSelectItem value="b">Option B</MobileSelectItem>
 *   </MobileSelect>
 */
export function MobileSelectItem({ value, children, className }) {
  // Used by both desktop (forwarded to SelectItem) and mobile (read by parent).
  return null; // rendering handled by MobileSelect
}
MobileSelectItem.displayName = 'MobileSelectItem';

export default function MobileSelect({
  value,
  onValueChange,
  placeholder = 'Select...',
  triggerClassName = '',
  children,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const mobile = isMobile();

  // Parse children into options array [{value, label}]
  const options = React.Children.toArray(children)
    .filter(c => c && c.props && 'value' in c.props)
    .map(c => ({ value: c.props.value, label: c.props.children }));

  const selectedLabel = options.find(o => o.value === value)?.label ?? null;

  if (!mobile) {
    // Desktop: use Radix Select, re-create children as SelectItems
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Mobile: custom trigger + bottom sheet
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-14 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm disabled:cursor-not-allowed disabled:opacity-50',
          triggerClassName
        )}
      >
        <span className={selectedLabel ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {/* Bottom sheet overlay */}
      {open && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end" onClick={() => setOpen(false)}>
          {/* Scrim */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Sheet */}
          <div
            className="relative bg-card rounded-t-3xl shadow-2xl max-h-[75vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Options list */}
            <div className="overflow-y-auto px-4 pb-8 space-y-1 pt-2">
              {options.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onValueChange(opt.value); setOpen(false); }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.98]',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-5 h-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}