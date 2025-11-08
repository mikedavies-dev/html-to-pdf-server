import z from 'zod';

// Custom validation functions
function urlCustom(value: string) {
  try {
    new URL(value);
    return value;
  } catch (e) {
    throw new Error('Invalid URL');
  }
}

function htmlCustom(value: string) {
  if (!value || typeof value !== 'string') {
    throw new Error('HTML content is required');
  }
  return value;
}

// Request schema definition
export const PdfRequestSchema = z
  .object({
    url: z.string().refine(urlCustom).optional(),
    html: z.string().refine(htmlCustom).optional(),
    export: z
      .object({
        scale: z.number().min(0.1).max(2).default(1),
        type: z.enum(['jpeg', 'png', 'webp']).default('png'),
        quality: z.number().min(0).max(100).default(100),
        fullPage: z.boolean().default(true),
        clip: z
          .object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
          })
          .optional(),
        omitBackground: z.boolean().default(false),
        encoding: z.enum(['base64', 'binary']).default('binary'),
        margin: z.object({
          top: z.string(),
          right: z.string(),
          bottom: z.string(),
          left: z.string(),
        }),
        printBackground: z.boolean().default(false),
        viewport: z
          .object({
            width: z.number().positive().default(1280),
            height: z.number().positive().default(720),
          })
          .optional(),
      })
      .default({
        scale: 1,
        type: 'png',
        quality: 100,
        fullPage: true,
        omitBackground: false,
        encoding: 'binary',
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
        printBackground: false,
      }),
  })
  .refine(data => data.url || data.html, {
    message: 'Either url or html must be provided',
  });

export type PdfRequest = z.infer<typeof PdfRequestSchema>;

// Image request schema (excludes PDF-specific options)
export const ImageRequestSchema = z
  .object({
    url: z.string().refine(urlCustom).optional(),
    html: z.string().refine(htmlCustom).optional(),
    export: z
      .object({
        scale: z.number().min(0.1).max(2).default(1),
        type: z.enum(['jpeg', 'png', 'webp']).default('png'),
        quality: z.number().min(0).max(100).default(100),
        fullPage: z.boolean().default(true),
        clip: z
          .object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
          })
          .optional(),
        omitBackground: z.boolean().default(false),
        encoding: z.enum(['base64', 'binary']).default('binary'),
        maxFileSize: z.number().positive().default(4 * 1024 * 1024),
        viewport: z
          .object({
            width: z.number().positive().default(1280),
            height: z.number().positive().default(720),
          })
          .optional(),
      })
      .default({
        scale: 1,
        type: 'png',
        quality: 100,
        fullPage: true,
        omitBackground: false,
        encoding: 'binary',
        maxFileSize: 4 * 1024 * 1024,
      }),
  })
  .refine(data => data.url || data.html, {
    message: 'Either url or html must be provided',
  });

export type ImageRequest = z.infer<typeof ImageRequestSchema>;
