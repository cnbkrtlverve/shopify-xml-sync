import express from 'express';
import { runPriceUpdateFromSheet } from '../services/priceUpdateService';

const router = express.Router();

// Fiyatları Google Sheet'ten güncelleyen endpoint
router.post('/run', async (req, res) => {
    // Bu fonksiyon uzun sürebileceği için, istemciye hemen bir yanıt dönüp
    // işlemi arka planda çalıştırmak en iyisidir.
    // WebSocket veya benzeri bir teknoloji ile ilerleme bildirimi yapılabilir.
    
    // Şimdilik basit bir şekilde çalıştırıyoruz.
    console.log('Fiyat güncelleme isteği alındı.');
    
    // İstemciye hemen yanıt ver
    res.json({ success: true, message: 'Fiyat güncelleme işlemi başlatıldı. Lütfen sunucu loglarını kontrol edin.' });

    // Arka planda işlemi çalıştır (logları konsola yazacak)
    try {
        await runPriceUpdateFromSheet((message, level) => {
            // Bu logları daha kalıcı bir yere (dosya, veritabanı vb.) yazmak daha iyi olur.
            console.log(`[${level.toUpperCase()}] ${message}`);
        });
        console.log('Fiyat güncelleme işlemi başarıyla tamamlandı.');
    } catch (error: any) {
        console.error('Fiyat güncelleme işlemi sırasında bir hata oluştu:', error.message);
    }
});

export default router;
