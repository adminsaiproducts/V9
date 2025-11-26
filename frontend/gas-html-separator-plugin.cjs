/**
 * Custom Webpack Plugin for Google Apps Script
 * Generates 3 separate HTML files for GAS deployment:
 * - index.html: Main template with <?!= include() ?> calls
 * - javascript.html: JS bundle wrapped in <script> tags
 * - stylesheet.html: CSS bundle wrapped in <style> tags
 */
class GasHtmlSeparatorPlugin {
    apply(compiler) {
        compiler.hooks.emit.tapAsync('GasHtmlSeparatorPlugin', (compilation, callback) => {
            // Find the generated JS and CSS assets
            let jsContent = '';
            let cssContent = '';

            // Extract JS bundle
            const jsBundleName = Object.keys(compilation.assets).find(name => name.endsWith('.js'));
            if (jsBundleName) {
                jsContent = compilation.assets[jsBundleName].source();
                // Remove the standalone JS file - we only want it in javascript.html
                delete compilation.assets[jsBundleName];
            }

            // Extract CSS bundle
            const cssBundleName = Object.keys(compilation.assets).find(name => name.endsWith('.css'));
            if (cssBundleName) {
                cssContent = compilation.assets[cssBundleName].source();
                // Remove the standalone CSS file - we only want it in stylesheet.html
                delete compilation.assets[cssBundleName];
            }

            // Remove any auto-generated index.html from HtmlWebpackPlugin
            if (compilation.assets['index.html']) {
                delete compilation.assets['index.html'];
            }

            // Generate index.html with GAS template syntax
            const indexHtml = `<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <?!= include('stylesheet'); ?>
  </head>
  <body>
    <div id="root">Loading...</div>
    <script>console.log("🟢 HTML LOADED");</script>
    <?!= include('javascript'); ?>
  </body>
</html>`;

            // Generate javascript.html
            const javascriptHtml = `<script>
${jsContent}
</script>`;

            // Generate stylesheet.html
            const stylesheetHtml = `<style>
${cssContent}
</style>`;

            // Add the 3 files to webpack output
            compilation.assets['index.html'] = {
                source: () => indexHtml,
                size: () => indexHtml.length
            };

            compilation.assets['javascript.html'] = {
                source: () => javascriptHtml,
                size: () => javascriptHtml.length
            };

            compilation.assets['stylesheet.html'] = {
                source: () => stylesheetHtml,
                size: () => stylesheetHtml.length
            };

            // Log file sizes for verification
            console.log('\n📦 GAS HTML Files Generated:');
            console.log(`   index.html: ${(indexHtml.length / 1024).toFixed(2)} KB`);
            console.log(`   javascript.html: ${(javascriptHtml.length / 1024).toFixed(2)} KB`);
            console.log(`   stylesheet.html: ${(stylesheetHtml.length / 1024).toFixed(2)} KB`);
            console.log(`   Total: ${((indexHtml.length + javascriptHtml.length + stylesheetHtml.length) / 1024).toFixed(2)} KB\n`);

            callback();
        });
    }
}

module.exports = GasHtmlSeparatorPlugin;
