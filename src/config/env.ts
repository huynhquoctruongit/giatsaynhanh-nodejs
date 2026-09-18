import dotenv from 'dotenv';

dotenv.config();

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL', process.env.DATABASE_URL),
  jwt: {
    secret: required('JWT_SECRET', process.env.JWT_SECRET),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  publicWebUrl: process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // GPM Pay — nhận tiền chuyển khoản (webhook + REST đối soát).
  // KHÔNG bắt buộc: thiếu key/secret thì webhook trả 503, phần còn lại vẫn chạy.
  gpmpay: {
    apiKey: process.env.GPMPAY_API_KEY ?? '',
    webhookSecret: process.env.GPMPAY_WEBHOOK_SECRET ?? '',
    apiUrl: process.env.GPMPAY_API_URL ?? 'https://api.gpmpay.com/api/v1',
  },
} as const;

export const isProd = env.nodeEnv === 'production';
