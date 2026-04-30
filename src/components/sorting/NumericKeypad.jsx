import React from 'react';
import { Delete, ArrowRight } from 'lucide-react';

export default function NumericKeypad({ value, onInput, onBackspace, onSubmit, disabled = false }) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['0', 'delete', 'next'],
  ];

  return (
    <div className="space-y-3">
      {keys.map((row, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-3 gap-3">
          {row.map((key) => {
            if (key === 'delete') {
              return (
                <button
                  key={key}
                  onClick={onBackspace}
                  disabled={disabled || value.length === 0}
                  className="h-16 rounded-2xl font-black text-sm flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-1 active:shadow-none"
                  style={{
                    background: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
                    color: '#fff',
                    boxShadow: '0 6px 0 #7f1d1d, 0 8px 12px rgba(0,0,0,0.35)',
                    border: '1px solid #7f1d1d',
                  }}
                  title="Delete last digit"
                >
                  <Delete className="w-6 h-6" />
                </button>
              );
            }
            if (key === 'next') {
              return (
                <button
                  key={key}
                  onClick={onSubmit}
                  disabled={disabled || !value.trim()}
                  className="h-16 rounded-2xl font-black text-sm flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-1 active:shadow-none"
                  style={{
                    background: 'linear-gradient(180deg, #22c55e 0%, #15803d 100%)',
                    color: '#fff',
                    boxShadow: '0 6px 0 #14532d, 0 8px 12px rgba(0,0,0,0.35)',
                    border: '1px solid #14532d',
                  }}
                  title="Done"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              );
            }
            return (
              <button
                key={key}
                onClick={() => onInput(key)}
                disabled={disabled}
                className="h-16 rounded-2xl font-black text-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-1 active:shadow-none"
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #dbeafe 100%)',
                  color: '#1e3a8a',
                  boxShadow: '0 6px 0 #1e40af, 0 8px 12px rgba(0,0,0,0.3)',
                  border: '1px solid #1e40af',
                }}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}