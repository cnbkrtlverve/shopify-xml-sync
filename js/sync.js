// sync.js - Senkronizasyon işlemleri
class SyncService {
    constructor() {
        this.isRunning = false;
        this.logCallback = null;
    }
    
    setLogCallback(callback) {
        this.logCallback = callback;
    }
    
    log(message, level = 'info') {
        if (this.logCallback) {
            this.logCallback(message, level);
        }
        console.log(`[${level.toUpperCase()}] ${message}`);
    }
    
    async runSync(options = {}) {
        if (this.isRunning) {
            this.log('Senkronizasyon zaten çalışıyor!', 'warn');
            return;
        }
        
        this.isRunning = true;
        this.log('Senkronizasyon başlatıldı...', 'warn');
        const startTime = Date.now();
        
        try {
            // XML'den ürünleri al
            this.log('XML verisi getiriliyor...', 'info');
            const xmlData = await window.xmlService.fetchXMLData();
            const products = window.xmlService.parseXMLToProducts(xmlData);
            this.log(`XML'den ${products.length} ürün bulundu.`, 'info');
            
            let createdCount = 0;
            let updatedCount = 0;
            let errorCount = 0;
            
            for (let i = 0; i < products.length; i++) {
                const product = products[i];
                
                try {
                    this.log(`İşleniyor: ${product.title} (${i + 1}/${products.length})`, 'info');
                    
                    // Mevcut ürünü kontrol et
                    const existingProduct = await window.shopifyService.findProductByHandle(product.handle);
                    
                    if (existingProduct) {
                        // Ürün güncelle
                        await this.updateExistingProduct(existingProduct, product, options);
                        updatedCount++;
                        this.log(`Güncellendi: ${product.title}`, 'success');
                    } else {
                        // Yeni ürün oluştur
                        await window.shopifyService.createProduct(product);
                        createdCount++;
                        this.log(`Oluşturuldu: ${product.title}`, 'success');
                    }
                    
                    // Kısa bir bekleme ekle (rate limiting için)
                    await this.sleep(200);
                    
                } catch (error) {
                    errorCount++;
                    this.log(`Hata - ${product.title}: ${error.message}`, 'error');
                }
            }
            
            const duration = (Date.now() - startTime) / 1000;
            const summary = `Senkronizasyon tamamlandı! Süre: ${duration.toFixed(2)}s. Oluşturulan: ${createdCount}, Güncellenen: ${updatedCount}, Hata: ${errorCount}`;
            this.log(summary, 'success');
            
        } catch (error) {
            this.log(`Senkronizasyon başarısız: ${error.message}`, 'error');
        } finally {
            this.isRunning = false;
        }
    }
    
    async updateExistingProduct(existingProduct, newProduct, options) {
        const updates = {};
        
        // Hangi alanların güncelleneceğini belirle
        if (options.full || options.details) {
            updates.title = newProduct.title;
            updates.body_html = newProduct.body_html;
            updates.vendor = newProduct.vendor;
            updates.product_type = newProduct.product_type;
            updates.tags = newProduct.tags;
        }
        
        if (options.full || options.images) {
            if (newProduct.images && newProduct.images.length > 0) {
                updates.images = newProduct.images;
            }
        }
        
        // Ana ürünü güncelle
        if (Object.keys(updates).length > 0) {
            await window.shopifyService.updateProduct(existingProduct.id, updates);
        }
        
        // Varyantları güncelle
        for (const newVariant of newProduct.variants) {
            const existingVariant = existingProduct.variants.find(v => v.sku === newVariant.sku);
            
            if (existingVariant) {
                const variantUpdates = {};
                
                if (options.full || options.price) {
                    variantUpdates.price = newVariant.price.toString();
                }
                
                if (options.full || options.inventory) {
                    variantUpdates.inventory_quantity = newVariant.inventory_quantity;
                }
                
                if (Object.keys(variantUpdates).length > 0) {
                    await window.shopifyService.updateVariant(existingVariant.id, variantUpdates);
                }
            } else if (options.full) {
                // Sadece tam senkronizasyonda yeni varyant ekle
                await window.shopifyService.createVariant(existingProduct.id, newVariant);
            }
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global sync service instance
window.syncService = new SyncService();
