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
            console.log('XML Document:', xmlDoc);
            console.log('Root element:', xmlDoc.documentElement.tagName);
            
            // XML yapısını analiz et
            const rootElement = xmlDoc.documentElement;
            console.log('Root element children:', rootElement.children);
            
            // Farklı olası ürün tag'larını dene
            const possibleProductTags = ['urun', 'product', 'item', 'goods', 'products'];
            let products = null;
            let productTagName = '';
            
            for (const tagName of possibleProductTags) {
                const elements = xmlDoc.getElementsByTagName(tagName);
                if (elements.length > 0) {
                    products = elements;
                    productTagName = tagName;
                    console.log(`Ürün tag'ı bulundu: ${tagName}, sayı: ${elements.length}`);
                    break;
                }
            }
            
            if (!products || products.length === 0) {
                // Eğer hiçbir standart tag yoksa, root'un direct children'ını kontrol et
                const directChildren = Array.from(rootElement.children);
                console.log('Direct children:', directChildren.map(c => c.tagName));
                
                if (directChildren.length > 0) {
                    products = directChildren;
                    productTagName = directChildren[0].tagName;
                    console.log(`Root children kullanılıyor: ${productTagName}, sayı: ${directChildren.length}`);
                }
            }
            
            if (!products || products.length === 0) {
                console.warn('Hiç ürün bulunamadı!');
                return { productCount: 0, variantCount: 0, structure: 'Unknown' };
            }
            
            // İlk ürünün yapısını analiz et
            const firstProduct = products[0];
            console.log('İlk ürün yapısı:', firstProduct);
            console.log('İlk ürün children:', Array.from(firstProduct.children).map(c => ({
                tag: c.tagName,
                text: c.textContent?.substring(0, 50)
            })));
            
            // Varyant sayısını hesapla
            let variantCount = 0;
            const possibleVariantTags = ['variant', 'varyant', 'size', 'color', 'option'];
            
            for (let product of products) {
                for (const variantTag of possibleVariantTags) {
                    const variants = product.getElementsByTagName(variantTag);
                    if (variants.length > 0) {
                        variantCount += variants.length;
                        break; // İlk bulunan variant tag'ını kullan
                    }
                }
            }
            
            return {
                productCount: products.length,
                variantCount: variantCount,
                productTagName: productTagName,
                structure: this.analyzeProductStructure(firstProduct)
            };
        } catch (error) {
            console.error('XML stats hatası:', error);
            throw new Error(`XML istatistikleri alınamadı: ${error.message}`);
        }
    }
    
    analyzeProductStructure(productElement) {
        if (!productElement) return {};
        
        const structure = {};
        const children = Array.from(productElement.children);
        
        children.forEach(child => {
            const tagName = child.tagName.toLowerCase();
            const textContent = child.textContent?.trim();
            
            // Shopify ile eşleşebilecek alanları belirle
            if (tagName.includes('name') || tagName.includes('title') || tagName.includes('ad')) {
                structure.title = { tag: child.tagName, sample: textContent?.substring(0, 50) };
            } else if (tagName.includes('price') || tagName.includes('fiyat')) {
                structure.price = { tag: child.tagName, sample: textContent };
            } else if (tagName.includes('image') || tagName.includes('foto') || tagName.includes('resim')) {
                structure.image = { tag: child.tagName, sample: textContent?.substring(0, 100) };
            } else if (tagName.includes('description') || tagName.includes('aciklama') || tagName.includes('desc')) {
                structure.description = { tag: child.tagName, sample: textContent?.substring(0, 100) };
            } else if (tagName.includes('stock') || tagName.includes('stok') || tagName.includes('qty')) {
                structure.inventory = { tag: child.tagName, sample: textContent };
            } else if (tagName.includes('category') || tagName.includes('kategori') || tagName.includes('cat')) {
                structure.category = { tag: child.tagName, sample: textContent };
            } else if (tagName.includes('tag') || tagName.includes('etiket') || tagName.includes('label')) {
                structure.tags = { tag: child.tagName, sample: textContent };
            } else if (tagName.includes('sku') || tagName.includes('kod') || tagName.includes('code')) {
                structure.sku = { tag: child.tagName, sample: textContent };
            }
        });
        
        return structure;
    }
}

// Global instance
window.xmlService = new XMLService();
