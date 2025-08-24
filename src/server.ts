import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Rotaları import et
import shopifyRoutes from './routes/shopifyRoutes';
import xmlRoutes from './routes/xmlRoutes';
import googleRoutes from './routes/googleRoutes';
import syncRoutes from './routes/syncRoutes';
import priceUpdateRoutes from './routes/priceUpdateRoutes';

// .env dosyasını yükle
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware'ler
app.use(cors());
app.use(express.json()); // Gelen isteklerdeki JSON body'leri parse etmek için
app.use(express.urlencoded({ extended: true }));

// Statik dosyalar için (HTML, CSS, JS)
// Proje kök dizinindeki 'public' klasörünü kullan
app.use(express.static(path.join(process.cwd(), 'public')));


// API Rotaları
app.use('/api/shopify', shopifyRoutes);
app.use('/api/xml', xmlRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/update-prices', priceUpdateRoutes);


// Ana sayfa için HTML dosyasını sun
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Sunucuyu başlat
if (process.env.NODE_ENV !== 'lambda') {
    app.listen(port, () => {
        console.log(`Sunucu http://localhost:${port} adresinde çalışıyor.`);
        console.log('Shopify Mağaza URL:', process.env.SHOPIFY_STORE_URL ? `${process.env.SHOPIFY_STORE_URL.substring(0, 15)}...` : 'Ayarlanmadı');
        console.log('XML Feed URL:', process.env.XML_FEED_URL ? `${process.env.XML_FEED_URL.substring(0, 30)}...` : 'Ayarlanmadı');
        console.log('Google Entegrasyonu:', process.env.GOOGLE_CLIENT_ID ? 'Aktif' : 'Pasif');
    });
}
