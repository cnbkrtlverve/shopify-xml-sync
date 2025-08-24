import { google } from 'googleapis';
import { getAuthenticatedClient } from './googleAuthService.js';
import { fetchAllShopifyProducts } from './shopifyService.js';
import { updateEnvFile } from '../utils/envHelper.js';
import { Product } from '../types/product.d';

// Mevcut Google Sheet'i yeni ürünlerle güncelleme fonksiyonu
export async function updateProductSheetWithNewItems(productsFromXml: Product[], logCallback: (message: string, level: 'info' | 'success' | 'warn') => void): Promise<number> {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
        logCallback('Güncellenecek bir Google Sheet ID bulunamadı, işlem atlanıyor.', 'info');
        return 0;
    }

    const authClient = getAuthenticatedClient();
    if (!authClient) {
        logCallback('Google hesabı bağlı değil, Sheet güncellemesi atlanıyor.', 'info');
        return 0;
    }

    const sheets = google.sheets({ version: 'v4', auth: authClient });

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sayfa1!E:E', // SKU sütunu
        });

        const existingSkus = new Set(response.data.values?.flat() ?? []);
        if (existingSkus.has('SKU')) existingSkus.delete('SKU');

        const newRows: any[][] = [];
        for (const product of productsFromXml) {
            for (const variant of product.variants) {
                if (variant.sku && !existingSkus.has(variant.sku)) {
                    newRows.push([
                        '', // Shopify Product ID
                        product.handle,
                        product.title,
                        '', // Variant ID
                        variant.sku,
                        '', '', '' // Fiyat alanları boş
                    ]);
                    existingSkus.add(variant.sku);
                }
            }
        }

        if (newRows.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'Sayfa1!A1',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: newRows,
                },
            });
            logCallback(`Google Sheet güncellendi: ${newRows.length} yeni varyant eklendi.`, 'success');
            return newRows.length;
        }
        
        logCallback('Google Sheet\'te eklenecek yeni ürün bulunamadı.', 'info');
        return 0;
    } catch (error: any) {
        logCallback(`Google Sheet güncellenirken bir hata oluştu: ${error.message}`, 'warn');
        // Hata durumunda 0 döndürerek senkronizasyonun devam etmesini sağla
        return 0;
    }
}

export async function getSheetInfo(): Promise<{ exists: boolean, url?: string, id?: string }> {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
        return { exists: false };
    }
    return {
        exists: true,
        id: sheetId,
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
    };
}

export async function createProductSheet(): Promise<{url: string, id: string}> {
    const authClient = getAuthenticatedClient();
    if (!authClient) throw new Error('Kullanıcı kimliği doğrulanmamış.');

    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const products = await fetchAllShopifyProducts();
    
    const rows = [
        ['Shopify Product ID', 'Product Handle', 'Product Title', 'Variant ID', 'SKU', 'Maliyet Fiyatı (TL)', 'Satış Fiyatı (TL)', 'Liste Fiyatı (TL - Üstü Çizili)']
    ];

    for (const product of products) {
        for (const variant of product.variants) {
            rows.push([
                String(product.id), 
                product.handle, 
                product.title, 
                String(variant.id),
                variant.sku, 
                '', // Maliyet
                String(variant.price), 
                String(variant.compareAtPrice || '') 
            ]);
        }
    }

    const spreadsheet = await sheets.spreadsheets.create({
        requestBody: {
            properties: { title: `Vervegrand Shopify Fiyat Listesi - CANLI` },
        },
        fields: 'spreadsheetId,spreadsheetUrl',
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    const spreadsheetUrl = spreadsheet.data.spreadsheetUrl;
    if (!spreadsheetId || !spreadsheetUrl) throw new Error('Spreadsheet ID veya URL alınamadı.');

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sayfa1!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
    });

    await updateEnvFile('GOOGLE_SHEET_ID', spreadsheetId);
    process.env.GOOGLE_SHEET_ID = spreadsheetId;

    return { url: spreadsheetUrl, id: spreadsheetId };
}
