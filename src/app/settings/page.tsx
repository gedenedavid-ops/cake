'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Shield, Palette, Database,
  Download, Trash2, Check, User, Sparkles,
  Lock, LayoutGrid, List, Columns2,
  Info, Delete, LogOut,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { Shell } from '@/components/layout/Shell';
import { useStore } from '@/store';
import type { NoteLayout, AccentColor } from '@/store';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E8E4DF]">
        <div className="w-8 h-8 rounded-xl bg-[#F5F3EF] flex items-center justify-center">
          <Icon size={15} className="text-[#9B9590]" />
        </div>
        <h3 className="text-sm font-semibold text-[#1A1A1A]">{title}</h3>
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </motion.div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative flex-shrink-0 w-10 h-[22px] rounded-full transition-colors duration-200',
        enabled ? 'bg-[#F4A236]' : 'bg-[#E8E4DF]'
      )}
    >
      <span className={cn(
        'absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200',
        enabled ? 'translate-x-[19px]' : 'translate-x-[3px]'
      )} />
    </button>
  );
}

// ─── PIN change panel ─────────────────────────────────────────────────────────

function PinChangePanel() {
  const { updatePrefs, addToast } = useStore();
  const [step, setStep] = useState<'idle' | 'current' | 'new' | 'confirm'>('idle');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [shake, setShake] = useState(false);

  const CURRENT_HASH = useStore((s) => s.prefs.pinHash);

  async function sha256(pin: string) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const handleDigit = async (d: string) => {
    if (step === 'current') {
      const val = current + d;
      setCurrent(val);
      if (val.length === 4) {
        const hash = await sha256(val);
        if (hash !== CURRENT_HASH) {
          setShake(true); setCurrent('');
          setTimeout(() => setShake(false), 500);
          addToast({ type: 'error', message: 'PIN actuel incorrect' });
        } else {
          setStep('new');
        }
      }
    } else if (step === 'new') {
      const val = next + d;
      setNext(val);
      if (val.length === 4) setStep('confirm');
    } else if (step === 'confirm') {
      const val = confirm + d;
      setConfirm(val);
      if (val.length === 4) {
        if (val !== next) {
          setShake(true); setConfirm('');
          setTimeout(() => setShake(false), 500);
          addToast({ type: 'error', message: 'Les PIN ne correspondent pas' });
          setStep('new'); setNext('');
        } else {
          const hash = await sha256(val);
          updatePrefs({ pinHash: hash });
          addToast({ type: 'success', message: 'PIN mis à jour ✓' });
          setStep('idle'); setCurrent(''); setNext(''); setConfirm('');
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === 'current') setCurrent((v) => v.slice(0, -1));
    if (step === 'new')     setNext((v) => v.slice(0, -1));
    if (step === 'confirm') setConfirm((v) => v.slice(0, -1));
  };

  const activeValue = step === 'current' ? current : step === 'new' ? next : confirm;

  const stepLabel: Record<typeof step, string> = {
    idle: '', current: 'Saisir le PIN actuel', new: 'Choisir un nouveau PIN', confirm: 'Confirmer le nouveau PIN',
  };

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('current')}
        className="flex items-center gap-2 text-xs font-medium text-[#F4A236] hover:underline"
      >
        <Lock size={13} /> Modifier le PIN
      </button>
    );
  }

  return (
    <motion.div
      animate={shake ? { x: [-4, 4, -4, 4, 0] } : {}}
      className="space-y-3"
    >
      <p className="text-xs font-medium text-[#1A1A1A]">{stepLabel[step]}</p>
      {/* Dots */}
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(
            'w-3 h-3 rounded-full border-2 transition-all',
            i < activeValue.length ? 'bg-[#F4A236] border-[#F4A236]' : 'bg-transparent border-[#C8C4BE]'
          )} />
        ))}
      </div>
      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 max-w-[200px]">
        {['1','2','3','4','5','6','7','8','9'].map((d) => (
          <button key={d} onClick={() => handleDigit(d)}
            className="h-11 rounded-xl bg-[#F5F3EF] text-[#1A1A1A] text-base font-medium hover:bg-[#EDE9E3] active:scale-95 transition-all"
          >{d}</button>
        ))}
        <div />
        <button onClick={() => handleDigit('0')}
          className="h-11 rounded-xl bg-[#F5F3EF] text-[#1A1A1A] text-base font-medium hover:bg-[#EDE9E3] active:scale-95 transition-all"
        >0</button>
        <button onClick={handleDelete}
          className="h-11 rounded-xl bg-[#F5F3EF] text-[#9B9590] flex items-center justify-center hover:bg-[#EDE9E3] active:scale-95 transition-all"
        ><Delete size={16} /></button>
      </div>
      <button onClick={() => { setStep('idle'); setCurrent(''); setNext(''); setConfirm(''); }}
        className="text-xs text-[#9B9590] hover:text-[#1A1A1A] transition-colors">
        Annuler
      </button>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Section = 'profile' | 'appearance' | 'privacy' | 'data';

const NAV: { key: Section; label: string; icon: React.ElementType }[] = [
  { key: 'profile',    label: 'Profil',      icon: User     },
  { key: 'appearance', label: 'Apparence',   icon: Palette  },
  { key: 'privacy',    label: 'Confidential.', icon: Shield },
  { key: 'data',       label: 'Données',     icon: Database },
];

const ACCENT_COLORS: { value: AccentColor; label: string }[] = [
  { value: '#F4A236', label: 'Ocre'    },
  { value: '#3B82F6', label: 'Bleu'    },
  { value: '#10B981', label: 'Vert'    },
  { value: '#8B5CF6', label: 'Violet'  },
  { value: '#EC4899', label: 'Rose'    },
];

const LAYOUTS: { value: NoteLayout; label: string; icon: React.ElementType }[] = [
  { value: 'masonry', label: 'Mosaïque', icon: Columns2   },
  { value: 'grid',    label: 'Grille',   icon: LayoutGrid },
  { value: 'list',    label: 'Liste',    icon: List       },
];

export default function SettingsPage() {
  const { notes, addToast, prefs, updatePrefs } = useStore();
  const { data: session } = useSession();
  const [section, setSection] = useState<Section>('profile');
  const [displayNameDraft, setDisplayNameDraft] = useState(prefs.displayName);
  const [nameSaved, setNameSaved] = useState(false);

  const saveName = () => {
    updatePrefs({ displayName: displayNameDraft.trim() });
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cake-notes-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: `${notes.length} note${notes.length > 1 ? 's' : ''} exportée${notes.length > 1 ? 's' : ''}` });
  };

  const handleClearAll = () => {
    if (!confirm('Supprimer toutes les notes ? Cette action est irréversible.')) return;
    useStore.setState({ notes: [] });
    localStorage.removeItem('cake_notes');
    addToast({ type: 'info', message: 'Toutes les notes supprimées' });
  };

  const totalWords = notes.reduce((acc, n) => acc + n.wordCount, 0);
  const subjects = new Set(notes.map((n) => n.subject)).size;
  const locked   = notes.filter((n) => n.isLocked).length;
  const pinned   = notes.filter((n) => n.isPinned).length;

  return (
    <Shell>
      <div className="max-w-2xl mx-auto px-5 md:px-8 py-6 pb-28 md:pb-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <Settings size={22} className="text-[#F4A236]" />
            Paramètres
            </h1>
            <p className="text-xs text-[#9B9590] mt-0.5">Personnalise ton expérience Cake</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-[#F5F3EF] rounded-2xl p-1 mb-6">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={cn(
                'flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-xs font-medium transition-all',
                section === key
                  ? 'bg-white text-[#1A1A1A] shadow-sm'
                  : 'text-[#9B9590] hover:text-[#1A1A1A]'
              )}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Profile ── */}
        <AnimatePresence mode="wait">
          {section === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
              <SectionCard title="Mon profil" icon={User}>
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  {session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt={displayNameDraft || 'Avatar'}
                      className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-[#F4A236] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                      {(displayNameDraft.trim()[0] ?? session?.user?.name?.[0] ?? '?').toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#9B9590] mb-1.5">Nom affiché</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={displayNameDraft}
                        onChange={(e) => { setDisplayNameDraft(e.target.value); setNameSaved(false); }}
                        onKeyDown={(e) => e.key === 'Enter' && saveName()}
                        placeholder="Ton prénom…"
                        maxLength={40}
                        className="flex-1 px-3 py-2 bg-[#F5F3EF] border border-[#E8E4DF] rounded-xl text-sm text-[#1A1A1A] placeholder-[#C8C4BE] focus:border-[#F4A236] focus:ring-1 focus:ring-[#F4A236]/20 transition-all"
                      />
                      <Button variant="secondary" size="sm" onClick={saveName}>
                        {nameSaved ? <Check size={13} className="text-green-500" /> : 'Sauvegarder'}
                      </Button>
                    </div>
                  </div>
                </div>
                {session?.user?.email && (
                  <div className="flex items-center gap-3 p-3 bg-[#F5F3EF] rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[#9B9590]">Compte connecté</p>
                      <p className="text-xs font-medium text-[#1A1A1A] truncate">{session.user.email}</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => signOut({ callbackUrl: '/auth/connexion' })}
                    >
                      <LogOut size={12} /> Déconnexion
                    </Button>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Tuteur IA" icon={Sparkles}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Activer les fonctions IA</p>
                    <p className="text-xs text-[#9B9590] mt-0.5">
                      Quand activé, le contenu de tes notes est envoyé à l'IA pour répondre à tes questions.
                      Désactive pour une utilisation 100 % hors ligne.
                    </p>
                  </div>
                  <Toggle
                    enabled={prefs.aiEnabled}
                    onChange={(v) => updatePrefs({ aiEnabled: v })}
                  />
                </div>
                <div className="flex gap-2 p-3 bg-[#F5F3EF] rounded-xl">
                  <Info size={13} className="text-[#9B9590] flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#9B9590] leading-relaxed">
                    Tes notes restent sur cet appareil. L'IA ne reçoit que les extraits pertinents pour répondre à ta question — jamais l'intégralité de tes notes.
                  </p>
                </div>
              </SectionCard>
            </motion.div>
          )}

          {/* ── Appearance ── */}
          {section === 'appearance' && (
            <motion.div key="appearance" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
              <SectionCard title="Couleur d'accentuation" icon={Palette}>
                <div className="flex gap-3 flex-wrap">
                  {ACCENT_COLORS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => updatePrefs({ accentColor: value })}
                      title={label}
                      className={cn(
                        'w-9 h-9 rounded-xl border-2 transition-all hover:scale-110 active:scale-95',
                        prefs.accentColor === value ? 'border-[#1A1A1A] scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: value }}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-[#9B9590]">
                  Sélectionné : <span className="font-medium text-[#1A1A1A]">{ACCENT_COLORS.find((c) => c.value === prefs.accentColor)?.label}</span>
                </p>
              </SectionCard>

              <SectionCard title="Disposition des notes" icon={LayoutGrid}>
                <div className="flex gap-2">
                  {LAYOUTS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => updatePrefs({ noteLayout: value })}
                      className={cn(
                        'flex flex-col items-center gap-1.5 flex-1 py-3 rounded-xl border text-xs font-medium transition-all',
                        prefs.noteLayout === value
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                          : 'bg-white text-[#9B9590] border-[#E8E4DF] hover:border-[#1A1A1A] hover:text-[#1A1A1A]'
                      )}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </SectionCard>
            </motion.div>
          )}

          {/* ── Privacy ── */}
          {section === 'privacy' && (
            <motion.div key="privacy" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
              <SectionCard title="Verrouillage PIN" icon={Lock}>
                <p className="text-xs text-[#9B9590]">
                  Définis un code PIN à 4 chiffres pour protéger tes notes sensibles. Ton PIN est haché localement et jamais stocké en clair.
                </p>
                <PinChangePanel />
              </SectionCard>

              <SectionCard title="Données & Confidentialité" icon={Shield}>
                <div className="space-y-4">
                  {[
                    {
                      label: 'Stockage local uniquement',
                      description: 'Toutes tes notes restent sur cet appareil. Rien n\'est envoyé à un serveur externe.',
                      enabled: true,
                      locked: true,
                    },
                    {
                      label: 'L\'IA n\'utilise que des extraits',
                      description: 'L\'IA reçoit uniquement les extraits de notes les plus pertinents — jamais l\'intégralité de ton carnet.',
                      enabled: prefs.aiEnabled,
                      locked: true,
                    },
                  ].map(({ label, description, enabled, locked: isLocked }) => (
                    <div key={label} className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1A1A1A]">{label}</p>
                        <p className="text-xs text-[#9B9590] mt-0.5 leading-relaxed">{description}</p>
                      </div>
                      {isLocked ? (
                        <span className={cn(
                          'flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium mt-1',
                          enabled ? 'bg-green-50 text-green-600' : 'bg-[#F5F3EF] text-[#9B9590]'
                        )}>
                          {enabled ? '✓ Actif' : 'Inactif'}
                        </span>
                      ) : (
                        <Toggle enabled={enabled} onChange={() => {}} />
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            </motion.div>
          )}

          {/* ── Data ── */}
          {section === 'data' && (
            <motion.div key="data" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">

              {/* Stats */}
              <SectionCard title="Mes notes" icon={Database}>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Notes totales',  value: notes.length },
                    { label: 'Mots écrits',    value: totalWords > 999 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords },
                    { label: 'Matières',       value: subjects },
                    { label: 'Notes verrouill.', value: locked },
                    { label: 'Notes épinglées', value: pinned },
                    { label: 'Stockage',       value: 'Sur l\'appareil' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#F5F3EF] rounded-xl p-3">
                      <p className="text-lg font-bold text-[#1A1A1A]">{value}</p>
                      <p className="text-[11px] text-[#9B9590]">{label}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Export */}
              <SectionCard title="Exporter" icon={Download}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Exporter toutes les notes</p>
                    <p className="text-xs text-[#9B9590] mt-0.5">
                      Télécharge un fichier JSON de toutes tes notes comme sauvegarde.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleExport}>
                    <Download size={13} /> Exporter
                  </Button>
                </div>
              </SectionCard>

              <SectionCard title="Zone de danger" icon={Trash2}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-red-500">Supprimer toutes les notes</p>
                    <p className="text-xs text-[#9B9590] mt-0.5">
                      Supprime définitivement toutes les notes de cet appareil. Irréversible.
                    </p>
                  </div>
                  <Button variant="danger" size="sm" onClick={handleClearAll}>
                    <Trash2 size={13} /> Tout supprimer
                  </Button>
                </div>
              </SectionCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
