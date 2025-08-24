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

        // JSONP callback yaklaşımı deneyelim
        if (method === 'GET' && endpoint.includes('shop.json')) {
            return await this.makeJSONPRequest(config, endpoint);
        }

        // Farklı proxy servisleri deneyelim
        const proxyServices = [
            `https://corsproxy.io/?${encodeURIComponent(`https://${config.shopifyUrl}/admin/api/${this.apiVersion}${endpoint}`)}`,
            `https://cors-anywhere.herokuapp.com/https://${config.shopifyUrl}/admin/api/${this.apiVersion}${endpoint}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://${config.shopifyUrl}/admin/api/${this.apiVersion}${endpoint}`)}`
        ];

        for (let i = 0; i < proxyServices.length; i++) {
            try {
                console.log(`Proxy ${i + 1} deneniyor: ${proxyServices[i]}`);
                
                const response = await fetch(proxyServices[i], {
                    method: method,
                    headers: {
                        'X-Shopify-Access-Token': config.shopifyToken,
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: data ? JSON.stringify(data) : null
                });

                if (response.ok) {
                    const responseText = await response.text();
                    if (!responseText) return null;
                    return JSON.parse(responseText);
                }
            } catch (error) {
                console.log(`Proxy ${i + 1} başarısız: ${error.message}`);
                if (i === proxyServices.length - 1) {
                    throw new Error(`Tüm proxy servisleri başarısız oldu. Son hata: ${error.message}`);
                }
            }
        }
    }

    async makeJSONPRequest(config, endpoint) {
        return new Promise((resolve, reject) => {
            const callbackName = 'shopifyCallback' + Date.now();
            const script = document.createElement('script');
            const url = `https://${config.shopifyUrl}/admin/api/${this.apiVersion}${endpoint}?callback=${callbackName}`;
            
            // Global callback fonksiyonu oluştur
            window[callbackName] = function(data) {
                document.head.removeChild(script);
                delete window[callbackName];
                resolve(data);
            };
            
            script.onerror = function() {
                document.head.removeChild(script);
                delete window[callbackName];
                reject(new Error('JSONP isteği başarısız'));
            };
            
            script.src = url;
            document.head.appendChild(script);
            
            // Timeout ekle
            setTimeout(() => {
                if (window[callbackName]) {
                    document.head.removeChild(script);
                    delete window[callbackName];
                    reject(new Error('JSONP isteği zaman aşımına uğradı'));
                }
            }, 10000);
        });
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
