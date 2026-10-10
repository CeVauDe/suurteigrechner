/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  poweredByHeader: false,
  sassOptions: {
    quietDeps: true,
  },
  turbopack: {}
}

module.exports = nextConfig
