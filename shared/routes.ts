import { z } from 'zod';
import { registerIdentitySchema, verifyIdentityResponseSchema, verifyIdentitySchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  identities: {
    register: {
      method: 'POST' as const,
      path: '/api/identities/register' as const,
      input: registerIdentitySchema,
      responses: {
        // We return numeric DB id for internal use and a displayId string
        // which may have a 'magic' variation for minors while preserving length.
        201: z.object({ message: z.string(), id: z.number(), displayId: z.string(), minor: z.boolean().optional() }),
        400: errorSchemas.validation,
        403: errorSchemas.notFound,
        409: errorSchemas.validation,
      },
    },
  },
  verification: {
    verify: {
      method: 'POST' as const,
      path: '/api/verify' as const,
      input: verifyIdentitySchema,
      responses: {
        200: verifyIdentityResponseSchema,
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
