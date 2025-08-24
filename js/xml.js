// xml.js - XML işlemleri  
class XMLService {
    constructor() {
        this.parser = new DOMParser();
    }
    
    async fetchXMLData() {
        const config = window.configService.getConfig();
        if (!config.xmlUrl) {
            throw new Error('XML URL yapılandırılmamış');
        }
        
        const proxies = [
            'https://api.codetabs.com/v1/proxy/?quest=',
            'https://api.allorigins.win/raw?url='
        ];
        
        for (const proxy of proxies) {
            try {
                const proxyUrl = `${proxy}${encodeURIComponent(config.xmlUrl)}`;
                const response = await fetch(proxyUrl);
                
                if (response.ok) {
                    const xmlText = await response.text();
                    if (xmlText && xmlText.trim().length > 0) {
                        return xmlText;
                    }
                }
            } catch (error) {
                continue;
            }
        }
        
        throw new Error('XML verisi alınamadı');
    }
    
    async parseXMLToProducts(xmlData) {
        try {
            const doc = this.parser.parseFromString(xmlData, 'text/xml');
            
            if (doc.documentElement.nodeName === 'parsererror') {
                throw new Error('XML parse hatası');
            }
            
            const products = [];
            const productNodes = doc.getElementsByTagName('product') || 
                               doc.getElementsByTagName('item') ||
                               doc.getElementsByTagName('entry');
            
            if (productNodes.length === 0) {
                throw new Error('XML\'de ürün bulunamadı');
            }
            
            for (let i = 0; i < productNodes.length; i++) {
                const node = productNodes[i];
                const product = this.parseProductNode(node);
                if (product) {
                    products.push(product);
                }
            }
            
            return products;
            
        } catch (error) {
            throw new Error(`XML parse hatası: ${error.message}`);
        }
    }
    
    parseProductNode(node) {
        const product = {};
        
        // Temel alanları al
        const getElementText = (tagName) => {
            const element = node.getElementsByTagName(tagName)[0];
            return element ? element.textContent.trim() : null;
        };
        
        product.title = getElementText('title') || getElementText('name');
        product.price = getElementText('price');
        product.sku = getElementText('sku') || getElementText('id');
        product.description = getElementText('description');
        product.category = getElementText('category');
        
        if (product.price) {
            product.price = parseFloat(product.price.replace(/[^\d.,]/g, '').replace(',', '.'));
        }
        
        return product.title ? product : null;
    }
}

// Global instance
window.xmlService = new XMLService();