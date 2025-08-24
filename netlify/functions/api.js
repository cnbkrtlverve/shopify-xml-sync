const express = require('express');
const serverless = require('serverless-http');
const app = require('../../src/server').default; // .ts dosyasından default export'u al

// Netlify'ın yolu doğru çözebilmesi için base path ayarla
const router = express.Router();
router.use('/', app);

module.exports.handler = serverless(router);
