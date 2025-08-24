import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Shopify info endpoint
app.get('/api/shopify/info', async (req, res) => {
    try {
        // Sabit veriler ile test
        res.json({
            success: true,
            shop: {
                name: "Verve Granül",
                domain: "verve-granul.myshopify.com"
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Shopify hatası' });
    }
});

module.exports = app;
