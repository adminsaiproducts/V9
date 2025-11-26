/**
 * GAS Entry Point
 * Bridges global GAS events to the Webpack-bundled application.
 */

function doGet(e) {
  return CRM_APP.doGet(e);
}

function doPost(e) {
  return CRM_APP.doPost(e);
}

function api_getCustomer(id) {
  return CRM_APP.api_getCustomer(id);
}

function api_searchCustomers(query) {
  return CRM_APP.api_searchCustomers(query);
}