import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Next's priority slash redirects run before headers. Let the existing
  // guarded routes handle slash variants so their responses stay no-store.
  skipTrailingSlashRedirect: true,
  async headers() {
    return [{source: '/:path*', headers: [
      {key: 'Cache-Control', value: 'no-store'},
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      {key: 'X-Frame-Options', value: 'DENY'},
      {key: 'Referrer-Policy', value: 'no-referrer'},
      {key: 'Content-Security-Policy', value: "frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'"},
    ]}];
  },
};

export default nextConfig;
