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
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        
        console.log(`Proxy üzerinden istek gönderiliyor: ${proxyUrl}`);

        try {
            const response = await fetch(proxyUrl, {
                method: method,
                headers: {
                    'X-Shopify-Access-Token': config.shopifyToken,
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : null
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Shopify API Hatası:', `Durum: ${response.status}`, errorText);
                throw new Error(`Proxy sunucusu hata döndürdü. Durum: ${response.status}.`);
            }

            const responseText = await response.text();
            if (!responseText) {
                return null; // Boş yanıtlar geçerli olabilir
            }
            
            return JSON.parse(responseText);

        } catch (error) {
            console.error('Ağ veya Fetch hatası:', error);
            throw new Error(`Shopify API'ye ulaşılamadı: ${error.message}. Ağ bağlantınızı kontrol edin.`);
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
