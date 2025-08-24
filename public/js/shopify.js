// shopify.js - Shopify API işlemleri
class ShopifyService {
    constructor() {
        this.apiVersion = '2024-07';
    }
    
    async makeRequest(endpoint, method = 'GET', data = null) {
        const config = window.configService.getConfig();
        if (!config.shopifyUrl || !config.shopifyToken) {
            throw new Error('Shopify ayarları eksik. Lütfen yapılandırma sayfasını kontrol edin.');
        }

        const targetUrl = `https://${config.shopifyUrl}/admin/api/${this.apiVersion}${endpoint}`;
        
        // Using a more robust proxy that allows forwarding headers.
        const proxyUrl = `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(targetUrl)}`;

        try {
            const response = await fetch(proxyUrl, {
                method: method,
                headers: {
                    // This header is now sent to the proxy, which should forward it to Shopify.
                    'X-Shopify-Access-Token': config.shopifyToken,
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : null
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Shopify API Hatası:', errorText);
                throw new Error(`Shopify API'den geçersiz yanıt alındı. Durum: ${response.status}. Yanıt: ${errorText.substring(0, 100)}`);
            }

            // If the response is empty, return null
            const responseText = await response.text();
            if (!responseText) {
                return null;
            }

            return JSON.parse(responseText);

        } catch (error) {
            console.error("Proxy veya ağ hatası:", error);
            throw new Error(`İstek gönderilemedi: ${error.message}`);
        }
    }
    
    async checkConnection() {
        try {
            // This endpoint requires authentication.
            const response = await this.makeRequest('/shop.json');
            return response ? response.shop : null;
        } catch (error) {
            console.error("Shopify bağlantı kontrolü hatası:", error);
            throw error;
        }
    }
    
    async getAllProducts() {
        try {
            const response = await this.makeRequest('/products.json?limit=250');
            return response ? response.products : [];
        } catch (error) {
            console.error("Shopify ürünleri alınamadı:", error);
            throw new Error(`Ürünler getirilemedi: ${error.message}`);
        }
    }
}
