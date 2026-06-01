/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.telegram.org' },
    ],
  },
  // Keep large client-only packages out of the server bundle analysis.
  // pdfjs-dist and mermaid are dynamically imported in client components only.
  serverExternalPackages: ['pdfjs-dist', 'mermaid'],
};

module.exports = nextConfig;
