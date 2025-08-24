import { getProductsFromXml } from './xmlService.js';
import { findProductByHandle, createShopifyProduct, updateShopifyProduct } from './shopifyService.js';
import { updateProductSheetWithNewItems } from './googleSheetsService.js';
import { Product } from '../types/product.d';

// YENİ: Son senkronizasyon özetini saklamak için bir değişken
let latestSummary = "Henüz bir senkronizasyon tamamlanmadı.";

// YENİ: Saklanan özeti döndüren ve export edilen fonksiyon
export function getLatestSyncSummary(): string {
    return latestSummary;
}

export interface SyncOptions {
    full: boolean;
    price: boolean;
    inventory: boolean;
    details: boolean;
    images: boolean;
}

export async function runSync(
    logCallback: (message: string, level: 'info' | 'success' | 'error' | 'warn') => void,
    options: SyncOptions = { full: true, price: false, inventory: false, details: false, images: false }
): Promise<string> {
    logCallback('Senkronizasyon başlatıldı...', 'warn');
    const startTime = Date.now();

    try {
        const productsFromXml: Product[] = await getProductsFromXml(logCallback);
        logCallback(`XML kaynağından ${productsFromXml.length} ana ürün bulundu.`, 'info');

        // Google Sheet güncellemesi sadece tam senkronizasyonda mantıklı
        if (options.full) {
            try {
                await updateProductSheetWithNewItems(productsFromXml, logCallback);
            } catch (googleError: any) {
                logCallback(`Google Sheet güncellenirken bir hata oluştu: ${googleError.message}`, 'error');
            }
        }

        let createdCount = 0;
        let updatedCount = 0;

        for (const product of productsFromXml) {
            try {
                const existingProduct = await findProductByHandle(product.handle);
                if (existingProduct) {
                    logCallback(`Ürün bulundu, güncelleniyor: '${product.title}'`, 'info');
                    // Seçenekleri güncelleme fonksiyonuna iletiyoruz
                    await updateShopifyProduct(existingProduct.id, existingProduct.variants, product, options, logCallback);
                    updatedCount++;
                } else {
                    logCallback(`Yeni ürün oluşturuluyor: '${product.title}'`, 'info');
                    // Yeni ürünler her zaman tam olarak oluşturulur
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
        
        latestSummary = summary;
        return summary;

    } catch (error: any) {
        const summary = `Senkronizasyon başarısız oldu: ${error.message}`;
        logCallback(summary, 'error');
        
        latestSummary = summary;
        throw new Error(summary);
    }
}
