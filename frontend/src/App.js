"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var styles_1 = require("@mui/material/styles");
var CssBaseline_1 = require("@mui/material/CssBaseline");
var theme_1 = require("./theme");
var AppLayout_1 = require("./components/Layout/AppLayout");
var Dashboard_1 = require("./pages/Dashboard");
var Customers_1 = require("./pages/Customers");
function App() {
    return (<styles_1.ThemeProvider theme={theme_1.theme}>
      <CssBaseline_1.default />
      <react_router_dom_1.BrowserRouter>
        <AppLayout_1.AppLayout>
          <react_router_dom_1.Routes>
            <react_router_dom_1.Route path="/" element={<Dashboard_1.Dashboard />}/>
            <react_router_dom_1.Route path="/customers" element={<Customers_1.Customers />}/>
            <react_router_dom_1.Route path="/deals" element={<div>商談管理 (Coming Soon)</div>}/>
            <react_router_dom_1.Route path="/reports" element={<div>レポート (Coming Soon)</div>}/>
          </react_router_dom_1.Routes>
        </AppLayout_1.AppLayout>
      </react_router_dom_1.BrowserRouter>
    </styles_1.ThemeProvider>);
}
exports.default = App;
