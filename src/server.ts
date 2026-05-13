import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[server] Listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

const shutdown = async (signal: string) => {
  console.log(`[server] Received ${signal}, shutting down...`);
  server.close(() => console.log('[server] HTTP server closed'));
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
