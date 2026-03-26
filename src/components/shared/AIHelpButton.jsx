import React, { useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

export default function AIHelpButton({ context = "general ranch management" }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a helpful ranch management AI assistant. The rancher is currently in the "${context}" section of their ranch management app. Answer their question in simple, practical ranch terms. Keep it short and actionable.\n\nQuestion: ${question}`,
      add_context_from_internet: true,
    });
    setAnswer(res);
    setLoading(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 left-4 sm:left-auto sm:w-96 z-40 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-primary/5">
        <h3 className="font-heading font-bold text-base">AI Ranch Assistant</h3>
        <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-secondary">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 max-h-64 overflow-y-auto">
        {answer ? (
          <div className="prose prose-sm max-w-none text-foreground">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Ask me anything about ranch management, cattle care, or how to use this app!
          </p>
        )}
        {loading && (
          <div className="flex items-center gap-2 mt-3 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}
      </div>
      <div className="p-3 border-t flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type your question..."
          className="text-base h-12"
          onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
        />
        <Button onClick={askQuestion} disabled={loading} size="icon" className="h-12 w-12 shrink-0">
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}