import { Router, type Request, type Response } from 'express';
import { authStaff, requireRole } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { asyncHandler } from '../../helpers/utils/async-handler';
import { UserRole } from '../../helpers/enums';
import { auditSummarySchema, listAuditSchema, markAuditSchema } from '../../helpers/validators/audit.schema';
import { auditService } from './audit.service';

const router = Router();
router.use(authStaff);

// Đơn đã quét hôm nay (mọi máy) — màn Rà soát gọi lại liên tục để đồng bộ
router.get(
  '/',
  validate(listAuditSchema),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await auditService.list(req.query.date as string | undefined) });
  }),
);

// Quét 1 bịch → ghi nhận đã rà soát hôm nay
router.post(
  '/',
  validate(markAuditSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await auditService.mark(req.body, req.user!.sub, {
      ip: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    });
    res.json({ success: true, data });
  }),
);

// "Bắt đầu lại" — xoá kết quả rà soát hôm nay của mọi máy
router.delete(
  '/today',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: await auditService.reset() });
  }),
);

// Chủ tiệm: lịch sử rà soát theo tháng
router.get(
  '/summary',
  requireRole(UserRole.ADMIN),
  validate(auditSummarySchema),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await auditService.summary(req.query.month as string) });
  }),
);

export { router as auditRouter };
