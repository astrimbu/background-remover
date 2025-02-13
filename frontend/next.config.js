/** @type {import('next').NextConfig} */
const nextConfig = {
  // During development, proxy API requests to Flask
  async rewrites() {
    return [
      {
        source: '/base-images',
        destination: 'http://localhost:5000/base-images',
      },
      {
        source: '/base-img/:path*',
        destination: 'http://localhost:5000/base-img/:path*',
      },
      {
        source: '/comfyui-process',
        destination: 'http://localhost:5000/comfyui-process',
      },
      {
        source: '/comfyui-generate',
        destination: 'http://localhost:5000/comfyui-generate',
      },
      {
        source: '/check-status/:path*',
        destination: 'http://localhost:5000/check-status/:path*',
      },
      {
        source: '/save-temp-image',
        destination: 'http://localhost:5000/save-temp-image',
      },
      {
        source: '/temp/:path*',
        destination: 'http://localhost:5000/temp/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
  // For production static export
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/base-img/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8188',
        pathname: '/view',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'production'
  },
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    },
    responseLimit: '10mb'
  }
}

module.exports = nextConfig