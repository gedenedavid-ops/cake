'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Delete } from 'lucide-react';
import { useStore } from '@/store';

async function sha256(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function PinLockModal() {
  const { pinModalNoteId, closePinModal, unlockNote, openEditor } = useStore();
  const pinHash = useStore((s) => s.prefs.pinHash);
  const [digits, setDigits] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');

  const handleDigit = useCallback(async (d: string) => {
    if (digits.length >= 4) return;
    const next = [...digits, d];
    setDigits(next);
    setError('');

    if (next.length === 4) {
      const entered = next.join('');
      const enteredHash = await sha256(entered);
      if (enteredHash === pinHash) {
        if (pinModalNoteId) {
          unlockNote(pinModalNoteId);
          openEditor(pinModalNoteId);
        }
        setDigits([]);
        closePinModal();
      } else {
        setShake(true);
        setError('PIN incorrect. Réessaie.');
        setTimeout(() => { setDigits([]); setShake(false); }, 600);
      }
    }
  }, [digits, pinHash, pinModalNoteId, unlockNote, openEditor, closePinModal]);

  const handleDelete = () => {
    setDigits((prev) => prev.slice(0, -1));
    setError('');
  };

  const isOpen = !!pinModalNoteId;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#1A1A1A]/90 backdrop-blur-sm"
            onClick={closePinModal}
          />

          {/* PIN Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={shake ? { x: [-6, 6, -6, 6, 0] } : { opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="relative w-[300px] bg-[#1A1A1A] rounded-3xl p-6 flex flex-col items-center gap-6 border border-white/10"
          >
            {/* Lock icon */}
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Lock size={22} className="text-[#F4A236]" />
            </div>

            <div className="text-center">
              <h3 className="text-white font-semibold text-lg">Déverrouiller</h3>
              <p className="text-white/40 text-xs mt-1">Entre ton code PIN</p>
            </div>

            {/* Dots */}
            <div className="flex gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 transition-all duration-150 ${
                    i < digits.length
                      ? 'bg-[#F4A236] border-[#F4A236]'
                      : 'bg-transparent border-white/30'
                  }`}
                />
              ))}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-red-400 text-xs -mt-3"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {['1','2','3','4','5','6','7','8','9'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleDigit(d)}
                  className="h-14 rounded-2xl bg-white/10 text-white text-xl font-light hover:bg-white/20 active:scale-95 transition-all"
                >
                  {d}
                </button>
              ))}
              <div /> {/* empty cell */}
              <button
                onClick={() => handleDigit('0')}
                className="h-14 rounded-2xl bg-white/10 text-white text-xl font-light hover:bg-white/20 active:scale-95 transition-all"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                className="h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
              >
                <Delete size={18} />
              </button>
            </div>

            <p className="text-white/20 text-[10px]">Change your PIN in Settings → Privacy</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
