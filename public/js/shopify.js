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
        
        // Using a different, more modern proxy designed for this purpose.
        const proxyUrl = 'https://proxy.cors.sh/';

        console.log(`Yeni proxy denemesi: ${proxyUrl}${targetUrl}`);
        
        try {
            const response = await fetch(`${proxyUrl}${targetUrl}`, {
                method: method,
                headers: {
                    // This specific proxy requires the API key to be sent in this header.
                    'x-cors-api-key': 'temp_1234567890', // Use a temporary key for this public proxy
                    'X-Shopify-Access-Token': config.shopifyToken,
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : null
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Proxy Hatası:', `Durum: ${response.status}`, errorText);
                throw new Error(`Proxy sunucusu hata döndürdü. Durum: ${response.status}`);
            }

            const responseText = await response.text();
            if (!responseText) {
                console.log('Proxy boş yanıt döndürdü.');
                return null;
            }
            
            console.log('Bağlantı başarılı!');
            return JSON.parse(responseText);

        } catch (error) {
            console.error('Ağ veya Fetch hatası:', error);
            throw new Error(`Shopify API'ye ulaşılamadı: ${error.message}`);
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
