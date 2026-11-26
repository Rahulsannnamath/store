import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const requireBackend = createRequire(path.join(root, 'backend/package.json'));
requireBackend('dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
const password = process.env.DEMO_PASSWORD;
if (!password) throw new Error('Configure DEMO_PASSWORD and run db:seed before capturing demo screenshots');
const baseURL = process.env.SCREENSHOT_URL || 'http://localhost:5173';
const output = path.join(root, 'project screen shots/current');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.SCREENSHOT_BROWSER || 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
const captures = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.status() >= 400 && new URL(response.url()).hostname === 'localhost') {
    errors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);
  }
});
async function settle() {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.complete ? Promise.resolve() : new Promise(resolve => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    })));
  });
  const broken = await page.locator('img').evaluateAll(images => images.filter(image => !image.naturalWidth).length);
  if (broken) throw new Error(`${broken} image(s) failed to load`);
}
async function capture(file, title) {
  await page.mouse.move(0, 0);
  await settle();
  const dialogOpen = await page.getByRole('dialog').count() > 0;
  await page.screenshot({ path: path.join(output, file), fullPage: !dialogOpen, animations: 'disabled' });
  captures.push({ file, title });
  console.log(`Captured ${file}`);
}
async function signIn(button, email, dashboard) {
  await page.getByRole('button', { name: button, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email', { exact: true }).fill(email);
  await dialog.getByLabel('Password', { exact: true }).fill(password);
  await dialog.getByRole('button', { name: 'Log in', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('heading', { name: dashboard, exact: true }).waitFor();
  await page.getByRole('alert').filter({ hasText: 'Logged in as' }).waitFor({ state: 'hidden' });
}
async function signOut() {
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.getByRole('button', { name: 'Login as Admin', exact: true }).waitFor();
  await page.getByRole('alert').filter({ hasText: 'Logged out' }).waitFor({ state: 'hidden' });
}
try {
  await page.goto(baseURL);
  await page.getByRole('heading', { name: 'Fresh Basket Market', exact: true }).waitFor();
  await capture('01-store-listing.png', 'Public store listing');
  for (const [button, file, title] of [
    ['Log in', '02-user-login.png', 'User login'],
    ['Login as Store Owner', '03-owner-login.png', 'Store Owner login'],
    ['Login as Admin', '04-admin-login.png', 'Admin login'],
    ['Sign up', '05-signup.png', 'Normal User signup']
  ]) {
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await capture(file, title);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  }
  await signIn('Log in', 'rahul@demo.store.test', 'Explore Stores');
  await capture('06-user-dashboard.png', 'Normal User ratings');
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await capture('09-change-password.png', 'Change password form');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await signOut();
  await signIn('Login as Store Owner', 'ananya@demo.store.test', 'Store Owner Dashboard');
  await page.getByRole('button', { name: 'View ratings for Fresh Basket Market', exact: true }).click();
  await page.getByText('Rahul Sannnamath Demo Shopper', { exact: true }).waitFor();
  await page.locator('.owner-card .MuiCollapse-entered').waitFor();
  await capture('07-owner-dashboard.png', 'Owner stores and submitted ratings');
  await signOut();
  await signIn('Login as Admin', 'admin@demo.store.test', 'StoreConnect - Admin Panel');
  await page.getByRole('button', { name: 'View details', exact: true }).first().waitFor();
  await capture('08-admin-dashboard.png', 'Admin statistics and management');
  await signOut();
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('10-mobile-store-listing.png', 'Mobile public store listing');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) errors.push('Mobile viewport has horizontal page overflow');
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify({ capturedAt: new Date().toISOString(), baseURL, desktopViewport: { width: 1440, height: 1000 }, mobileViewport: { width: 390, height: 844 }, captures, errors }, null, 2) + '\n');
  if (errors.length) throw new Error(`Capture verification issues: ${errors.join('; ')}`);
  console.log(`Saved ${captures.length} screenshots; no browser exceptions, failed local requests, broken images or mobile page overflow.`);
} finally { await browser.close(); }
