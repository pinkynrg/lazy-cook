/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.giallozafferano.it',
      },
      {
        protocol: 'https',
        hostname: '**.staticflickr.com',
      },
    ],
  },
  output: 'standalone',
}

module.exports = nextConfig
