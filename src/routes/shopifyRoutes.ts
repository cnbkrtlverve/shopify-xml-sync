import express from 'express';
import { 
    checkShopifyConnection, 
    getShopifyStoreInfo,
    searchShopifyProducts 
} from '../services/shopifyService';

const router = express.Router();

// Bağlantı kontrolü
router.get('/check', async (req, res) => {
    const result = await checkShopifyConnection();
    res.json(result);
});

// Mağaza bilgilerini al
router.get('/info', async (req, res) => {
    const result = await getShopifyStoreInfo();
    res.json(result);
});

// Ürün arama
router.get('/search', async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
        return res.status(400).json({ success: false, message: 'Arama sorgusu (q) gereklidir.' });
    }
    try {
        const results = await searchShopifyProducts(query);
        res.json({ success: true, products: results });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
