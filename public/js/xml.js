// js/xml.js - XML işleme servisi

class XMLService {
    constructor() {}

    async fetchAndParseXML() {
        const config = window.configService.getConfig();
        if (!config.xmlUrl) {
            throw new Error('XML URL ayarlanmamış.');
        }

        const proxies = [
            'https://api.codetabs.com/v1/proxy/?quest=',
            'https://api.allorigins.win/raw?url='
        ];

        for (const proxy of proxies) {
            try {
                const proxyUrl = `${proxy}${encodeURIComponent(config.xmlUrl)}`;
                const response = await fetch(proxyUrl);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "application/xml");

                // Check for parsing errors
                const parserError = xmlDoc.querySelector("parsererror");
                if (parserError) {
                    console.error("XML Ayrıştırma Hatası:", parserError.textContent);
                    throw new Error('XML dosyası ayrıştırılamadı. Formatını kontrol edin.');
                }
                
                return xmlDoc;

            } catch (error) {
                console.warn(`Proxy ${proxy} ile deneme başarısız:`, error);
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
