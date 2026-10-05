/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    '@academy/api',
    '@academy/shared',
    '@prisma/client',
    'prisma',
    'bcryptjs',
    'pdf-lib',
    'pino',
    'pino-pretty',
    'swagger-ui-express',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;
