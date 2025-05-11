/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    DATABASE_ID: process.env.DATABASE_ID,
    WORKFLOW_EXECUTION_COLLECTION_ID: process.env.WORKFLOW_EXECUTION_COLLECTION_ID,
    API_KEYS_COLLECTION_ID: process.env.API_KEYS_COLLECTION_ID,
    MAIN_WORKFLOW_ID: process.env.MAIN_WORKFLOW_ID,
    DEFAULT_AI_MODEL: process.env.DEFAULT_AI_MODEL,
    MAX_TOKENS: process.env.MAX_TOKENS,
    DEFAULT_TEMPERATURE: process.env.DEFAULT_TEMPERATURE,
  },
}

module.exports = nextConfig;
