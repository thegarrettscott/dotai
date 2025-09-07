/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  async redirects() {
    return [
      {
        source: '/((?!browser|api|_next).*)',
        destination: '/browser',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
