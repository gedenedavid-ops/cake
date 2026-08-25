'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react'; // toujours utilisé pour email/password
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Mail, Lock, User } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { UserType } from '@/types';

// ─── Icônes SVG inline (pas de dépendance externe) ───────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

type Mode = 'connexion' | 'inscription';

// Composant interne — isolé dans Suspense pour useSearchParams
function AuthForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get('callbackUrl') ?? '/journal';

  const [mode, setMode]           = useState<Mode>('connexion');
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [userType, setUserType]   = useState<UserType>('eleve');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [googleSoon, setGoogleSoon] = useState(false);

  // ── Connexion OAuth Google ───────────────────────────────────────────────────
  const handleGoogle = () => {
    setGoogleSoon(true);
    setTimeout(() => setGoogleSoon(false), 3000);
  };

  // ── Connexion / Inscription email + mot de passe ────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'inscription') {
        const res = await fetch('/api/auth/inscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, userType }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); setLoading(false); return; }
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError('Email ou mot de passe incorrect.');
        setLoading(false);
        return;
      }

      router.replace(callbackUrl);
    } catch {
      setError('Une erreur est survenue. Réessaie.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="mb-3">
            <Image src="/logo3d.svg" alt="BinlinPad" width={56} height={56} priority />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">BinlinPad</h1>
          <p className="text-xs text-[#9B9590] mt-1">Ton compagnon d'études personnel</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl border border-[#E8E4DF] p-6 shadow-sm"
        >
          {/* Mode toggle */}
          <div className="flex gap-1 bg-[#F5F3EF] rounded-xl p-1 mb-5">
            {(['connexion', 'inscription'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                  mode === m
                    ? 'bg-white text-[#1A1A1A] shadow-sm'
                    : 'text-[#9B9590] hover:text-[#1A1A1A]'
                )}
              >
                {m === 'connexion' ? 'Se connecter' : 'Créer un compte'}
              </button>
            ))}
          </div>

          {/* ── Bouton OAuth Google ── */}
          <div className="mb-5">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 bg-white border border-[#E8E4DF] rounded-xl text-sm font-medium text-[#1A1A1A] hover:bg-[#F5F3EF] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <GoogleIcon />
              Continuer avec Google
            </button>
            <AnimatePresence>
              {googleSoon && (
                <motion.p
                  key="google-soon"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-center text-[#F4A236] font-medium mt-2"
                >
                  Bientôt disponible ✨
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Séparateur */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#E8E4DF]" />
            <span className="text-[11px] text-[#C8C4BE] font-medium">ou</span>
            <div className="flex-1 h-px bg-[#E8E4DF]" />
          </div>

          {/* ── Formulaire email/mot de passe ── */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Nom + sélecteur profil — inscription seulement */}
            <AnimatePresence>
              {mode === 'inscription' && (
                <motion.div
                  key="inscription-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  {/* Prénom */}
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C8C4BE]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ton prénom"
                      required
                      maxLength={80}
                      className="w-full pl-10 pr-4 py-3 bg-[#F5F3EF] border border-transparent rounded-xl text-sm text-[#1A1A1A] placeholder-[#C8C4BE] focus:border-[#F4A236] focus:ring-2 focus:ring-[#F4A236]/20 transition-all focus:bg-white"
                    />
                  </div>

                  {/* Sélecteur élève / étudiant */}
                  <div>
                    <p className="text-xs font-medium text-[#9B9590] mb-2">Je suis…</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: 'eleve'    as UserType, label: '🎒 Élève',    sub: 'Collège · Lycée' },
                        { value: 'etudiant' as UserType, label: '🎓 Étudiant', sub: 'Université · Supérieur' },
                      ] as const).map(({ value, label, sub }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setUserType(value)}
                          className={cn(
                            'flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all',
                            userType === value
                              ? 'bg-[#FDF0DC] border-[#F4A236] text-[#1A1A1A]'
                              : 'bg-[#F5F3EF] border-transparent text-[#9B9590] hover:border-[#F4A236]/50'
                          )}
                        >
                          <span className="text-sm font-semibold">{label}</span>
                          <span className="text-[10px] mt-0.5">{sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C8C4BE]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 bg-[#F5F3EF] border border-transparent rounded-xl text-sm text-[#1A1A1A] placeholder-[#C8C4BE] focus:border-[#F4A236] focus:ring-2 focus:ring-[#F4A236]/20 transition-all focus:bg-white"
              />
            </div>

            {/* Mot de passe */}
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C8C4BE]" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                required
                minLength={mode === 'inscription' ? 8 : 1}
                autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
                className="w-full pl-10 pr-11 py-3 bg-[#F5F3EF] border border-transparent rounded-xl text-sm text-[#1A1A1A] placeholder-[#C8C4BE] focus:border-[#F4A236] focus:ring-2 focus:ring-[#F4A236]/20 transition-all focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9B9590] hover:text-[#1A1A1A] transition-colors"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Message d'erreur */}
            <AnimatePresence>
              {error && (
                <motion.p
                  key="error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-red-500 px-1"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#F4A236] text-white rounded-xl text-sm font-medium hover:bg-[#EAA240] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Chargement…</>
                : mode === 'connexion' ? 'Se connecter par email' : 'Créer mon compte'
              }
            </button>
          </form>

          {mode === 'inscription' && (
            <p className="text-[10px] text-[#C8C4BE] text-center mt-4 leading-relaxed">
              Tes notes sont sauvegardées de manière sécurisée et accessibles depuis n'importe quel appareil.
            </p>
          )}
        </motion.div>

        {/* Mentions légales minimales */}
        <p className="text-[10px] text-[#C8C4BE] text-center mt-4 px-4">
          En continuant, tu acceptes nos{' '}
          <a href="/legal" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#9B9590] transition-colors">Conditions d&apos;utilisation</a>
          {' '}et notre{' '}
          <a href="/legal#donnees" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#9B9590] transition-colors">Politique de confidentialité</a>.
        </p>
      </div>
    </div>
  );
}

// Page exportée — wrappe AuthForm dans Suspense (requis par useSearchParams)
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#F4A236]" />
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
