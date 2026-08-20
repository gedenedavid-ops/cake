// Extension du type Session de NextAuth v5
// pour inclure l'id MongoDB de l'utilisateur.

import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}
