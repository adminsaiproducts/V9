const fs = require('fs');
const path = require('path');

const bundlePath = path.resolve(__dirname, '../dist/bundle.js');
const bridgeCode = `
/* ==============================================
   GAS Editor Recognition Bridge (Auto-Injected)
   ============================================== */
function doGet(e) { return globalThis.doGet(e); }
function doPost(e) { return globalThis.doPost(e); }

function api_getCustomers() { return globalThis.api_getCustomers(); }
function api_getCustomersPaginated(page, pageSize, sortField, sortOrder) { 
  return globalThis.api_getCustomersPaginated(page, pageSize, sortField, sortOrder); 
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
`;

try {
    if (fs.existsSync(bundlePath)) {
        fs.appendFileSync(bundlePath, bridgeCode);
        console.log('✅ GAS Bridge code injected successfully.');
    } else {
        console.error('❌ dist/bundle.js not found!');
        process.exit(1);
    }
} catch (err) {
    console.error('❌ Failed to inject bridge code:', err);
    process.exit(1);
}
