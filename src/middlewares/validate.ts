import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { BadRequestError } from '../helpers/utils/errors';

export const validate =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      }) as { body?: unknown; query?: unknown; params?: unknown };

      if (parsed.body) req.body = parsed.body;
      if (parsed.query) Object.assign(req.query as object, parsed.query);
      if (parsed.params) Object.assign(req.params as object, parsed.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          new BadRequestError(
            'Validation failed',
            err.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          ),
        );
        return;
      }
      next(err);
    }
  };
