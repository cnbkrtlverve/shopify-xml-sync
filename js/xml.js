// xml.js - XML işlemleri
class XMLService {
    constructor() {
        this.parser = new DOMParser();
    }
    
    async fetchXMLData() {
        if (!window.appConfig.xmlFeedUrl) {
            throw new Error('XML Feed URL yapılandırılmamış');
        }
        
        try {
            // CORS proxy kullanarak XML'i getir
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(window.appConfig.xmlFeedUrl)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.contents;
        } catch (error) {
            console.error('XML Fetch Error:', error);
            throw new Error(`XML verisi alınamadı: ${error.message}`);
        }
    }
    
    async checkConnection() {
        try {
            await this.fetchXMLData();
            return { success: true, message: 'Başarılı' };
        } catch (error) {
            return { success: false, message: 'Bağlantı Hatası' };
        }
    }
    
    parseXMLToProducts(xmlString) {
        try {
            const xmlDoc = this.parser.parseFromString(xmlString, 'text/xml');
            const products = [];
            const urunler = xmlDoc.getElementsByTagName('Urun');
            
            for (let i = 0; i < urunler.length; i++) {
                const urun = urunler[i];
                const product = this.parseProduct(urun);
                if (product) {
                    products.push(product);
                }
            }
            
            return products;
        } catch (error) {
            console.error('XML Parse Error:', error);
            throw new Error(`XML ayrıştırılamadı: ${error.message}`);
        }
    }
    
    parseProduct(urunElement) {
        const getElementText = (element, tagName) => {
            const el = element.getElementsByTagName(tagName)[0];
            return el ? el.textContent.trim() : '';
        };
        
        const parsePrice = (priceString) => {
            if (!priceString) return 0;
            const cleanedString = priceString.replace(/\\./g, '').replace(',', '.');
            const price = parseFloat(cleanedString);
            return isNaN(price) ? 0 : price;
        };
        
        const urunId = getElementText(urunElement, 'id');
        const urunAdi = getElementText(urunElement, 'urunismi');
        const kategori = getElementText(urunElement, 'kategori_ismi');
        const aciklama = getElementText(urunElement, 'detayaciklama');
        const satisFiyati = parsePrice(getElementText(urunElement, 'satis_fiyati'));
        const indirimliFiyat = parsePrice(getElementText(urunElement, 'indirimli_fiyat'));
        
        if (!urunAdi) return null;
        
        const fiyat = indirimliFiyat > 0 ? indirimliFiyat : satisFiyati;
        
        // Varyantları işle
        const varyantlar = urunElement.getElementsByTagName('Varyant');
        const variants = [];
        const images = [];
        const optionValues = [];
        
        for (let j = 0; j < varyantlar.length; j++) {
            const varyant = varyantlar[j];
            const sku = getElementText(varyant, 'stok_kodu');
            const beden = getElementText(varyant, 'Varyant_deger');
            const stok = parseInt(getElementText(varyant, 'stok')) || 0;
            
            if (!sku) continue;
            
            optionValues.push(beden);
            variants.push({
                price: fiyat,
                sku: sku,
                inventory_quantity: stok,
                option1: beden,
                inventory_management: 'shopify'
            });
            
            // Resimleri topla
            const resimler = varyant.getElementsByTagName('resim');
            for (let k = 0; k < resimler.length; k++) {
                const resimUrl = resimler[k].textContent.trim();
                if (resimUrl && !images.find(img => img.src === resimUrl)) {
                    images.push({ src: resimUrl });
                }
            }
        }
        
        if (variants.length === 0) return null;
        
        // Handle oluştur
        const handle = this.slugify(urunAdi) + '-' + urunId;
        
        return {
            handle: handle,
            title: urunAdi,
            body_html: aciklama,
            vendor: 'Vervegrand',
            product_type: kategori.split('>').pop()?.trim() || 'Diğer',
            tags: kategori.split('>').map(t => t.trim()).join(','),
            options: [{ name: 'Beden', values: [...new Set(optionValues)] }],
            variants: variants,
            images: images
        };
    }
    
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }
    
    async getXMLStats() {
        try {
            const xmlData = await this.fetchXMLData();
            const xmlDoc = this.parser.parseFromString(xmlData, 'text/xml');
            const urunler = xmlDoc.getElementsByTagName('Urun');
            
            let variantCount = 0;
            for (let i = 0; i < urunler.length; i++) {
                const varyantlar = urunler[i].getElementsByTagName('Varyant');
                variantCount += varyantlar.length;
            }
            
            return {
                success: true,
                url: window.appConfig.xmlFeedUrl,
                productCount: urunler.length,
                variantCount: variantCount
            };
        } catch (error) {
            return {
                success: false,
                url: window.appConfig.xmlFeedUrl,
                productCount: 0,
                variantCount: 0,
                error: error.message
            };
        }
    }
}

// Global XML service instance
window.xmlService = new XMLService();
