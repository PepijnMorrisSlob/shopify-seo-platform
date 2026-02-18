/**
 * Visual Test Script - Screenshots all main pages
 * Run from frontend directory: node e2e/visual-test.js
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:4178';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Pages to test
const PAGES = [
  { name: 'dashboard', path: '/' },
  { name: 'products', path: '/products' },
  { name: 'discover', path: '/content/discover' },
  { name: 'queue', path: '/content/queue' },
  { name: 'review', path: '/content/review' },
  { name: 'published', path: '/content/published' },
  { name: 'analytics', path: '/content/analytics' },
  { name: 'calendar', path: '/content/calendar' },
  { name: 'settings', path: '/settings' },
];

async function runVisualTest() {
  // Create screenshot directory
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('🎭 Starting Playwright visual test...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  // Capture API calls
  const apiCalls = [];
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      apiCalls.push({
        url: response.url(),
        status: response.status(),
        ok: response.ok()
      });
    }
  });

  const results = [];

  for (const pageInfo of PAGES) {
    try {
      console.log(`📸 Testing ${pageInfo.name}...`);

      await page.goto(`${BASE_URL}${pageInfo.path}`, {
        waitUntil: 'networkidle',
        timeout: 10000
      });

      // Wait a bit for animations
      await page.waitForTimeout(500);

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, `${pageInfo.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      // Check for visible errors
      const hasError = await page.$('.error, [data-error], .Polaris-Banner--statusCritical');

      results.push({
        page: pageInfo.name,
        status: 'OK',
        screenshot: screenshotPath,
        hasVisibleError: !!hasError
      });

      console.log(`   ✅ ${pageInfo.name} - screenshot saved`);

    } catch (error) {
      results.push({
        page: pageInfo.name,
        status: 'FAILED',
        error: error.message
      });
      console.log(`   ❌ ${pageInfo.name} - ${error.message}`);
    }
  }

  await browser.close();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 VISUAL TEST SUMMARY');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.status === 'OK').length;
  const failed = results.filter(r => r.status === 'FAILED').length;

  console.log(`\n✅ Passed: ${passed}/${PAGES.length}`);
  console.log(`❌ Failed: ${failed}/${PAGES.length}`);

  if (consoleErrors.length > 0) {
    console.log(`\n⚠️  Console Errors: ${consoleErrors.length}`);
    consoleErrors.slice(0, 5).forEach(e => console.log(`   ${e}`));
  }

  if (apiCalls.length > 0) {
    const failedApi = apiCalls.filter(a => !a.ok);
    console.log(`\n🌐 API Calls: ${apiCalls.length} (${failedApi.length} failed)`);
    failedApi.forEach(a => console.log(`   ❌ ${a.status} ${a.url}`));
  }

  console.log(`\n📁 Screenshots saved to: ${SCREENSHOT_DIR}`);

  // Return results for programmatic use
  return { results, consoleErrors, apiCalls };
}

runVisualTest().catch(console.error);
