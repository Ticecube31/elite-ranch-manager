/**
 * AISearchBar — always-visible header search that opens the AI assistant.
 * Replaces floating AI button app-wide.
 */
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Search } from 'lucide-react';

export default function AISearchBar({ headerStyle = {} }) {
  const navigate = useNavigate();
  const [focused, setFocused] = useState(false);

  const isLight = !headerStyle.background; // home = light header

  return (
    <button
      onClick={() => navigate('/ai-assistant')}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={`
        flex items-center gap-2 flex-1 max-w-xs sm:max-w-sm
        h-9 px-3 rounded-xl border transition-all
        text-left text-sm font-medium
        ${isLight
          ? 'bg-muted/60 border-border text-muted-foreground hover:bg-muted'
          : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'
        }
        ${focused ? 'ring-2 ring-ring' : ''}
      `}
      aria-label="Ask AI Ranch Assistant"
    >
      <Sparkles className="w-3.5 h-3.5 shrink-0 opacity-70" />
      <span className="truncate">Ask AI Ranch Assistant...</span>
      <Search className="w-3.5 h-3.5 shrink-0 opacity-50 ml-auto" />
    </button>
  );
}