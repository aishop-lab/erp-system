/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', '@supabase/supabase-js'],
  },
}

module.exports = nextConfig
