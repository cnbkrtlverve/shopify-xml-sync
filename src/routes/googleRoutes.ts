import express from 'express';
import { getGoogleAuthUrl, getGoogleTokens, isGoogleAuthenticated } from '../services/googleAuthService';
import { createProductSheet, getSheetInfo } from '../services/googleSheetsService';

const router = express.Router();

// Google kimlik doğrulama URL'ini al
router.get('/auth/google', (req, res) => {
    const url = getGoogleAuthUrl();
    if (url.includes('error')) {
        return res.status(500).json({ success: false, message: "Google ayarları eksik, .env dosyasını kontrol edin." });
    }
    res.json({ success: true, url });
});

// Google OAuth2 callback
router.get('/auth/google/callback', async (req, res) => {
    const code = req.query.code as string;
    if (!code) {
        return res.status(400).send('Kod bulunamadı');
    }
    try {
        await getGoogleTokens(code);
        // Başarı durumunda kullanıcıyı ana sayfaya yönlendir ve bir başarı parametresi ekle
        res.redirect('/?google_auth=success');
    } catch (error) {
        console.error('Google token alınırken hata:', error);
        res.redirect('/?google_auth=error');
    }
});

// Google bağlantı durumunu kontrol et
router.get('/status', (req, res) => {
    res.json({
        isGoogleAuthenticated: isGoogleAuthenticated()
    });
});

// Google Sheet oluşturma endpoint'i
router.post('/create-sheet', async (req, res) => {
    try {
        const { url, id } = await createProductSheet();
        res.json({ success: true, message: 'Google Sheet başarıyla oluşturuldu!', url, id });
    } catch (error: any) {
        console.error('Google Sheet oluşturulurken hata:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Google Sheet bilgisini alma endpoint'i
router.get('/sheet-info', async (req, res) => {
    try {
        const info = await getSheetInfo();
        res.json({ success: true, ...info });
    } catch (error: any) {
        console.error('Google Sheet bilgisi alınırken hata:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


export default router;
