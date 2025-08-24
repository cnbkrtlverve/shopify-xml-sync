import { google } from 'googleapis';
// DÜZELTME: oAuth2Client'ı doğrudan import ediyoruz ki token'ları ayarlayabilelim.
import { getAuthenticatedClient, oAuth2Client } from './googleAuthService';
import { getShopifyApiClient } from './shopifyService';

type PriceData = {
    sku: string;
    price: string | null;
    compareAtPrice: string | null;
};

// Adım 1: Google Sheet'ten verileri oku
async function getPricesFromSheet(spreadsheetId: string): Promise<PriceData[]> {
    // DÜZELTME: getAuthenticatedClient() yerine doğrudan yapılandırılmış oAuth2Client kullanılıyor.
    const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sayfa1!E:H', // SKU, Maliyet, Satış Fiyatı, Liste Fiyatı sütunları
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    // Başlık satırını atla ve veriyi işle
    return rows.slice(1).map(row => ({
        sku: row[0],
        price: row[2] || null, // Satış Fiyatı (G sütunu)
        compareAtPrice: row[3] || null, // Liste Fiyatı (H sütunu)
    })).filter(item => item.sku); // SKU'su olmayan satırları atla
}

// Adım 2: Shopify'da varyantları bul ve güncelle (Bu fonksiyon aynı kalıyor)
async function updatePricesInShopify(priceData: PriceData[], logCallback: (message: string, level: 'info' | 'success' | 'error') => void): Promise<{ updated: number; notFound: number }> {
    const shopifyApi = getShopifyApiClient();
    let updatedCount = 0;
    let notFoundCount = 0;

    const { data: { products } } = await shopifyApi.get('/products.json?fields=id,variants');
    const skuToVariantIdMap = new Map<string, number>();
    products.forEach((product: any) => {
        product.variants.forEach((variant: any) => {
            if (variant.sku) {
                skuToVariantIdMap.set(variant.sku, variant.id);
            }
        });
    });

    for (const item of priceData) {
        const variantId = skuToVariantIdMap.get(item.sku);
        if (!variantId) {
            notFoundCount++;
            logCallback(`SKU bulunamadı: ${item.sku}`, 'error');
            continue;
        }

        if (item.price !== null || item.compareAtPrice !== null) {
            try {
                await shopifyApi.put(`/variants/${variantId}.json`, {
                    variant: {
                        id: variantId,
                        price: item.price,
                        compare_at_price: item.compareAtPrice,
                    },
                });
                updatedCount++;
                logCallback(`SKU güncellendi: ${item.sku} - Fiyat: ${item.price || 'Değişmedi'}`, 'info');
            } catch (error: any) {
                logCallback(`SKU güncellenirken hata: ${item.sku} - ${error.message}`, 'error');
            }
        }
    }
    return { updated: updatedCount, notFound: notFoundCount };
}

// Ana orkestrasyon fonksiyonu
export async function runPriceUpdateFromSheet(logCallback: (message: string, level: 'info' | 'success' | 'error' | 'warn') => void) {
    // --- YENİ: İşleme başlamadan önce kimlik doğrulama kontrolü ---
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!refreshToken) {
        throw new Error('Ayarlarda Google Refresh Token bulunamadı. Lütfen Google hesabınızı yeniden bağlayın.');
    }
    // oAuth2Client'a kaydedilmiş token'ı set et
    oAuth2Client.setCredentials({ refresh_token: refreshToken });
    // --- Bitiş: Kimlik doğrulama kontrolü ---

    logCallback('Fiyat güncelleme başlatıldı: Google Sheet\'ten veriler okunuyor...', 'warn');
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
        throw new Error('Ayarlarda Google Sheet ID bulunamadı. Lütfen önce bir şablon oluşturun.');
    }

    const priceData = await getPricesFromSheet(spreadsheetId);
    logCallback(`${priceData.length} adet fiyat bilgisi okundu. Shopify'a güncelleniyor...`, 'info');

    const result = await updatePricesInShopify(priceData, logCallback);
    const summary = `Fiyat güncelleme tamamlandı! ${result.updated} varyant güncellendi, ${result.notFound} SKU bulunamadı.`;
    logCallback(summary, 'success');
}