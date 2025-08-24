// shopify.js - Shopify API işlemleri
class ShopifyService {
    constructor() {
        this.apiVersion = '2024-07';
    }
    
    async makeRequest(endpoint, method = 'GET', data = null) {
        if (!window.appConfig.isConfigured()) {
            throw new Error('Shopify ayarları yapılandırılmamış');
        }
        
        const url = `${window.appConfig.getShopifyApiUrl()}${endpoint}`;
        const options = {
            method: method,
            headers: window.appConfig.getShopifyHeaders(),
            mode: 'cors'
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`Shopify API Error: ${response.status} - ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Shopify API Request Failed:', error);
            throw error;
        }
    }
    
    async checkConnection() {
        try {
            await this.makeRequest('/shop.json');
            return { success: true, message: 'Başarılı' };
        } catch (error) {
            return { success: false, message: 'Bağlantı Hatası' };
        }
    }
    
    async getShopInfo() {
        try {
            const response = await this.makeRequest('/shop.json');
            return {
                success: true,
                name: response.shop.name,
                email: response.shop.email
            };
        } catch (error) {
            return { success: false };
        }
    }
    
    async getProductCount() {
        try {
            const response = await this.makeRequest('/products/count.json');
            return response.count;
        } catch (error) {
            return 0;
        }
    }
    
    async findProductByHandle(handle) {
        try {
            const response = await this.makeRequest(`/products.json?handle=${handle}&fields=id,handle,variants`);
            return response.products.length > 0 ? response.products[0] : null;
        } catch (error) {
            return null;
        }
    }
    
    async createProduct(product) {
        try {
            const response = await this.makeRequest('/products.json', 'POST', { product });
            return response.product;
        } catch (error) {
            throw new Error(`Ürün oluşturulamadı: ${error.message}`);
        }
    }
    
    async updateProduct(productId, productData) {
        try {
            const response = await this.makeRequest(`/products/${productId}.json`, 'PUT', { product: productData });
            return response.product;
        } catch (error) {
            throw new Error(`Ürün güncellenemedi: ${error.message}`);
        }
    }
    
    async updateVariant(variantId, variantData) {
        try {
            const response = await this.makeRequest(`/variants/${variantId}.json`, 'PUT', { variant: variantData });
            return response.variant;
        } catch (error) {
            throw new Error(`Varyant güncellenemedi: ${error.message}`);
        }
    }
    
    async createVariant(productId, variantData) {
        try {
            const response = await this.makeRequest(`/products/${productId}/variants.json`, 'POST', { variant: variantData });
            return response.variant;
        } catch (error) {
            throw new Error(`Varyant oluşturulamadı: ${error.message}`);
        }
    }
}

// Global Shopify service instance
window.shopifyService = new ShopifyService();
