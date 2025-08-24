import { getProductsFromXml } from './xmlService';
import { findProductByHandle, createShopifyProduct, updateShopifyProduct } from './shopifyService';
import { updateProductSheetWithNewItems } from './googleSheetsService';
import { Product } from '../types/product';

// YENİ: Son senkronizasyon özetini saklamak için bir değişken
let latestSummary = "Henüz bir senkronizasyon tamamlanmadı.";

// YENİ: Saklanan özeti döndüren ve export edilen fonksiyon
export function getLatestSyncSummary(): string {
    return latestSummary;
}

export async function runSync(logCallback: (message: string, level: 'info' | 'success' | 'error' | 'warn') => void): Promise<string> {
    logCallback('Senkronizasyon başlatıldı...', 'warn');
    const startTime = Date.now();

    try {
        const productsFromXml: Product[] = await getProductsFromXml();
        logCallback(`XML kaynağından ${productsFromXml.length} ana ürün bulundu.`, 'info');

        try {
            await updateProductSheetWithNewItems(productsFromXml, logCallback);
        } catch (googleError: any) {
            logCallback(`Google Sheet güncellenirken bir hata oluştu: ${googleError.message}`, 'error');
        }

        let createdCount = 0;
        let updatedCount = 0;

        for (const product of productsFromXml) {
            try {
                const existingProduct = await findProductByHandle(product.handle);
                if (existingProduct) {
                    await updateShopifyProduct(existingProduct.id, existingProduct.variants, product, logCallback);
                    updatedCount++;
                } else {
                    await createShopifyProduct(product, logCallback);
                    createdCount++;
                }
            } catch (productError: any) {
                logCallback(`'${product.title}' ürünü işlenirken hata: ${productError.message}`, 'error');
            }
        }

        const duration = (Date.now() - startTime) / 1000;
        const summary = `Senkronizasyon tamamlandı! Süre: ${duration.toFixed(2)}s. Oluşturulan: ${createdCount}, Güncellenen: ${updatedCount}.`;
        logCallback(summary, 'success');
        
        // DÜZELTME: İşlem bitince özet değişkeni güncelleniyor.
        latestSummary = summary;
        return summary;

    } catch (error: any) {
        const summary = `Senkronizasyon başarısız oldu: ${error.message}`;
        logCallback(summary, 'error');
        
        // DÜZELTME: Hata durumunda da özet değişkeni güncelleniyor.
        latestSummary = summary;
        throw new Error(summary);
    }
}