"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vite_1 = require("vite");
var plugin_react_1 = require("@vitejs/plugin-react");
var vite_plugin_singlefile_1 = require("vite-plugin-singlefile");
// Custom plugin to remove type="module" which causes issues in GAS
var removeModuleType = function () {
    return {
        name: 'remove-module-type',
        transformIndexHtml: function (html) {
            return html.replace(/type="module"/g, '').replace(/crossorigin/g, '').replace(/defer/g, '');
        }
    };
};
// https://vite.dev/config/
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)(), (0, vite_plugin_singlefile_1.viteSingleFile)(), removeModuleType()],
    build: {
        outDir: '../dist',
        emptyOutDir: false,
    }
});
