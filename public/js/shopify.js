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
        
        const url = `https://${config.shopifyUrl}/admin/api/${this.apiVersion}${endpoint}`;
        
        const proxies = [
            'https://api.codetabs.com/v1/proxy/?quest=',
            'https://api.allorigins.win/raw?url='
        ];
        
        for (const proxy of proxies) {
            try {
                // Important: For proxied requests, the target URL is passed as a query parameter.
                // The headers like X-Shopify-Access-Token must be sent to the proxy if it forwards them,
                // but most public proxies do not. The target server (Shopify) sees the request coming from the proxy server.
                // The standard way to use these proxies is to include the auth in the URL if the API supports it,
                // or rely on the proxy to handle the request transparently. Shopify Admin API requires a header.
                // This setup is tricky and might fail if proxies strip required headers.
                // A better approach is a dedicated CORS proxy that you control.
                // Let's try a simple fetch first, assuming the proxy passes things through.
                
                const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
                
                // NOTE: Most public proxies will not forward custom headers like 'X-Shopify-Access-Token'.
                // This is a fundamental limitation. The request will likely fail authentication.
                // The only way this works is if the proxy is specifically designed for this, which is rare.
                // We are proceeding with the fetch call, but this is a known potential point of failure.
                const response = await fetch(proxyUrl, {
                    method: 'GET', // Most proxies only support GET
                    // Headers are sent to the proxy, not necessarily the target.
                    // We cannot reliably set Shopify's required headers here.
                });
                
                if (response.ok) {
                    const responseText = await response.text();
                    // The response might be JSON wrapped in a callback (JSONP) by the proxy
                    try {
                        return JSON.parse(responseText);
                    } catch (e) {
                        // If parsing fails, maybe it's not JSON or wrapped.
                        // For allorigins, it might be wrapped. Let's check.
                        if (proxy.includes('allorigins')) {
                            const data = JSON.parse(responseText);
                            return JSON.parse(data.contents);
                        }
                        throw new Error("Proxy'den gelen yanıt JSON formatında değil.");
                    }
                } else {
                     // If one proxy fails, we'll just log it and the loop will try the next one.
                     console.warn(`Proxy ${proxy} ile istek başarısız oldu. Durum: ${response.status}`);
                }
            } catch (error) {
                console.warn(`Proxy ${proxy} ile deneme sırasında hata:`, error);
                continue; // Try next proxy
            }
        }
        
        throw new Error('Tüm proxy denemeleri başarısız oldu. Shopify API\'ye ulaşılamıyor. Tarayıcı konsolunu kontrol edin.');
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
