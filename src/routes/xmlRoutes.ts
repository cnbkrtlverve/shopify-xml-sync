import express from 'express';
import axios from 'axios';
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

// XML için proxy endpoint'i
router.get('/proxy', async (req, res) => {
    const xmlUrl = process.env.XML_FEED_URL;
    if (!xmlUrl) {
        return res.status(500).json({ success: false, message: 'XML_FEED_URL is not configured on the server.' });
    }

    try {
        const response = await axios.get(xmlUrl, {
            responseType: 'text' // XML'i metin olarak al
        });
        res.header('Content-Type', 'application/xml');
        res.send(response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error fetching XML via proxy:', error.message);
            res.status(error.response?.status || 500).json({ success: false, message: 'Failed to fetch XML data.', error: error.message });
        } else if (error instanceof Error) {
            console.error('Generic error fetching XML:', error.message);
            res.status(500).json({ success: false, message: 'An unexpected error occurred.', error: error.message });
        } else {
            console.error('Unknown error fetching XML:', error);
            res.status(500).json({ success: false, message: 'An unknown error occurred.' });
        }
    }
});

export default router;
