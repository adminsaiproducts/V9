// Polyfill for Google Apps Script environment
// This prevents "ReferenceError: exports is not defined" when using TypeScript modules
// @ts-nocheck
var exports = exports || {};
var module = module || { exports: exports };