/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  experimental: {
    outputFileTracingExcludes: {
      '*': ['node_modules/**/*'],
    },
  },
}

module.exports = nextConfig
