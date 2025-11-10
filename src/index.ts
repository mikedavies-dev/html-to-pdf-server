import {Hono} from 'hono';
import {serve} from '@hono/node-server';
import {zValidator} from '@hono/zod-validator';
import sharp from 'sharp';

import {launchBrowser, getBrowser} from './browser';
import {
  PdfRequestSchema,
  PdfRequest,
  ImageRequestSchema,
  ImageRequest,
} from './schema';
import {log} from './utils/log';

const app = new Hono();

app.use('*', async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  log('request', {method, path, code: c.res.status, duration: `${duration}ms`});
});

app.get('/health', c => {
  return c.json({status: 'ok'}, 200);
});

app.use('*', async (c, next) => {
  const apiKey = process.env.API_KEY;

  // Skip API key check if no API key is configured
  if (!apiKey) {
    return next();
  }

  const providedKey = c.req.header('X-API-Key');

  if (!providedKey) {
    return c.json({error: 'API key is required'}, 401);
  }

  if (providedKey !== apiKey) {
    return c.json({error: 'Invalid API key'}, 401);
  }

  return next();
});

async function generatePdf(body: PdfRequest): Promise<Uint8Array> {
  const browser = getBrowser();
  const page = await browser.newPage();

  if (body.export.viewport) {
    await page.setViewport(body.export.viewport);
  }

  if (body.url) {
    await page.goto(body.url, {waitUntil: 'load'});
  } else if (body.html) {
    await page.setContent(body.html, {waitUntil: 'load'});
  } else {
    throw new Error('url or html is required');
  }

  const res = await page.pdf(body.export);

  page.close();

  return res;
}

async function compressImage(
  imageBuffer: Uint8Array,
  targetFormat: 'jpeg' | 'png' | 'webp',
  maxFileSize: number,
  quality?: number,
): Promise<Uint8Array> {
  let sharpInstance = sharp(imageBuffer);
  let currentQuality = quality || 100;

  // Try compression with progressively lower quality
  while (currentQuality >= 10) {
    let result: Buffer;

    if (targetFormat === 'jpeg') {
      result = await sharpInstance.jpeg({quality: currentQuality}).toBuffer();
    } else if (targetFormat === 'png') {
      result = await sharpInstance.png({quality: currentQuality}).toBuffer();
    } else {
      result = await sharpInstance.webp({quality: currentQuality}).toBuffer();
    }

    if (result.length <= maxFileSize) {
      return new Uint8Array(result);
    }

    currentQuality -= 10;
  }

  // If still too large, try resizing
  const metadata = await sharp(imageBuffer).metadata();
  if (metadata.width && metadata.height) {
    let scale = 0.9;

    while (scale >= 0.3) {
      const newWidth = Math.floor(metadata.width * scale);
      const newHeight = Math.floor(metadata.height * scale);

      let result: Buffer;
      if (targetFormat === 'jpeg') {
        result = await sharp(imageBuffer)
          .resize(newWidth, newHeight)
          .jpeg({quality: 70})
          .toBuffer();
      } else if (targetFormat === 'png') {
        result = await sharp(imageBuffer)
          .resize(newWidth, newHeight)
          .png({quality: 70})
          .toBuffer();
      } else {
        result = await sharp(imageBuffer)
          .resize(newWidth, newHeight)
          .webp({quality: 70})
          .toBuffer();
      }

      if (result.length <= maxFileSize) {
        return new Uint8Array(result);
      }

      scale -= 0.1;
    }
  }

  // Return original if we can't compress enough
  return imageBuffer;
}

async function generateImage(body: ImageRequest): Promise<Uint8Array> {
  const browser = getBrowser();
  const page = await browser.newPage();

  if (body.export.viewport) {
    await page.setViewport(body.export.viewport);
  }

  if (body.url) {
    await page.goto(body.url, {waitUntil: 'load'});
  } else if (body.html) {
    await page.setContent(body.html, {waitUntil: 'load'});
  } else {
    throw new Error('url or html is required');
  }

  let res = await page.screenshot({
    type: body.export.type,
    quality: body.export.type === 'jpeg' ? body.export.quality : undefined,
    fullPage: body.export.fullPage,
    clip: body.export.clip,
    omitBackground: body.export.omitBackground,
    encoding: body.export.encoding,
  });

  await page.close();

  // Compress image if it exceeds max file size
  if (res.length > body.export.maxFileSize) {
    res = await compressImage(
      res,
      body.export.type,
      body.export.maxFileSize,
      body.export.quality,
    );
  }

  return res;
}

app.get('/', c => {
  return c.json({
    status: 'ready!',
  });
});

app.post('/pdf', zValidator('json', PdfRequestSchema), async c => {
  const data = c.req.valid('json');

  try {
    const pdfBuffer = await generatePdf(data);

    return c.body(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    log('error', {errorMessage});

    return c.json(
      {
        error: errorMessage,
      },
      400,
    );
  }
});

app.post('/image', zValidator('json', ImageRequestSchema), async c => {
  const data = c.req.valid('json');

  try {
    const imageBuffer = await generateImage(data);

    const contentType = `image/${data.export.type}`;

    return c.body(imageBuffer, {
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    log('error', {errorMessage});

    return c.json(
      {
        error: errorMessage,
      },
      400,
    );
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 80;

async function run() {
  // Check for API key
  const apiKey = process.env.API_KEY;

  if (apiKey) {
    log('info', 'API key is required for all requests');
  } else {
    log('info', 'No API key is configured');
  }

  // Launch browser on startup to avoid delay on first request
  await launchBrowser();

  serve({
    port: PORT,
    fetch: app.fetch,
  });

  log('started', {PORT});
}

run();
