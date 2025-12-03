const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');
const assetsDir = path.join(distDir, 'assets');

console.log('🚀 Generating GAS 3-File Pattern...');

try {
  // Find JS and CSS files
  if (!fs.existsSync(assetsDir)) {
    throw new Error('dist/assets directory not found. Did Vite build fail?');
  }

  const files = fs.readdirSync(assetsDir);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const cssFiles = files.filter(f => f.endsWith('.css'));

  if (jsFiles.length === 0) throw new Error('No JS files found in dist/assets');

  // Combine all JS files
  let allJs = '';
  jsFiles.forEach(file => {
    console.log(`📖 Reading JS: ${file}`);
    const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
    allJs += content + '\n';
  });

  // Combine all CSS files
  let allCss = '';
  cssFiles.forEach(file => {
    console.log(`📖 Reading CSS: ${file}`);
    const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
    allCss += content + '\n';
  });

  // Generate javascript.html
  const javascriptHtml = `<script>\n${allJs}\n</script>`;
  fs.writeFileSync(path.join(distDir, 'javascript.html'), javascriptHtml);
  console.log(`✅ Generated javascript.html (${javascriptHtml.length} bytes)`);

  // Generate stylesheet.html
  const stylesheetHtml = `<style>\n${allCss}\n</style>`;
  fs.writeFileSync(path.join(distDir, 'stylesheet.html'), stylesheetHtml);
  console.log(`✅ Generated stylesheet.html (${stylesheetHtml.length} bytes)`);

  // Generate index.html template
  const indexHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRM V9</title>
  <?!= include('stylesheet'); ?>

  <!-- Inject initial state from server for deep-linking -->
  <script>
    window.CRM_INITIAL_STATE = <?!= initialState ?>;
  </script>
</head>
<body>
  <div id="root"></div>
  <?!= include('javascript'); ?>
</body>
</html>`;

  fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml);
  console.log(`✅ Generated index.html (${indexHtml.length} bytes)`);

  console.log('✨ 3-File Pattern generation complete!');

} catch (e) {
  console.error('❌ Build Failed:', e);
  process.exit(1);
}
