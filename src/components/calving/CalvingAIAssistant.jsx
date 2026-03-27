import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Loader2, Baby, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const GREEN = '#4CAF50';
const GREEN_DARK = '#2E7D32';
const GREEN_BG = '#F1F8F1';

function buildContext(animals, seasons, pastures, selectedSeasonId) {
  const seasonAnimals = animals.filter(a =>
    selectedSeasonId && selectedSeasonId !== 'all'
      ? a.calving_season_id === selectedSeasonId
      : true
  );
  const calves = seasonAnimals.filter(a => ['Calf - Heifer', 'Calf - Steer'].includes(a.animal_type));
  const cows   = seasonAnimals.filter(a => ['Cow', '1st Calf Heifer'].includes(a.animal_type));

  const males   = calves.filter(a => a.sex === 'Male').length;
  const females = calves.filter(a => a.sex === 'Female').length;
  const twins   = calves.filter(a => a.twin).length;
  const alive   = calves.filter(a => a.status === 'Alive').length;
  const died    = calves.filter(a => a.status === 'Died').length;
  const sold    = calves.filter(a => a.status === 'Sold').length;

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
  const seasonLabel = selectedSeason
    ? (selectedSeason.label || `Calving Season ${selectedSeason.year}`)
    : 'All Seasons';

  // Group by pasture
  const byPasture = {};
  calves.forEach(c => {
    const p = pastures.find(p => p.id === c.born_pasture_id);
    const name = p ? p.pasture_name : 'Unknown Location';
    byPasture[name] = (byPasture[name] || 0) + 1;
  });

  // Group by month
  const byMonth = {};
  calves.forEach(c => {
    if (c.date_of_birth) {
      const m = new Date(c.date_of_birth).toLocaleString('default', { month: 'long', year: 'numeric' });
      byMonth[m] = (byMonth[m] || 0) + 1;
    }
  });

  // Group by week (last 8 weeks)
  const byWeek = {};
  calves.forEach(c => {
    if (c.date_of_birth) {
      const d = new Date(c.date_of_birth);
      const week = `Week of ${new Date(d.setDate(d.getDate() - d.getDay())).toLocaleDateString('default', { month: 'short', day: 'numeric' })}`;
      byWeek[week] = (byWeek[week] || 0) + 1;
    }
  });

  return `
You are a helpful AI ranch assistant for the Elite Ranch Manager app.
You are currently in the CALVING SEASON section and have access to the following real data:

CURRENT SEASON: ${seasonLabel}
TOTAL CALVES: ${calves.length}
MALE CALVES (Steers): ${males}
FEMALE CALVES (Heifers): ${females}
TWINS DETECTED: ${twins} calves (${calves.length > 0 ? Math.round((twins / calves.length) * 100) : 0}% twin rate)
ALIVE: ${alive}
DIED: ${died}
SOLD: ${sold}
SURVIVAL RATE: ${calves.length > 0 ? Math.round((alive / calves.length) * 100) : 0}%
TOTAL COWS / MOTHERS: ${cows.length}

CALVES BY LOCATION:
${Object.entries(byPasture).map(([k, v]) => `  ${k}: ${v}`).join('\n') || '  No location data'}

CALVES BY MONTH:
${Object.entries(byMonth).map(([k, v]) => `  ${k}: ${v}`).join('\n') || '  No date data'}

CALVES BY WEEK (recent):
${Object.entries(byWeek).slice(-8).map(([k, v]) => `  ${k}: ${v}`).join('\n') || '  No date data'}

INDIVIDUAL CALF RECORDS (first 60):
${calves.slice(0, 60).map(c => {
  const pasture = pastures.find(p => p.id === c.born_pasture_id);
  return `  Tag#${c.tag_number} | ${c.sex} | ${c.status} | Born: ${c.date_of_birth || 'unknown'} | Location: ${pasture?.pasture_name || 'unknown'} | Twin: ${c.twin ? 'Yes' : 'No'} | Mother: ${c.mother_animal_number || 'unknown'}`;
}).join('\n') || '  No calves recorded yet'}

INSTRUCTIONS:
- Answer in plain rancher-friendly language. Short and direct.
- Use big numbers when showing stats.
- Keep answers under 120 words.
- No technical jargon.
- If listing animals, keep lists short (top 5-10 max).
- Always be helpful and positive.
`.trim();
}

function StatCard({ label, value, sub, color = GREEN_DARK }) {
  return (
    <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-green-100 flex items-center gap-4">
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="font-heading font-black text-4xl mt-0.5" style={{ color }}>{value}</p>
        {sub && <p className="text-sm text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function parseStatsFromResponse(text) {
  // Try to extract key numbers from AI response for visual display
  const stats = [];
  const patterns = [
    { re: /(\d+)\s*male/i,     label: 'Male Calves',    color: '#1976D2' },
    { re: /(\d+)\s*female/i,   label: 'Female Calves',  color: '#E91E8C' },
    { re: /(\d+)\s*twin/i,     label: 'Twins',          color: '#7B1FA2' },
    { re: /(\d+)\s*died?/i,    label: 'Died',           color: '#C62828' },
    { re: /(\d+)%\s*survival/i,label: 'Survival Rate',  color: GREEN_DARK, suffix: '%' },
    { re: /(\d+)\s*total\s*calf/i, label: 'Total Calves', color: GREEN_DARK },
  ];
  patterns.forEach(({ re, label, color, suffix }) => {
    const m = text.match(re);
    if (m) stats.push({ label, value: m[1] + (suffix || ''), color });
  });
  return stats.slice(0, 3);
}

export default function CalvingAIAssistant({ animals, seasons, pastures, selectedSeasonId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const suggestions = [
    'How many male calves this season?',
    'What is the twin rate?',
    'What is the survival rate?',
    'Show me calves by location',
    'How many calves died?',
    'How many calves born this month?',
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const sendMessage = async (text) => {
    const question = (text || input).trim();
    if (!question) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    const systemContext = buildContext(animals, seasons, pastures, selectedSeasonId);

    // Build history for context
    const history = messages.map(m =>
      m.role === 'user'
        ? `Rancher: ${m.text}`
        : `Assistant: ${m.text}`
    ).join('\n');

    const prompt = `${systemContext}\n\n${history ? history + '\n' : ''}Rancher: ${question}\nAssistant:`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    const answer = typeof response === 'string' ? response : (response?.text || response?.answer || JSON.stringify(response));

    setLoading(false);
    setMessages(prev => [...prev, { role: 'ai', text: answer }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: GREEN_BG }}>

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-green-200 shrink-0"
        style={{ background: GREEN_DARK }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-white/80" />
          <h1 className="font-heading font-black text-white text-lg">Calving AI Assistant</h1>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white p-2 -mr-2">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

        {/* Empty state with suggestions */}
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 shadow-sm border border-green-100">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: GREEN }}>
                <Baby className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-800">Hey! I know your calving data.</p>
                <p className="text-sm text-gray-500 mt-0.5">Ask me anything about this season.</p>
              </div>
            </div>

            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Try asking:</p>
            <div className="grid gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="text-left w-full px-4 py-3 rounded-xl bg-white border border-green-200 text-sm font-semibold text-gray-700 hover:bg-green-50 active:scale-[0.98] transition-all shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => {
          if (msg.role === 'user') {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm font-semibold text-white text-sm shadow-sm" style={{ background: GREEN_DARK }}>
                  {msg.text}
                </div>
              </div>
            );
          }
          const stats = parseStatsFromResponse(msg.text);
          return (
            <div key={i} className="space-y-3">
              {/* Stat cards if detected */}
              {stats.length > 0 && (
                <div className="grid gap-2">
                  {stats.map((s, j) => (
                    <StatCard key={j} label={s.label} value={s.value} color={s.color} />
                  ))}
                </div>
              )}
              {/* Text response */}
              <div className="bg-white rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm border border-green-100">
                <p className="text-gray-800 text-base leading-relaxed font-medium">{msg.text}</p>
              </div>
              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm active:scale-95 transition-all"
                  style={{ background: GREEN }}
                >
                  <TrendingUp className="w-4 h-4" /> View All Calves
                </button>
              </div>
            </div>
          );
        })}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 shadow-sm border border-green-100">
            <Loader2 className="w-5 h-5 animate-spin shrink-0" style={{ color: GREEN }} />
            <p className="text-gray-500 font-medium text-sm">Looking at your calving data...</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-4 pb-6 pt-3 border-t border-green-200" style={{ background: GREEN_BG }}>
        <div className="flex items-center gap-2 bg-white rounded-2xl border-2 border-green-300 px-4 pr-2 shadow-sm focus-within:border-green-500 transition-colors">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about your calves..."
            className="flex-1 h-14 text-base font-medium bg-transparent outline-none text-gray-800 placeholder:text-gray-300"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-30 active:scale-95 transition-all"
            style={{ background: GREEN }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-3 h-11 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-600 bg-white active:scale-[0.98] transition-all"
        >
          Close Assistant
        </button>
      </div>
    </div>
  );
}