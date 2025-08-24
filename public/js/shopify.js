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

        // A list of proxies to try in order.
        const proxies = [
            `https://cors.sh/${targetUrl}`, // Uses its own header system
            `https://thingproxy.freeboard.io/fetch/${targetUrl}`
        ];

        for (let i = 0; i < proxies.length; i++) {
            const proxyUrl = proxies[i];
            console.log(`Proxy denemesi (${i + 1}/${proxies.length}): ${proxyUrl}`);

            try {
                const headers = {
                    'X-Shopify-Access-Token': config.shopifyToken,
                    'Content-Type': 'application/json'
                };

                // cors.sh requires headers to be prefixed
                if (proxyUrl.includes('cors.sh')) {
                    headers['x-cors-headers'] = JSON.stringify({
                        'X-Shopify-Access-Token': config.shopifyToken,
                        'Content-Type': 'application/json'
                    });
                }
                
                const response = await fetch(proxyUrl, {
                    method: method,
                    headers: headers,
                    body: data ? JSON.stringify(data) : null
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Proxy ${proxyUrl} ile hata:`, errorText);
                    // Don't throw yet, try the next proxy
                    continue;
                }

                const responseText = await response.text();
                if (!responseText) {
                    console.log(`Proxy ${proxyUrl} boş yanıt döndürdü.`);
                    return null;
                }
                
                console.log(`Proxy ${proxyUrl} ile bağlantı başarılı!`);
                return JSON.parse(responseText);

            } catch (error) {
                console.error(`Proxy ${proxyUrl} ile ağ hatası:`, error);
                // Try the next proxy
            }
        }

        // If all proxies failed
        throw new Error('Tüm proxy denemeleri başarısız oldu. Shopify API\'ye ulaşılamıyor.');
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
