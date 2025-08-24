// js/xml.js - XML işleme servisi

class XMLService {
    constructor() {}

    async fetchAndParseXML() {
        const config = window.configService.getConfig();
        if (!config.xmlUrl) {
            throw new Error('XML URL ayarlanmamış.');
        }

        console.log('XML URL:', config.xmlUrl);

        // Önce doğrudan deneme (eğer CORS yoksa)
        try {
            console.log('Doğrudan XML erişimi deneniyor...');
            const response = await fetch(config.xmlUrl);
            if (response.ok) {
                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "application/xml");

                const parserError = xmlDoc.querySelector("parsererror");
                if (!parserError) {
                    console.log('Doğrudan XML erişimi başarılı!');
                    return xmlDoc;
                }
            }
        } catch (error) {
            console.log('Doğrudan erişim başarısız, proxy deneniyor...', error.message);
        }

        // Proxy'ler ile deneme
        const proxies = [
            // Kendi Netlify proxy'miz (en güvenilir)
            { url: '/.netlify/functions/xml-proxy?url=', type: 'query' },
            // Diğer public proxy'ler
            { url: 'https://api.allorigins.win/raw?url=', type: 'path' },
            { url: 'https://cors-anywhere.herokuapp.com/', type: 'path' },
            { url: 'https://api.codetabs.com/v1/proxy/?quest=', type: 'path' }
        ];

        for (const proxy of proxies) {
            try {
                const proxyUrl = proxy.type === 'query' 
                    ? `${proxy.url}${encodeURIComponent(config.xmlUrl)}`
                    : `${proxy.url}${encodeURIComponent(config.xmlUrl)}`;
                    
                console.log(`Proxy deneniyor: ${proxy.url}`);
                console.log(`Tam URL: ${proxyUrl}`);
                
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/xml, text/xml, */*'
                    }
                });

                console.log(`Proxy ${proxy.url} yanıtı:`, response.status, response.statusText);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const xmlText = await response.text();
                console.log(`XML metin uzunluğu: ${xmlText.length} karakter`);
                
                if (xmlText.length < 10) {
                    throw new Error('XML çok kısa, geçersiz olabilir');
                }

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "application/xml");

                // Check for parsing errors
                const parserError = xmlDoc.querySelector("parsererror");
                if (parserError) {
                    console.error("XML Ayrıştırma Hatası:", parserError.textContent);
                    throw new Error('XML dosyası ayrıştırılamadı. Formatını kontrol edin.');
                }
                
                console.log(`Proxy ${proxy.url} ile XML başarıyla alındı!`);
                return xmlDoc;

            } catch (error) {
                console.warn(`Proxy ${proxy.url} ile deneme başarısız:`, error.message);
                continue; // Try next proxy
            }
        }

        throw new Error('Tüm proxy denemeleri başarısız oldu. XML kaynağına ulaşılamıyor.');
    }

    async checkConnection() {
        try {
            const xmlDoc = await this.fetchAndParseXML();
            // Basic check: see if we have a root element
            if (xmlDoc && xmlDoc.documentElement) {
                return { success: true, rootElement: xmlDoc.documentElement.tagName };
            }
            return { success: false, message: 'XML belgesi boş veya geçersiz.' };
        } catch (error) {
            throw error;
        }
    }

    async getXMLStats() {
        try {
            const xmlDoc = await this.fetchAndParseXML();
            const products = xmlDoc.getElementsByTagName('urun'); // 'urun' tag'ını varsayıyoruz
            let variantCount = 0;
            for(let product of products) {
                const variants = product.getElementsByTagName('variant'); // 'variant' tag'ını varsayıyoruz
                variantCount += variants.length;
            }
            return {
                productCount: products.length,
                variantCount: variantCount
            };
        } catch (error) {
            throw new Error(`XML istatistikleri alınamadı: ${error.message}`);
        }
    }
}

// Global instance
window.xmlService = new XMLService();
