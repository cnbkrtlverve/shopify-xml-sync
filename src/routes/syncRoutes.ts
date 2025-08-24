import { Router, Request, Response } from 'express';
import { runSync, getLatestSyncSummary } from '../services/syncService';
import { getShopifyStoreInfo, getShopifyStats, searchShopifyProducts } from '../services/shopifyService';
import { getGoogleAuthUrl, getGoogleTokens, isGoogleAuthenticated } from '../services/googleAuthService';
import { createProductSheet, getSheetInfo } from '../services/googleSheetsService';
import { runPriceUpdateFromSheet } from '../services/priceUpdateService';
import { getXmlStats } from '../services/xmlService';

// DÜZELTME: Fonksiyon adı ve yapısı app.ts'in beklediği gibi 'createSyncRouter' olarak düzeltildi.
export const createSyncRouter = (
    broadcastLog: (message: string, level: 'info' | 'success' | 'error' | 'warn') => void,
    onSyncComplete: (summary: string) => void
) => {
    const router = Router();

    // Not: Bu dosya artık kendi log fonksiyonunu oluşturmuyor, app.ts'ten gelenleri kullanıyor.

    router.get('/status', async (req: Request, res: Response) => {
        try {
            const [shopify, xml] = await Promise.all([
                getShopifyStoreInfo(),
                getXmlStats()
            ]);
            res.json({ shopify, xml, latestSummary: getLatestSyncSummary() });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/sync', async (req: Request, res: Response) => {
        res.status(202).json({ message: 'Senkronizasyon işlemi başlatıldı.' });
        try {
            // runSync, artık broadcastLog'u parametre olarak alıyor.
            const summary = await runSync(broadcastLog);
            // Senkronizasyon bitince, app.ts'ten gelen onSyncComplete fonksiyonu çağrılıyor.
            onSyncComplete(summary);
        } catch (error: any) {
            broadcastLog(`Senkronizasyon sırasında kritik bir hata oluştu: ${error.message}`, 'error');
        }
    });

    // --- DİĞER TÜM ROTALAR OLDUĞU GİBİ KALIYOR ---

    router.get('/google/auth', (req: Request, res: Response) => {
        res.redirect(getGoogleAuthUrl());
    });

    router.get('/google/callback', async (req: Request, res: Response) => {
        try {
            const code = req.query.code as string;
            if (!code) throw new Error('Authorization code not provided.');
            await getGoogleTokens(code);
            res.send('<script>window.opener.postMessage("google-auth-success", "*"); window.close();</script>');
        } catch (error: any) {
            res.status(500).send(`Authentication failed: ${error.message}`);
        }
    });

    router.get('/google/status', (req: Request, res: Response) => {
        res.json({ authenticated: isGoogleAuthenticated() });
    });

    router.get('/google/sheet-info', async (req: Request, res: Response) => {
        try {
            const info = await getSheetInfo();
            res.json(info);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/shopify/stats', async (req: Request, res: Response) => {
        try {
            const stats = await getShopifyStats();
            res.json(stats);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/shopify/generate-sheet', async (req: Request, res: Response) => {
        try {
            const { url } = await createProductSheet();
            res.json({ url });
        } catch (error: any) {
            broadcastLog(`Google Sheet oluşturulurken hata: ${error.message}`, 'error');
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/shopify/search', async (req: Request, res: Response) => {
        try {
            const query = req.query.q as string;
            if (!query) return res.status(400).json({ error: 'Arama sorgusu gerekli' });
            const results = await searchShopifyProducts(query);
            res.json(results);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/shopify/update-prices-from-sheet', async (req: Request, res: Response) => {
        res.status(202).json({ message: 'Fiyat güncelleme işlemi başlatıldı.' });
        try {
            // Fiyat güncelleme servisi de log fonksiyonunu kullanmalı
            await runPriceUpdateFromSheet(broadcastLog);
        } catch (error: any) {
            broadcastLog(`Kritik fiyat güncelleme hatası: ${error.message}`, 'error');
        }
    });

    return router;
};