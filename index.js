// Vercel entry point - require CommonJS module
const { default: app } = require('./dist/server.js');

// Export Express app for Vercel
module.exports = app;