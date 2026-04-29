import React, { useState, useRef } from 'react';
import { Keyboard } from 'lucide-react';
import NumericKeypad from '@/components/sorting/NumericKeypad';

export default function NumericInput({ value, onChange, placeholder, className, label }) {
  const [showKeypad, setShowKeypad] = useState(false);
  const [showQwerty, setShowQwerty] = useState(false);
  const inputRef = useRef(null);

  const handleKeypadInput = (digit) => {
    onChange({ target: { value: value + digit } });
  };

  const handleBackspace = () => {
    onChange({ target: { value: value.slice(0, -1) } });
  };

  const handleKeypadSubmit = () => {
    setShowKeypad(false);
    if (inputRef.current) inputRef.current.blur();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="number"
        inputMode="none"
        pattern="[0-9]*"
        value={value}
        onChange={onChange}
        onFocus={() => setShowKeypad(true)}
        placeholder={placeholder}
        className={`h-14 text-base mt-1 cursor-pointer ${className}`}
        readOnly
      />

      {/* Numeric Keypad Modal */}
      {showKeypad && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/40">
          <div className="w-full bg-white rounded-t-3xl shadow-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px)+60px)] space-y-3 max-h-[80vh] overflow-y-auto">
            {/* Input display */}
            <div className="text-center bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500 font-semibold mb-1">Tag Number</p>
              <p className="font-heading font-black text-3xl text-gray-800">{value || '—'}</p>
            </div>

            {/* Keypad */}
            {!showQwerty && (
              <>
                <NumericKeypad
                  value={value}
                  onInput={handleKeypadInput}
                  onBackspace={handleBackspace}
                  onSubmit={handleKeypadSubmit}
                  disabled={false}
                />

                {/* Toggle to QWERTY */}
                <button
                  type="button"
                  onClick={() => setShowQwerty(true)}
                  className="w-full h-10 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Keyboard className="w-4 h-4" /> Use Keyboard
                </button>
              </>
            )}

            {/* QWERTY fallback */}
            {showQwerty && (
              <>
                <input
                  type="text"
                  value={value}
                  onChange={onChange}
                  placeholder={placeholder}
                  autoFocus
                  className="w-full h-12 px-3 text-base border-2 border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowQwerty(false)}
                  className="w-full h-10 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Back to Numeric
                </button>
              </>
            )}


          </div>
        </div>
      )}
    </div>
  );
}