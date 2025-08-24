import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Basit test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'API çalışıyor', time: new Date().toISOString() });
});

// Debug endpoint - sadece ortam değişkenlerinin varlığını kontrol et
app.get('/api/debug/env', (req, res) => {
    const envKeys = Object.keys(process.env).filter(key => key.includes('SHOPIFY'));
    res.json({
        message: 'Ortam değişkenleri kontrolü',
        shopifyKeys: envKeys,
        hasShopifyStoreUrl: !!process.env.SHOPIFY_STORE_URL,
        hasShopifyApiKey: !!process.env.SHOPIFY_API_KEY,
        totalEnvKeys: Object.keys(process.env).length
    });
});

// Shopify info endpoint
app.get('/api/shopify/info', (req, res) => {
    try {
        const shopUrl = process.env.SHOPIFY_STORE_URL;
        const apiKey = process.env.SHOPIFY_API_KEY;
        
        if (!shopUrl || !apiKey) {
            return res.status(500).json({ 
                error: 'Shopify ayarları eksik',
                hasUrl: !!shopUrl,
                hasKey: !!apiKey
            });
        }
        
        res.json({
            success: true,
            shop: shopUrl.replace(/.*\/\/([^\/]+).*/, '$1'),
            configured: true
        });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = app;
