// Next-Auth v5 — le handlers object expose GET et POST
import { handlers } from '@/lib/auth';

// Force Node.js runtime — le runtime Edge de Vercel ne supporte pas
// toutes les APIs Node requises par NextAuth v5 beta (crypto, etc.)
export const runtime = 'nodejs';

export const { GET, POST } = handlers;
