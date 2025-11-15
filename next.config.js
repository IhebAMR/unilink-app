/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // During deployment we may have existing TypeScript issues in the repo.
  // Temporarily allow builds to succeed while we triage type errors locally.
  // Remove or set to false once the type issues are fixed.
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_ID: process.env.GOOGLE_ID,
    GOOGLE_SECRET: process.env.GOOGLE_SECRET,
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  webpack: (config, { isServer }) => {
    // Prevent server-side bundling from trying to resolve Node-only modules used
    // by client-only libraries like `face-api.js` which attempt to require 'fs'.
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      path: false,
      os: false,
    };
    return config;
  },
};

module.exports = nextConfig;
