/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.telegram.org'],
  },
  env: {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  },
}
module.exports = nextConfig
