"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var client_1 = require("react-dom/client");
require("./index.css");
var App_tsx_1 = require("./App.tsx");
var mount = function () {
    var root = document.getElementById('root');
    if (root) {
        (0, client_1.createRoot)(root).render(<react_1.StrictMode>
        <App_tsx_1.default />
      </react_1.StrictMode>);
    }
    else {
        console.error('Root element not found');
    }
};
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
}
else {
    mount();
}
