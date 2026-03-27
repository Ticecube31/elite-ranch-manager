/**
 * AISearchBar — always-visible header search that opens the AI assistant.
 * When on /calving, calls onCalvingAI() to open the in-page calving AI.
 * On all other pages, navigates to /ai-assistant.
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Search } from 'lucide-react';

export default function AISearchBar({ headerStyle = {}, onCalvingAI, onHerdAI }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [focused, setFocused] = useState(false);

  const isLight       = !headerStyle.background;
  const isCalvingPage = location.pathname.startsWith('/calving');
  const isHerdPage    = location.pathname.startsWith('/herd');

  const handleClick = () => {
    if (isCalvingPage && onCalvingAI) {
      onCalvingAI();
    } else if (isHerdPage && onHerdAI) {
      onHerdAI();
    } else {
      navigate('/ai-assistant');
    }
  };

  return (
    <button
      onClick={handleClick}
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
      <span className="truncate">
        {isCalvingPage ? 'Ask about this season...' : isHerdPage ? 'Ask about this herd...' : 'Ask AI Ranch Assistant...'}
      </span>
      <Search className="w-3.5 h-3.5 shrink-0 opacity-50 ml-auto" />
    </button>
  );
}