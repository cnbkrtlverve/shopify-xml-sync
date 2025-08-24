// shopify.js - Shopify API işlemleri
class ShopifyService {

    /**
     * Backend API'ye istek gönderir.
     * @param {string} endpoint - /api/shopify'dan sonraki API yolu (örn: '/info', '/products')
     * @param {string} method - HTTP metodu
     * @param {object|null} data - Gönderilecek veri (body)
     * @returns {Promise<any>} - API'den gelen yanıt
     */
    async makeRequest(endpoint, method = 'GET', data = null) {
        // Basit API isteği
        const apiUrl = `/api/shopify${endpoint}`;
        console.log(`API isteği: ${method} ${apiUrl}`);

        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(apiUrl, options);

            if (!response.ok) {
                throw new Error(`HTTP hatası: ${response.status}`);
            }

            const responseText = await response.text();
            return responseText ? JSON.parse(responseText) : null;

        } catch (error) {
            console.error(`API hatası: ${apiUrl}`, error);
            throw error;
        }
    }

    /**
     * Shopify mağaza bağlantısını ve temel bilgileri kontrol eder.
     * @returns {Promise<object|null>} - Mağaza bilgileri veya null
     */
    async checkConnection() {
        try {
            const data = await this.makeRequest('/info');
            if (data && data.success) {
                return data.shop;
            }
            return { success: false, message: 'Bağlantı başarısız' };
        } catch (error) {
            console.error("Shopify bağlantı kontrolü hatası:", error);
            throw error;
        }
    }

    /**
     * Shopify'daki toplam ürün sayısını alır.
     * @returns {Promise<number>} - Toplam ürün sayısı
     */
    async getProductCount() {
        try {
            const data = await this.makeRequest('/info');
             // Backend /info endpoint'i { shop: {...}, productCount: ... } döndürüyor
            return data ? data.productCount : 0;
        } catch (error) {
            console.error("Shopify ürün sayısı alınamadı:", error);
            // Hata durumunda 0 döndürerek arayüzün bozulmasını engelle
            return 0;
        }
    }

    /**
     * Shopify'daki tüm ürünleri getirir.
     * @returns {Promise<Array>} - Ürün listesi
     */
    async getAllProducts() {
        try {
            console.log('Shopify ürünleri getiriliyor...');
            // Backend /products endpoint'i tüm ürünleri getirir
            const data = await this.makeRequest('/products');
            const products = data.products;
            console.log(`Toplam ${products.length} ürün getirildi.`);
            return products;
        } catch (error) {
            console.error("Shopify ürünleri alınamadı:", error);
            throw new Error(`Ürünler getirilemedi: ${error.message}`);
        }
    }
}
