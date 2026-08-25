import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';

export const { handlers, signIn, signOut, auth } = NextAuth({
  // NextAuth v5 utilise AUTH_SECRET / AUTH_URL
  // On supporte aussi NEXTAUTH_SECRET / NEXTAUTH_URL pour compatibilité
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  session: { strategy: 'jwt' },

  pages: {
    signIn: '/auth/connexion',
    error:  '/auth/connexion',
  },

  providers: [
    // ── Google OAuth ──────────────────────────────────────────────────────────
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── Email + mot de passe ──────────────────────────────────────────────────
    Credentials({
      name: 'Identifiants',
      credentials: {
        email:    { label: 'Email',        type: 'email'    },
        password: { label: 'Mot de passe', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();

        const user = await User.findOne({
          email: (credentials.email as string).toLowerCase().trim(),
        }).lean();

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id:    user._id.toString(),
          name:  user.name,
          email: user.email,
          image: user.image ?? null,
        };
      },
    }),
  ],

  callbacks: {
    // Crée ou retrouve le compte MongoDB lors d'une connexion Google
    async signIn({ user, account }) {
      // Credentials gère lui-même l'accès à MongoDB via authorize()
      if (account?.provider === 'credentials') return true;

      // Pour Google : upsert l'utilisateur dans MongoDB
      try {
        await connectDB();
        const existing = await User.findOne({ email: user.email! }).lean();

        if (!existing) {
          await User.create({
            name:         user.name ?? user.email!.split('@')[0],
            email:        user.email!.toLowerCase(),
            passwordHash: '', // pas de mot de passe pour les comptes OAuth
            image:        user.image ?? undefined,
          });
        } else if (!existing.image && user.image) {
          // Met à jour l'avatar si manquant
          await User.updateOne({ email: user.email! }, { image: user.image });
        }

        return true;
      } catch (err) {
        console.error('signIn callback error:', err);
        return false;
      }
    },

    // Injecte l'id MongoDB dans le JWT
    async jwt({ token, user, account }) {
      // Connexion initiale — on stocke l'id
      if (user?.id) {
        token.id = user.id;
      }

      // Pour OAuth : l'id vient de MongoDB, pas du provider
      if (account?.provider && account.provider !== 'credentials' && token.email) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: token.email }).lean();
          if (dbUser) token.id = dbUser._id.toString();
        } catch { /* silencieux */ }
      }

      return token;
    },

    // Expose user.id dans la session côté client
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      return session;
    },
  },
});
