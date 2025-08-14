/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Headers condicionais baseados no ambiente
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    
    const corsHeaders = [
      {
        key: 'Access-Control-Allow-Origin',
        value: 'http://localhost:3000'
      },
      {
        key: 'Access-Control-Allow-Methods',
        value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      },
      {
        key: 'Access-Control-Allow-Headers',
        value: 'Content-Type, Authorization, Cookie'
      },
      {
        key: 'Access-Control-Allow-Credentials',
        value: 'true'
      }
    ];
    
    const headers = [
      // CORS for all API routes
      {
        source: '/api/:path*',
        headers: corsHeaders
      }
    ];
    
    if (isDev) {
      // Em desenvolvimento, adicionar configurações específicas do Swagger
      headers.push(
        {
          source: '/api-docs',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-cache, no-store, must-revalidate'
            }
          ]
        },
        {
          source: '/api/swagger.json',
          headers: [
            {
              key: 'Access-Control-Allow-Origin',
              value: '*'
            },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET'
            },
            {
              key: 'Access-Control-Allow-Headers',
              value: 'Content-Type'
            }
          ]
        }
      );
    }
    
    return headers;
  },

  // Configurações de webpack apenas para desenvolvimento
  webpack: (config, { isServer, dev }) => {
    if (!isServer && dev) {
      // Apenas em desenvolvimento, configurar fallbacks para Swagger
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  }
};

module.exports = nextConfig;