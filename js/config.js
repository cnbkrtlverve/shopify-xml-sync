// config.js - Yapılandırma yönetimi
class ConfigService {
    constructor() {
        this.config = {};
        this.loadConfig();
    }
    
    loadConfig() {
        this.config = {
            shopifyUrl: localStorage.getItem('shopify_url') || '',
            shopifyToken: localStorage.getItem('shopify_token') || '',
            xmlUrl: localStorage.getItem('xml_url') || ''
        };
    }
    
    saveConfig(config) {
        localStorage.setItem('shopify_url', config.shopifyUrl);
        localStorage.setItem('shopify_token', config.shopifyToken);
        localStorage.setItem('xml_url', config.xmlUrl);
        this.loadConfig(); // Update internal state
    }
    
    setConfig(config) {
        if (config.shopifyUrl) this.config.shopifyUrl = config.shopifyUrl;
        if (config.shopifyToken) this.config.shopifyToken = config.shopifyToken;
        if (config.xmlUrl) this.config.xmlUrl = config.xmlUrl;
    }
    
    getConfig() {
        return this.config;
    }
    
    getShopifyHeaders() {
        return {
            'X-Shopify-Access-Token': this.config.shopifyToken,
            'Content-Type': 'application/json'
        };
    }
    
    isConfigured() {
        return this.config.shopifyUrl && this.config.shopifyToken && this.config.xmlUrl;
    }
}

// Global config instance
window.configService = new ConfigService();
