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
        source: '/fit-to-canvas',
        destination: 'http://localhost:5000/fit-to-canvas',
      },
      {
        source: '/remove-background',
        destination: 'http://localhost:5000/remove-background',
      },
      {
        source: '/resize-image',
        destination: 'http://localhost:5000/resize-image',
      },
      {
        source: '/models',
        destination: 'http://localhost:5000/models',
      },
      {
        source: '/switch-model',
        destination: 'http://localhost:5000/switch-model',
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
        source: '/checkpoints',
        destination: 'http://localhost:5000/checkpoints',
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
      }
    ].map(rewrite => ({
      ...rewrite,
      // Add custom config to each rewrite rule
      has: [
        {
          type: 'header',
          key: 'content-type',
          value: '(.*)'
        }
      ]
    }));
  },
  // Configure body size limit for API routes
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    },
    responseLimit: '50mb'
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
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
  webpack: (config, { dev, isServer }) => {
    // Disable source maps in development mode
    if (dev && !isServer) {
      config.devtool = 'eval';
    }
    
    // Increase the size limit for assets
    if (!isServer) {
      config.performance = {
        ...config.performance,
        maxAssetSize: 1024 * 1024 * 50,  // 50MB
        maxEntrypointSize: 1024 * 1024 * 50  // 50MB
      };
    }
    
    return config;
  }
}

module.exports = nextConfig