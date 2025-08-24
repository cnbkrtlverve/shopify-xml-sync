const axios = require('axios');

async function testShopifyCheck() {
    try {
        console.log('🔍 Shopify Check Endpoint Test...');
        
        // Test headers olmadan
        console.log('\n1. Headers olmadan test:');
        const noHeadersResponse = await axios.get('https://vervegranxml.netlify.app/.netlify/functions/api/shopify/check');
        console.log('Response:', noHeadersResponse.data);
        
    } catch (error) {
        console.log('Expected 400 error:', error.response?.status, error.response?.data);
    }
    
    try {
        // Test gerçek olmayan header'larla  
        console.log('\n2. Test headers ile:');
        const testResponse = await axios.get('https://vervegranxml.netlify.app/.netlify/functions/api/shopify/check', {
            headers: {
                'X-Shopify-Shop-Url': 'test-store.myshopify.com',
                'X-Shopify-Access-Token': 'shpat_test_token'
            }
        });
        console.log('Response:', testResponse.data);
        
    } catch (error) {
        console.log('Expected Shopify error:', error.response?.status, error.response?.data);
    }
}

testShopifyCheck();
