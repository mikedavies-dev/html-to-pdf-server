import puppeteer, {Browser} from 'puppeteer';

let browser: Browser | null = null;

async function getBrowserWebsocket() {
  const browser = await puppeteer.launch({
    ...(process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
      ? {executablePath: '/usr/bin/chromium-browser'}
      : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    headless: true,
  });

  const browserWSEndpoint = browser.wsEndpoint();
  browser.disconnect();
  return browserWSEndpoint;
}

export async function launchBrowser() {
  if (browser) {
    return;
  }

  const browserWSEndpoint = await getBrowserWebsocket();
  browser = await puppeteer.connect({browserWSEndpoint});
}

export function getBrowser() {
  if (browser) {
    return browser;
  }
  throw new Error('Browser not launched');
}
