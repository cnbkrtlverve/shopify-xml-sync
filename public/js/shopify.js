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
        
        console.log(`Doğrudan istek gönderiliyor (no-cors mode): ${targetUrl}`);

        try {
            // İlk olarak no-cors mode ile deneyelim
            const response = await fetch(targetUrl, {
                method: method,
                mode: 'no-cors',
                headers: {
                    'X-Shopify-Access-Token': config.shopifyToken,
                    'Content-Type': 'application/json'
                },
                body: data ? JSON.stringify(data) : null
            });

            // no-cors mode'da response body okuyamayız, bu yüzden farklı bir yaklaşım
            console.log('No-cors isteği gönderildi, response status:', response.status);
            
            // Eğer status 0 ise (opaque response), başka bir yöntem deneyelim
            if (response.type === 'opaque') {
                console.log('Opaque response alındı, iframe yaklaşımı deneniyor...');
                return await this.makeIframeRequest(config, endpoint);
            }

        } catch (error) {
            console.log('No-cors başarısız, alternatif yöntem deneniyor:', error.message);
        }

        // Alternatif yaklaşım: Doğrudan istek (CORS hatası alacağız ama denemeye değer)
        try {
            console.log('Doğrudan CORS isteği deneniyor...');
            const response = await fetch(targetUrl, {
                method: method,
                headers: {
                    'X-Shopify-Access-Token': config.shopifyToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: data ? JSON.stringify(data) : null
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const responseText = await response.text();
            if (!responseText) return null;
            return JSON.parse(responseText);

        } catch (error) {
            console.error('Tüm yöntemler başarısız:', error);
            throw new Error(`Shopify API'ye ulaşılamadı: ${error.message}. Lütfen ağ bağlantınızı kontrol edin.`);
        }
    }

    async makeIframeRequest(config, endpoint) {
        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            
            const targetUrl = `https://${config.shopifyUrl}/admin/api/${this.apiVersion}${endpoint}`;
            
            iframe.onload = function() {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const content = iframeDoc.body.textContent;
                    document.body.removeChild(iframe);
                    
                    if (content) {
                        resolve(JSON.parse(content));
                    } else {
                        reject(new Error('Iframe içeriği boş'));
                    }
                } catch (error) {
                    document.body.removeChild(iframe);
                    reject(new Error('Iframe verisi okunamadı: ' + error.message));
                }
            };
            
            iframe.onerror = function() {
                document.body.removeChild(iframe);
                reject(new Error('Iframe yüklenemedi'));
            };
            
            iframe.src = targetUrl;
            document.body.appendChild(iframe);
            
            // Timeout
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                    reject(new Error('Iframe isteği zaman aşımına uğradı'));
                }
            }, 15000);
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
