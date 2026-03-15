import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

// Server-side only: use API_SERVER_URL in Docker (e.g. http://backend:4000); browser uses NEXT_PUBLIC_API_URL.
const API_URL =
  process.env.API_SERVER_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        if (!email?.trim()) return null;
        try {
          const res = await fetch(`${API_URL}/api/auth/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim() }),
          });
          if (!res.ok) return null;
          const data = (await res.json()) as {
            token?: string;
            user?: { id: string; email?: string; name?: string | null; tenantId: string };
          };
          if (!data.token || !data.user) return null;
          return {
            id: data.user.id,
            email: data.user.email ?? email,
            name: data.user.name ?? null,
            tenantId: data.user.tenantId,
            accessToken: data.token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.tenantId = (user as { tenantId?: string }).tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session as { accessToken?: string }).accessToken = token.accessToken as string;
        (session as { tenantId?: string }).tenantId = token.tenantId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
});
