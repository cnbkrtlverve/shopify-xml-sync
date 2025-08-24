import express from 'express';
import { runSync, getLatestSyncSummary } from '../services/syncService';

const router = express.Router();

// Senkronizasyonu başlatan endpoint
router.post('/run', (req, res) => {
    const options = req.body.options || { full: true }; // İstemciden gelen seçenekleri al
    
    console.log('Senkronizasyon isteği alındı. Seçenekler:', options);

    // İstemciye hemen yanıt ver, senkronizasyon arka planda çalışsın
    res.status(202).json({ message: 'Senkronizasyon başlatıldı. Durumu loglardan veya özet endpointinden takip edebilirsiniz.' });

    // Senkronizasyonu asenkron olarak çalıştır
    runSync((message, level) => {
        // Logları konsola yazdır. Gerçek bir uygulamada bu loglar bir dosyaya veya log servisine yazılmalıdır.
        console.log(`[SYNC - ${level.toUpperCase()}] ${message}`);
    }, options).catch(error => {
        console.error(`[SYNC - FATAL] Senkronizasyon kök hatası: ${error.message}`);
    });
});

// Son senkronizasyon özetini döndüren endpoint
router.get('/summary', (req, res) => {
    const summary = getLatestSyncSummary();
    res.json({ success: true, summary });
});

export default router;
