import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

// Rota dosyalarını import et
import shopifyRoutes from './routes/shopifyRoutes.js';
import xmlRoutes from './routes/xmlRoutes.js';
import syncRoutes from './routes/syncRoutes.js';
import googleRoutes from './routes/googleRoutes.js';
// import priceUpdateRoutes from './routes/priceUpdateRoutes.js'; // Henüz kullanılmıyor

import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Statik dosyalar için (public klasörü)
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));


// API Rotaları
app.use('/api/shopify', shopifyRoutes);
app.use('/api/xml', xmlRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/google', googleRoutes);
// app.use('/api/price-update', priceUpdateRoutes);

// Genel bir config endpoint'i (isteğe bağlı, .env'i yönetmek için)
app.post('/api/config', (req, res) => {
    // Bu endpoint'in .env dosyasını doğrudan değiştirmesi güvenlik riski oluşturabilir.
    // Şimdilik sadece ayarların alındığını simüle edelim.
    console.log('Yeni ayarlar alındı:', req.body);
    res.json({ success: true, message: 'Ayarlar sunucuya ulaştı.' });
});


// Ana sayfa için catch-all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});

export default app; // Netlify gibi serverless ortamlar için
