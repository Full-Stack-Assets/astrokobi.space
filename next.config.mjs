/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pages remains the active production target until Human Authority selects
  // the server host. DEPLOY_RUNTIME=server builds a provider-neutral Node
  // runtime without changing the current production deployment implicitly.
  output: process.env.DEPLOY_RUNTIME === 'server' ? 'standalone' : 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
};

export default nextConfig;
