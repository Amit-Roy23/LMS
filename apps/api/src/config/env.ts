import dotenv from 'dotenv';
import path from 'path';

// Load from current working directory (.env, .env.local) and api folder
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../api/.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/academy_lms?schema=public',
  directUrl: process.env.DIRECT_URL,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'academy_access_token_secret_development_key_12345',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'academy_refresh_token_secret_development_key_67890',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  appUrl: process.env.APP_URL || 'http://localhost:5000',
  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
  },
  payment: {
    defaultProvider: process.env.PAYMENT_PROVIDER || 'MOCK',
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    },
  },
};
