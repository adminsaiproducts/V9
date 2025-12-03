/**
 * Manual Deployment Script for URL Routing Feature
 * This script manually updates Apps Script Editor when clasp push fails
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCRIPT_ID = '1m6iWE31As4iAwAcRTVVK51zCucN8V0qxPYw1WtmPD0uLzGjIK2qG9FcQ';
const EDITOR_URL = `https://script.google.com/home/projects/${SCRIPT_ID}/edit`;

// Files to update
const FILES_TO_UPDATE = {
  'bundle.js': path.join(__dirname, '..', 'dist', 'bundle.js'),
  'index.html': path.join(__dirname, '..', 'dist', 'index.html'),
  'javascript.html': path.join(__dirname, '..', 'dist', 'javascript.html')
};

async function manualDeploy() {
  console.log('🚀 Manual Deployment for URL Routing Feature\n');
  console.log(`📍 Script ID: ${SCRIPT_ID}`);
  console.log(`📍 Editor URL: ${EDITOR_URL}\n`);

  // Load file contents
  const fileContents = {};
  for (const [fileName, filePath] of Object.entries(FILES_TO_UPDATE)) {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
    fileContents[fileName] = fs.readFileSync(filePath, 'utf-8');
    console.log(`✅ Loaded ${fileName} (${fileContents[fileName].length} bytes)`);
  }

  // Verify that api_getCustomerById exists in bundle.js
  if (!fileContents['bundle.js'].includes('api_getCustomerById')) {
    console.error('❌ bundle.js does not contain api_getCustomerById function!');
    process.exit(1);
  }
  console.log('✅ Verified: api_getCustomerById function exists in bundle.js\n');

  // Verify that window.CRM_INITIAL_STATE exists in index.html
  if (!fileContents['index.html'].includes('window.CRM_INITIAL_STATE')) {
    console.error('❌ index.html does not contain window.CRM_INITIAL_STATE!');
    process.exit(1);
  }
  console.log('✅ Verified: window.CRM_INITIAL_STATE exists in index.html\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('📍 Step 1: Opening Apps Script Editor...');
    await page.goto(EDITOR_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);
    console.log('✅ Editor loaded\n');

    // Step 2: Delete assets/main.gs if it exists
    console.log('📍 Step 2: Checking for assets/main.gs...');
    const assetsFolderExists = await page.locator('text="assets"').first().isVisible().catch(() => false);

    if (assetsFolderExists) {
      console.log('⚠️  assets folder found - attempting to delete...');
      try {
        await page.locator('text="assets"').first().click({ button: 'right' });
        await page.waitForTimeout(1000);
        await page.locator('text="Delete"').first().click();
        await page.waitForTimeout(1000);
        // Confirm deletion
        await page.locator('button:has-text("Delete")').first().click();
        await page.waitForTimeout(2000);
        console.log('✅ Deleted assets folder');
      } catch (e) {
        console.log('⚠️  Could not delete assets folder automatically - please delete manually');
      }
    } else {
      console.log('✅ No assets folder found\n');
    }

    // Step 3: Update each file
    for (const [fileName, content] of Object.entries(fileContents)) {
      console.log(`\n📍 Updating ${fileName}...`);

      // Find and click the file
      let fileClicked = false;
      const selectors = [
        `text="${fileName}"`,
        `[role="treeitem"]:has-text("${fileName}")`,
        `.file-name:has-text("${fileName}")`
      ];

      for (const selector of selectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            await page.waitForTimeout(2000);
            fileClicked = true;
            console.log(`  ✅ Opened ${fileName}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!fileClicked) {
        console.error(`  ❌ Could not find ${fileName} in editor`);
        continue;
      }

      // Select all content
      console.log(`  📝 Replacing content...`);
      await page.keyboard.press('Control+A');
      await page.waitForTimeout(500);

      // Delete old content
      await page.keyboard.press('Delete');
      await page.waitForTimeout(500);

      // Insert new content
      await page.keyboard.insertText(content);
      await page.waitForTimeout(2000);

      // Save
      await page.keyboard.press('Control+S');
      await page.waitForTimeout(2000);

      console.log(`  ✅ Updated ${fileName}`);
    }

    console.log('\n🎉 Manual deployment complete!\n');
    console.log('📋 Next steps:');
    console.log('1. Verify the changes in Apps Script Editor');
    console.log('2. Create a new deployment or update existing deployment');
    console.log('3. Test the URL routing feature\n');

  } catch (error) {
    console.error('\n❌ Error during manual deployment:', error.message);
    console.error('Stack trace:', error.stack);

    console.log('\n📸 Taking error screenshot...');
    await page.screenshot({
      path: path.join(__dirname, '..', 'screenshots', `manual-deploy-error-${Date.now()}.png`),
      fullPage: true
    });
  } finally {
    // Keep browser open for verification
    console.log('\n⏸️  Browser will stay open for 2 minutes for verification...');
    await page.waitForTimeout(120000);
    await browser.close();
  }
}

manualDeploy()
  .then(() => {
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
