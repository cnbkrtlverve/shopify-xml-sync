// shopify.js - Shopify API işlemleri
class ShopifyService {
    constructor() {
        this.apiVersion = '2024-07';
    }
    
    async makeRequest(endpoint, method = 'GET', data = null) {
        const config = window.configService.getConfig();
        if (!config.shopifyUrl) {
            throw new Error('Shopify URL eksik. Lütfen yapılandırma sayfasını kontrol edin.');
        }

        // Eğer shop.json ise ve Storefront token varsa, Storefront API kullan (CORS yok)
        if (endpoint === '/shop.json' && config.shopifyStorefrontToken) {
            return await this.getShopInfoViaStorefront(config);
        }

        // Admin API için Admin token gerekli
        if (!config.shopifyAdminToken) {
            throw new Error('Shopify Admin Access Token eksik. Lütfen yapılandırma sayfasını kontrol edin.');
        }

        // Diğer istekler için Admin API
        const targetUrl = `https://${config.shopifyUrl}/admin/api/${this.apiVersion}${endpoint}`;
        
        console.log(`Doğrudan istek gönderiliyor: ${targetUrl}`);
        console.log("Bu isteğin başarılı olması için tarayıcınızda bir CORS eklentisinin aktif olması gerekir.");

        try {
            const response = await fetch(targetUrl, {
                method: method,
                headers: {
                    'X-Shopify-Access-Token': config.shopifyAdminToken,
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : null
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Shopify API Hatası:', `Durum: ${response.status}`, errorText);
                throw new Error(`Shopify API'den geçersiz yanıt alındı. Durum: ${response.status}. CORS eklentinizin aktif olduğundan emin olun.`);
            }

            const responseText = await response.text();
            if (!responseText) {
                return null; // Boş yanıtlar geçerli olabilir
            }
            
            return JSON.parse(responseText);

        } catch (error) {
            console.error('Ağ veya Fetch hatası:', error);
            throw new Error(`Shopify API'ye ulaşılamadı: ${error.message}. Ağ bağlantınızı ve CORS eklentinizi kontrol edin.`);
        }
    }

    async getShopInfoViaStorefront(config) {
        // Storefront API - CORS sorunu yok - basit test sorgusu
        const storefrontUrl = `https://${config.shopifyUrl}/api/2024-07/graphql.json`;
        
        console.log(`Storefront API kullanılıyor (CORS yok): ${storefrontUrl}`);

        // Storefront API'sinde 'shop' sorgusu yok, basit bir test için products sorgulayalım
        const query = `
            query {
                products(first: 1) {
                    edges {
                        node {
                            id
                            title
                        }
                    }
                }
            }
        `;

        try {
            const response = await fetch(storefrontUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Storefront-Access-Token': config.shopifyStorefrontToken
                },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error(`Storefront API hatası: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.errors) {
                throw new Error(`GraphQL hatası: ${result.errors[0].message}`);
            }

            // Bağlantı başarılı - mock shop bilgisi döndür
            console.log('Storefront API bağlantısı başarılı!', result.data);
            return {
                shop: {
                    name: config.shopifyUrl.replace('.myshopify.com', ''),
                    domain: config.shopifyUrl,
                    currency: 'TRY',
                    storefront_api: 'Bağlantı Başarılı'
                }
            };

        } catch (error) {
            console.error('Storefront API hatası:', error);
            throw error;
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
