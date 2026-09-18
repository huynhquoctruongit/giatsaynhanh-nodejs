import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { bankService } from './modules/bank/bank.service';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[server] Listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

// Đối soát GPM Pay định kỳ (5 phút) để bù giao dịch webhook có thể miss.
// Chỉ chạy khi đã cấu hình API key.
let gpmpayTimer: NodeJS.Timeout | undefined;
if (env.gpmpay.apiKey) {
  const RECONCILE_MS = 5 * 60 * 1000;
  gpmpayTimer = setInterval(() => {
    bankService
      .syncFromApi()
      .then((r) => {
        if (r.upserted > 0) console.log(`[gpmpay] đối soát: nạp ${r.upserted}/${r.fetched} giao dịch`);
      })
      .catch((err) => console.error('[gpmpay] đối soát lỗi:', err?.message ?? err));
  }, RECONCILE_MS);
  gpmpayTimer.unref?.();
}

const shutdown = async (signal: string) => {
  console.log(`[server] Received ${signal}, shutting down...`);
  if (gpmpayTimer) clearInterval(gpmpayTimer);
  server.close(() => console.log('[server] HTTP server closed'));
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
