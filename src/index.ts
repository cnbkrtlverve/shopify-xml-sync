import axios from 'axios';
import { ShopifyService } from './services/shopifyService';
import { XmlService } from './services/xmlService';
import { Product } from './types/product';
import { SHOPIFY_API_URL, SHOPIFY_ACCESS_TOKEN, XML_FEED_URL } from './config';

const shopifyService = new ShopifyService(SHOPIFY_API_URL, SHOPIFY_ACCESS_TOKEN);
const xmlService = new XmlService(XML_FEED_URL);

async function syncProducts() {
    try {
        const xmlData = await xmlService.fetchXmlData();
        const products: Product[] = xmlService.parseXmlToProducts(xmlData);

        for (const product of products) {
            const existingProduct = await shopifyService.fetchProducts(product.id);
            if (existingProduct) {
                await shopifyService.updateProduct(product.id, product);
            } else {
                await shopifyService.createProduct(product);
            }
        }
    } catch (error) {
        console.error('Error during synchronization:', error);
    }
}

async function main() {
    console.log('Starting product synchronization...');
    await syncProducts();
    console.log('Product synchronization completed.');
}

main();