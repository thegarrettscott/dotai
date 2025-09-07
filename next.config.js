/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./spatial-understanding/**/*'],
    },
  },
}

module.exports = nextConfig
