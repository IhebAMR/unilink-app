import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/app/lib/mongodb";

const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  allowDangerousEmailAccountLinking: true as const,
  adapter: MongoDBAdapter(clientPromise),
  callbacks: {
    async session({ session, user }: any) {
      // Add user ID to the session
      if (session.user) {
        (session.user as any).id = user.id;
      }
      return session;
    },
    async signIn({ account }: any) {
      // Allow all Google sign-ins
      if (account?.provider === "google") {
        return true;
      }
      return true;
    },
    async redirect({ url, baseUrl }: any) {
      // Always redirect to home page after sign in
      if (url.startsWith("/")) return url;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === "development",
};

const auth = NextAuth(authConfig);
export const { GET, POST } = auth.handlers;
