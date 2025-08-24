import dotenv from 'dotenv';

dotenv.config();

export const config = {
    shopify: {
        apiKey: process.env.SHOPIFY_API_KEY || 'your_api_key',
        apiSecret: process.env.SHOPIFY_API_SECRET || 'your_api_secret',
        accessToken: process.env.SHOPIFY_ACCESS_TOKEN || 'your_access_token',
        storeUrl: process.env.SHOPIFY_STORE_URL || 'https://yourstore.myshopify.com',
    },
    xmlFeed: {
        url: process.env.XML_FEED_URL || 'https://stildiva.sentos.com.tr/xml-sentos-out/1',
    },
};