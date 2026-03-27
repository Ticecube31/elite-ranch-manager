import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Send, Copy, Loader, ExternalLink, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const PURPLE = '#6B2D5E';
const PURPLE_DARK = '#4A1F40';
const PURPLE_BG = '#F9F4F8';
const PURPLE_LIGHT = '#F3E8F0';

// ── Response renderer with actions ────────────────────────────────────────────
function ResponseCard({ response, animals, pastures, tagHistory, onOpenDetail, onOpenSpreadsheet }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(response.text || JSON.stringify(response.data || response));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
      <div className="px-5 py-5 space-y-4">

        {/* Main text response */}
        {response.text && (
          <div>
            <p className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap">{response.text}</p>
          </div>
        )}

        {/* Structured data: animal list */}
        {response.type === 'animal_list' && response.data?.animals?.length > 0 && (
          <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Results ({response.data.animals.length})</p>
            {response.data.animals.slice(0, 10).map((a, i) => (
              <button key={a.id || i}
                onClick={() => onOpenDetail(a.id)}
                className="w-full flex items-start justify-between gap-3 p-3 rounded-xl hover:bg-purple-50 active:bg-purple-100 text-left transition-colors border border-purple-50">
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-black text-lg" style={{ color: PURPLE_DARK }}>#{a.tag_number}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{a.animal_type} • {a.sex} • {a.status}</p>
                </div>
                <Eye className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
              </button>
            ))}
            {response.data.animals.length > 10 && (
              <p className="text-xs text-gray-400 text-center py-1">+{response.data.animals.length - 10} more</p>
            )}
          </div>
        )}

        {/* Structured data: tag history table */}
        {response.type === 'tag_history' && response.data?.history?.length > 0 && (
          <div className="space-y-2 mt-3 pt-3 border-t border-gray-100 overflow-x-auto">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tag Changes ({response.data.history.length})</p>
            <div className="space-y-2">
              {response.data.history.slice(0, 8).map((h, i) => (
                <div key={h.id || i} className="flex items-start justify-between gap-2 p-3 rounded-xl" style={{ background: PURPLE_LIGHT }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-black text-sm" style={{ color: PURPLE_DARK }}>
                      {h.old_tag_number || '(original)'} → #{h.new_tag_number}
                    </p>
                    {h.reason && <p className="text-xs text-gray-500 mt-0.5">{h.reason}</p>}
                    {h.changed_by && <p className="text-xs text-gray-400 mt-1">by {h.changed_by}</p>}
                  </div>
                  {h.change_date && (
                    <p className="text-xs text-gray-400 shrink-0 whitespace-nowrap mt-0.5">
                      {format(new Date(h.change_date), 'MM/dd/yy')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Structured data: statistics */}
        {response.type === 'stats' && response.data && (
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
            {Object.entries(response.data).map(([key, value]) => (
              <div key={key} className="rounded-2xl py-4 px-3 text-center" style={{ background: PURPLE_LIGHT }}>
                <p className="font-heading font-black text-3xl" style={{ color: PURPLE_DARK }}>{value}</p>
                <p className="text-xs font-bold text-gray-500 mt-1 leading-tight">{key}</p>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {response.data?.animal_id && (
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button onClick={() => onOpenDetail(response.data.animal_id)}
              className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-bold"
              style={{ background: PURPLE_LIGHT, color: PURPLE_DARK }}>
              <Eye className="w-4 h-4" /> View Detail
            </button>
            <button onClick={() => onOpenSpreadsheet(response.data.animal_id)}
              className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-sm font-bold bg-white border-2"
              style={{ borderColor: PURPLE, color: PURPLE }}>
              <ExternalLink className="w-4 h-4" /> Open in Spreadsheet
            </button>
          </div>
        )}

      </div>

      {/* Copy button in footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
        <button onClick={handleCopy}
          className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-gray-100 transition-colors"
          style={{ color: PURPLE }}>
          <Copy className="w-3.5 h-3.5" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HerdManagementAIAssistant({ onClose, onOpenDetail, onOpenSpreadsheet }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: animals = [] } = useQuery({
    queryKey: ['animals'],
    queryFn: () => base44.entities.Animals.list('-created_date'),
    initialData: [],
  });

  const { data: pastures = [] } = useQuery({
    queryKey: ['pastures'],
    queryFn: () => base44.entities.Pastures.list(),
    initialData: [],
  });

  const { data: tagHistory = [] } = useQuery({
    queryKey: ['tag-history'],
    queryFn: () => base44.entities.TagHistory.list('-change_date'),
    initialData: [],
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const buildContextData = () => {
    const getPastureName = (pid) => pastures.find(p => p.id === pid)?.pasture_name || '—';

    return {
      totalAnimals: animals.length,
      aliveAnimals: animals.filter(a => a.status === 'Alive').length,
      solvedAnimals: animals.filter(a => a.status === 'Sold').length,
      diedAnimals: animals.filter(a => a.status === 'Died').length,
      missingAnimals: animals.filter(a => a.status === 'Missing').length,
      cows: animals.filter(a => a.animal_type === 'Cow').length,
      heifers: animals.filter(a => ['1st Calf Heifer', 'Calf - Heifer'].includes(a.animal_type)).length,
      steers: animals.filter(a => a.animal_type === 'Calf - Steer').length,
      bulls: animals.filter(a => a.animal_type === 'Bull').length,
      locations: [...new Set(animals.map(a => getPastureName(a.pasture_id)))],
      tagHistoryCount: tagHistory.length,
      animals: animals.map(a => ({
        id: a.id,
        tag_number: a.tag_number,
        sex: a.sex,
        animal_type: a.animal_type,
        status: a.status,
        mother_animal_number: a.mother_animal_number,
        pasture_name: getPastureName(a.pasture_id),
        date_of_birth: a.date_of_birth,
      })),
      tagHistory: tagHistory.map(h => ({
        animal_id: h.animal_id,
        old_tag_number: h.old_tag_number,
        new_tag_number: h.new_tag_number,
        change_date: h.change_date,
        changed_by: h.changed_by,
        reason: h.reason,
      })),
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const contextData = buildContextData();

      const prompt = `You are a helpful AI assistant for a ranch management app. A rancher is asking you about their herd data.

AVAILABLE DATA:
- Total Animals: ${contextData.totalAnimals}
- Alive: ${contextData.aliveAnimals}
- Sold: ${contextData.solvedAnimals}
- Died: ${contextData.diedAnimals}
- Cows: ${contextData.cows}
- Heifers: ${contextData.heifers}
- Steers: ${contextData.steers}
- Bulls: ${contextData.bulls}
- Locations: ${contextData.locations.join(', ')}
- Tag History Entries: ${contextData.tagHistoryCount}

COMPLETE ANIMAL DATA (JSON):
${JSON.stringify(contextData.animals, null, 2)}

TAG HISTORY DATA (JSON):
${JSON.stringify(contextData.tagHistory, null, 2)}

RANCHER'S QUESTION: "${userMessage}"

INSTRUCTIONS:
1. Answer in plain, friendly ranch language. No jargon.
2. If the answer includes specific animals or numbers, be very clear and direct.
3. Keep responses concise and easy to scan.
4. If showing a list of animals, use this format: "Tag #101 (Cow, Alive)"
5. If the question asks about tag history, show the most relevant entries.
6. Always be helpful and assume the rancher is asking for practical ranch decisions.
7. If the data doesn't contain what they're asking for, say so clearly.

Provide ONLY the response text that the rancher should see. No meta-commentary.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });

      let aiResponse = response;
      let responseType = 'text';
      let responseData = null;

      // Try to parse structured responses based on question type
      if (userMessage.toLowerCase().includes('tag') && userMessage.toLowerCase().includes('history')) {
        const relevantHistory = contextData.tagHistory.filter(h =>
          userMessage.toLowerCase().includes(h.new_tag_number) || userMessage.toLowerCase().includes(h.old_tag_number)
        );
        if (relevantHistory.length > 0) {
          responseType = 'tag_history';
          responseData = { history: relevantHistory };
        }
      }

      if ((userMessage.toLowerCase().includes('how many') || userMessage.toLowerCase().includes('total')) && 
          !userMessage.toLowerCase().includes('animals')) {
        responseType = 'stats';
        responseData = {
          'Total Animals': contextData.totalAnimals,
          'Alive': contextData.aliveAnimals,
          'Cows': contextData.cows,
          'Steers': contextData.steers,
        };
      }

      if (userMessage.toLowerCase().includes('all animals') || 
          (userMessage.toLowerCase().includes('show') && userMessage.toLowerCase().includes('animals'))) {
        responseType = 'animal_list';
        responseData = { animals: contextData.animals };
      }

      if (userMessage.toLowerCase().includes('pasture') || userMessage.toLowerCase().includes('location')) {
        const locName = userMessage.match(/([A-Za-z\s]+pasture|north|south|east|west|pasture)/i)?.[0];
        if (locName) {
          const animalsInLoc = contextData.animals.filter(a => 
            a.pasture_name?.toLowerCase().includes(locName.toLowerCase())
          );
          if (animalsInLoc.length > 0) {
            responseType = 'animal_list';
            responseData = { animals: animalsInLoc };
          }
        }
      }

      const finalMessage = {
        role: 'assistant',
        text: aiResponse,
        type: responseType,
        data: responseData,
      };

      setMessages(prev => [...prev, finalMessage]);
    } catch (error) {
      toast.error('Failed to get AI response');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Sorry, I had trouble understanding that question. Try asking about tag numbers, animal types, or locations in your herd.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: PURPLE_BG }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="shrink-0" style={{ background: `linear-gradient(135deg, ${PURPLE_DARK}, ${PURPLE})` }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={onClose} className="text-white/80 hover:text-white p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-heading font-black text-white text-lg">Herd AI Assistant</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 px-4">
            <p className="text-5xl mb-4">🤖</p>
            <p className="font-heading font-black text-xl text-gray-800 mb-2">Herd Management AI</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Ask questions about your animals, tag history, locations, or herd statistics. I'll use your live herd data to answer.
            </p>
            <div className="mt-6 space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Example questions:</p>
              <div className="space-y-1 text-xs text-gray-600 max-w-xs mx-auto">
                <p>• "How many cows are alive?"</p>
                <p>• "Show tag history for #101"</p>
                <p>• "All animals in North Pasture"</p>
                <p>• "Which steers changed tags?"</p>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="max-w-xs rounded-2xl px-4 py-3" style={{ background: PURPLE }}>
                <p className="text-sm text-white">{msg.text}</p>
              </div>
            ) : (
              <div className="w-full max-w-lg">
                <ResponseCard
                  response={msg}
                  animals={animals}
                  pastures={pastures}
                  tagHistory={tagHistory}
                  onOpenDetail={onOpenDetail}
                  onOpenSpreadsheet={onOpenSpreadsheet}
                />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
              <div className="flex items-center gap-2">
                <Loader className="w-5 h-5 animate-spin" style={{ color: PURPLE }} />
                <p className="text-sm text-gray-600">Thinking...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-4 bg-white border-t border-purple-100">
        <div className="flex gap-2 max-w-lg mx-auto">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your herd..."
            className="flex-1 h-12 px-4 rounded-2xl border border-gray-200 text-base outline-none focus:border-purple-400"
          />
          <button onClick={handleSend} disabled={loading || !input.trim()}
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-md disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})` }}>
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}