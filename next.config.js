/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'api.mapbox.com' },
    ],
  },
  experimental: { serverActions: { allowedOrigins: ['localhost:3000', 'waselni.tn'] } },
}

module.exports = nextConfig
