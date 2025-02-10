/** @type {import('next').NextConfig} */
const nextConfig = {
  // During development, proxy API requests to Flask
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5000/api/:path*'
      }
    ]
  },
  // For production static export
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  images: {
    unoptimized: process.env.NODE_ENV === 'production'
  }
}

module.exports = nextConfig