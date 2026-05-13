import { prisma } from '../../config/prisma';
import { ScanAction } from '../../helpers/enums';

interface LogInput {
  orderId: string;
  userId?: string;
  action: ScanAction | keyof typeof ScanAction;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}

const parseMeta = (raw: string | null): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const scanHistoryService = {
  async log(input: LogInput) {
    return prisma.scanHistory.create({
      data: {
        orderId: input.orderId,
        userId: input.userId ?? null,
        action: input.action as ScanAction,
        ip: input.ip,
        userAgent: input.userAgent,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  },

  async listByOrder(orderId: string) {
    const items = await prisma.scanHistory.findMany({
      where: { orderId },
      orderBy: { scannedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    return items.map((i) => ({ ...i, meta: parseMeta(i.meta) }));
  },
};
