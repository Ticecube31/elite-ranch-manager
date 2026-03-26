import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages.map(m => `${m.role === 'user' ? 'Rancher' : 'Assistant'}: ${m.content}`).join('\n');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the AI Ranch Assistant for "Elite Ranch Manager" app. You help ranchers with cattle management, calving, sorting, pasture rotation, animal health, and using this app. Be practical, friendly, and use simple ranch language. Keep answers concise.\n\nConversation so far:\n${history}\n\nRancher: ${input}\n\nAssistant:`,
      add_context_from_internet: true,
    });

    setMessages(prev => [...prev, { role: 'assistant', content: res }]);
    setLoading(false);
  };

  const suggestions = [
    "When should I start calving season?",
    "How do I sort calves by sex efficiently?",
    "What's the best pasture rotation schedule?",
    "How do I tag a new calf in this app?",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl">AI Ranch Assistant</h1>
            <p className="text-xs text-muted-foreground">Ask anything about your ranch</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4 no-scrollbar">
        {messages.length === 0 && (
          <div className="py-8 space-y-4">
            <p className="text-center text-muted-foreground text-sm">Try asking:</p>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); }}
                  className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 text-sm hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-sm">{msg.content}</p>
              ) : (
                <div className="prose prose-sm max-w-none text-foreground">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your ranch question..."
            className="h-14 text-base"
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <Button onClick={sendMessage} disabled={loading} size="icon" className="h-14 w-14 shrink-0">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}