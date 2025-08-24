// shopify.js - Shopify API işlemleri
class ShopifyService {
    constructor() {
        this.apiVersion = '2024-07';
    }
    
    getTempConfig() {
        // Test sırasında geçici config kullan
        const saved = localStorage.getItem('temp_shopify_config');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // config.js'den al
        if (window.configService && window.configService.isConfigured()) {
            const config = window.configService.getConfig();
            return {
                shopifyUrl: config.shopifyUrl,
                shopifyToken: config.shopifyToken
            };
        }
        
        return {};
    }
    
    async makeRequest(endpoint, method = 'GET', data = null) {
        const tempConfig = this.getTempConfig();
        if (!tempConfig.shopifyUrl || !tempConfig.shopifyToken) {
            throw new Error('Shopify ayarları eksik');
        }
        
        const url = `https://${tempConfig.shopifyUrl}/admin/api/2024-07${endpoint}`;
        const headers = {
            'X-Shopify-Access-Token': tempConfig.shopifyToken,
            'Content-Type': 'application/json'
        };
        
        // CORS proxy'leri dene
        const proxies = [
            'https://api.codetabs.com/v1/proxy/?quest=',
            'https://api.allorigins.win/raw?url='
        ];
        
        for (const proxy of proxies) {
            try {
                const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('CORS hatası - tüm proxy\'ler başarısız');
    }
    
    async checkConnection() {
        try {
            const response = await this.makeRequest('/shop.json');
            return response && response.shop;
        } catch (error) {
            throw error;
        }
    }
    
    async getAllProducts() {
        try {
            const response = await this.makeRequest('/products.json?limit=250');
            return response.products || [];
        } catch (error) {
            throw new Error(`Ürünler getirilemedi: ${error.message}`);
        }
    }
}

// Global instance
window.shopifyService = new ShopifyService();