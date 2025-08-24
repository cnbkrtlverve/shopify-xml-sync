import express from 'express';
import { checkXmlConnection, getXmlStats } from '../services/xmlService';

const router = express.Router();

// Bağlantı kontrolü
router.get('/check', async (req, res) => {
    const result = await checkXmlConnection();
    res.json(result);
});

// XML istatistiklerini al
router.get('/stats', async (req, res) => {
    const result = await getXmlStats();
    res.json(result);
});

export default router;
