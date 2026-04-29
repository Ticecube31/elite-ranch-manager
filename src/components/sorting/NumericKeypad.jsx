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
                  className="h-14 rounded-xl font-bold border-2 border-blue-300 text-blue-600 bg-white hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center"
                  title="Delete last digit"
                >
                  <Delete className="w-5 h-5" />
                </button>
              );
            }
            if (key === 'next') {
              return (
                <button
                  key={key}
                  onClick={onSubmit}
                  disabled={disabled || !value.trim()}
                  className="h-14 rounded-xl font-bold border-2 border-green-400 text-green-600 bg-white hover:bg-green-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center"
                  title="Done"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              );
            }
            return (
              <button
                key={key}
                onClick={() => onInput(key)}
                disabled={disabled}
                className="h-14 rounded-xl font-bold border-2 border-blue-300 text-lg text-blue-600 bg-white hover:bg-blue-50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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