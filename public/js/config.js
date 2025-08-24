// config.js - Yapılandırma yönetimi
class ConfigService {
    constructor() {
        this.config = {};
        this.loadConfig();
    }
    
    loadConfig() {
        this.config = {
            shopifyUrl: localStorage.getItem('shopify_url') || '',
            shopifyAdminToken: localStorage.getItem('shopify_admin_token') || '',
            shopifyStorefrontToken: localStorage.getItem('shopify_storefront_token') || '',
            xmlUrl: localStorage.getItem('xml_url') || ''
        };
        return this.config;
    }
    
    saveConfig(config) {
        localStorage.setItem('shopify_url', config.shopifyUrl || '');
        localStorage.setItem('shopify_admin_token', config.shopifyAdminToken || '');
        localStorage.setItem('shopify_storefront_token', config.shopifyStorefrontToken || '');
        localStorage.setItem('xml_url', config.xmlUrl || '');
        this.loadConfig(); // Update internal state
    }
    
    setConfig(config) {
        if (config.shopifyUrl) this.config.shopifyUrl = config.shopifyUrl;
        if (config.shopifyAdminToken) this.config.shopifyAdminToken = config.shopifyAdminToken;
        if (config.shopifyStorefrontToken) this.config.shopifyStorefrontToken = config.shopifyStorefrontToken;
        if (config.xmlUrl) this.config.xmlUrl = config.xmlUrl;
    }
    
    getConfig() {
        return this.config;
    }
    
    getShopifyHeaders() {
        return {
            'X-Shopify-Access-Token': this.config.shopifyAdminToken,
            'Content-Type': 'application/json'
        };
    }
    
    isConfigured() {
        return this.config.shopifyUrl && (this.config.shopifyAdminToken || this.config.shopifyStorefrontToken) && this.config.xmlUrl;
    }
}
