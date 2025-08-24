import { google } from 'googleapis';
import { oAuth2Client } from './googleAuthService.js';
import { getShopifyApiClient } from './shopifyService.js';
import { AxiosInstance } from 'axios';

type PriceData = {
    sku: string;
    price: string | null;
    compareAtPrice: string | null;
};

// Adım 1: Google Sheet'ten verileri oku
async function getPricesFromSheet(spreadsheetId: string): Promise<PriceData[]> {
    const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sayfa1!E:H', // SKU, Maliyet, Satış Fiyatı, Liste Fiyatı sütunları
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    // Başlık satırını atla ve veriyi işle
    return rows.slice(1).map(row => ({
        sku: row[0], // E sütunu
        price: row[2] || null, // G sütunu (Satış Fiyatı)
        compareAtPrice: row[3] || null, // H sütunu (Liste Fiyatı)
    })).filter(item => item.sku && (item.price !== null || item.compareAtPrice !== null)); // SKU'su olan ve en az bir fiyatı olanları al
}


// Adım 2: Shopify'da varyantları bul ve güncelle
async function updatePricesInShopify(
    shopifyApi: AxiosInstance,
    priceData: PriceData[],
    logCallback: (message: string, level: 'info' | 'success' | 'error' | 'warn') => void
): Promise<{ updated: number; notFound: number; unchanged: number }> {
    let updatedCount = 0;
    let notFoundCount = 0;
    let unchangedCount = 0;

    // GraphQL sorgusu ile SKU'ları ve varyant ID'lerini toplu olarak al
    const skuToVariantMap = new Map<string, { id: string; price: string; compareAtPrice: string | null }>();

    let hasNextPage = true;
    let cursor = null;
    const query = `
      query getProducts($cursor: String) {
        products(first: 50, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              variants(first: 50) {
                edges {
                  node {
                    id
                    sku
                    price
                    compareAtPrice
                  }
                }
              }
            }
          }
        }
      }`;

    logCallback("Shopify'dan mevcut ürün ve varyant bilgileri alınıyor...", 'info');
    while (hasNextPage) {
        const response: any = await shopifyApi.post('/graphql.json', {
            query,
            variables: { cursor },
        });
        const products: any = response.data.data.products;
        products.edges.forEach((productEdge: any) => {
            productEdge.node.variants.edges.forEach((variantEdge: any) => {
                const variant = variantEdge.node;
                if (variant.sku) {
                    skuToVariantMap.set(variant.sku, {
                        id: variant.id,
                        price: variant.price,
                        compareAtPrice: variant.compareAtPrice
                    });
                }
            });
        });
        hasNextPage = products.pageInfo.hasNextPage;
        cursor = products.pageInfo.endCursor;
    }
    logCallback(`Shopify'dan ${skuToVariantMap.size} adet SKU bilgisi alındı.`, 'info');


    const mutations = [];
    for (const item of priceData) {
        const shopifyVariant = skuToVariantMap.get(item.sku);
        if (!shopifyVariant) {
            notFoundCount++;
            logCallback(`SKU bulunamadı: ${item.sku}`, 'warn');
            continue;
        }

        // Fiyatları normalleştirerek karşılaştır
        const sheetPrice = item.price ? parseFloat(item.price.replace(',', '.')).toFixed(2) : null;
        const sheetComparePrice = item.compareAtPrice ? parseFloat(item.compareAtPrice.replace(',', '.')).toFixed(2) : null;
        const shopifyPrice = parseFloat(shopifyVariant.price).toFixed(2);
        const shopifyComparePrice = shopifyVariant.compareAtPrice ? parseFloat(shopifyVariant.compareAtPrice).toFixed(2) : null;

        const isPriceChanged = sheetPrice !== null && sheetPrice !== shopifyPrice;
        const isComparePriceChanged = sheetComparePrice !== shopifyComparePrice;


        if (isPriceChanged || isComparePriceChanged) {
            const variantInput: any = {
                id: shopifyVariant.id,
            };
            if (isPriceChanged) variantInput.price = sheetPrice;
            if (isComparePriceChanged) variantInput.compareAtPrice = sheetComparePrice;

            mutations.push({
                mutation: `
          mutation productVariantUpdate($input: ProductVariantInput!) {
            productVariantUpdate(input: $input) {
              productVariant {
                id
                price
                compareAtPrice
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
                variables: { input: variantInput },
                sku: item.sku // Hata takibi için
            });
            updatedCount++;
        } else {
            unchangedCount++;
        }
    }

    if (mutations.length === 0) {
        logCallback("Shopify'da güncellenecek fiyat bulunamadı.", 'info');
        return { updated: 0, notFound: notFoundCount, unchanged: unchangedCount };
    }

    logCallback(`${mutations.length} varyant için fiyat güncelleme isteği gönderiliyor...`, 'info');

    // GraphQL mutasyonlarını toplu olarak gönder
    for (const m of mutations) {
        try {
            const response = await shopifyApi.post('/graphql.json', { query: m.mutation, variables: m.variables });
            const userErrors = response.data.data?.productVariantUpdate?.userErrors;
            if (userErrors && userErrors.length > 0) {
                logCallback(`SKU ${m.sku} güncellenirken hata: ${userErrors.map((e: any) => e.message).join(', ')}`, 'error');
                updatedCount--; // Başarısız olduğu için sayacı geri al
            } else {
                 logCallback(`SKU güncellendi: ${m.sku}`, 'info');
            }
        } catch (error: any) {
            logCallback(`GraphQL isteği sırasında hata (SKU: ${m.sku}): ${error.message}`, 'error');
            updatedCount--; // Başarısız olduğu için sayacı geri al
        }
    }


    return { updated: updatedCount, notFound: notFoundCount, unchanged: unchangedCount };
}

// Ana orkestrasyon fonksiyonu
export async function runPriceUpdateFromSheet(logCallback: (message: string, level: 'info' | 'success' | 'error' | 'warn') => void) {
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!refreshToken) {
        throw new Error('Ayarlarda Google Refresh Token bulunamadı. Lütfen Google hesabınızı yeniden bağlayın.');
    }
    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    logCallback('Fiyat güncelleme başlatıldı: Google Sheet\'ten veriler okunuyor...', 'warn');
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
        throw new Error('Ayarlarda Google Sheet ID bulunamadı. Lütfen önce bir şablon oluşturun.');
    }

    const shopifyApi = getShopifyApiClient();
    const priceData = await getPricesFromSheet(spreadsheetId);
    logCallback(`${priceData.length} adet fiyat bilgisi okundu. Shopify ile karşılaştırılıyor...`, 'info');

    const result = await updatePricesInShopify(shopifyApi, priceData, logCallback);
    const summary = `Fiyat güncelleme tamamlandı! ${result.updated} varyant güncellendi, ${result.notFound} SKU bulunamadı, ${result.unchanged} varyantta değişiklik yok.`;
    logCallback(summary, 'success');
}
