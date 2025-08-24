// config.js - Yapılandırma yönetimi
class Config {
    constructor() {
        this.loadConfig();
    }
    
    loadConfig() {
        this.shopifyStoreUrl = localStorage.getItem('shopify_store_url') || '';
        this.shopifyToken = localStorage.getItem('shopify_token') || '';
        this.xmlFeedUrl = localStorage.getItem('xml_feed_url') || '';
    }
    
    saveConfig(shopifyStoreUrl, shopifyToken, xmlFeedUrl) {
        localStorage.setItem('shopify_store_url', shopifyStoreUrl);
        localStorage.setItem('shopify_token', shopifyToken);
        localStorage.setItem('xml_feed_url', xmlFeedUrl);
        
        this.shopifyStoreUrl = shopifyStoreUrl;
        this.shopifyToken = shopifyToken;
        this.xmlFeedUrl = xmlFeedUrl;
    }
    
    getShopifyHeaders() {
        return {
            'X-Shopify-Access-Token': this.shopifyToken,
            'Content-Type': 'application/json'
        };
    }
    
    getShopifyApiUrl() {
        return `https://${this.shopifyStoreUrl}/admin/api/2024-07`;
    }
    
    isConfigured() {
        return this.shopifyStoreUrl && this.shopifyToken && this.xmlFeedUrl;
    }
}

// Global config instance
window.appConfig = new Config();
