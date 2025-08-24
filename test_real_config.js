const axios = require('axios');

async function testRealConfig() {
    const apiUrl = 'https://vervegranxml.netlify.app/.netlify/functions/api';
    
    console.log('🔍 Real Config Test Başlıyor...\n');
    
    // Gerçek config bilgileri (örnek)
    const realConfig = {
        shopify: {
            shopUrl: 'BURAYA_GERÇEK_STORE_URL', // Örnek: verve-shop.myshopify.com
            accessToken: 'BURAYA_GERÇEK_TOKEN' // Örnek: shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        },
        google: {
            clientId: 'google-client-id',
            sheetId: 'google-sheet-id'
        }
    };
    
    console.log('⚠️  GERÇEKConfig bilgilerini güncelleyin!');
    console.log('   shopUrl: sizin-store.myshopify.com');
    console.log('   accessToken: shpat_gerçek_token');
    
    if (realConfig.shopify.shopUrl === 'BURAYA_GERÇEK_STORE_URL') {
        console.log('❌ Önce gerçek config bilgilerini girin!');
        return;
    }
    
    try {
        // 1. Config kaydetme testi
        console.log('📝 Config kaydediliyor...');
        const saveResponse = await axios.post(`${apiUrl}/config`, realConfig);
        console.log('✅ Config kaydetme:', saveResponse.data);
        
        // 2. Config okuma testi
        console.log('\n📖 Config okunuyor...');
        const getResponse = await axios.get(`${apiUrl}/config`);
        console.log('✅ Config okuma:', getResponse.data);
        
        // 3. Shopify test
        console.log('\n🛍️ Shopify bağlantısı test ediliyor...');
        const shopifyTestResponse = await axios.get(`${apiUrl}/shopify/test`, {
            headers: {
                'X-Shopify-Shop-Url': realConfig.shopify.shopUrl,
                'X-Shopify-Access-Token': realConfig.shopify.accessToken
            }
        });
        console.log('✅ Shopify test:', shopifyTestResponse.data);
        
        // 4. XML analiz testi
        console.log('\n📄 XML analiz test ediliyor...');
        const xmlTestResponse = await axios.get(`${apiUrl}/xml/analyze`);
        console.log('✅ XML analiz:', {
            productCount: xmlTestResponse.data.products?.length || 0,
            sampleProduct: xmlTestResponse.data.products?.[0]?.name
        });
        
        // 5. Sync testi (ilk ürün)
        console.log('\n🔄 Sync test ediliyor (ilk ürün)...');
        const syncTestResponse = await axios.post(`${apiUrl}/sync/start`, {
            maxProducts: 1 // Sadece 1 ürün test için
        }, {
            headers: {
                'X-Shopify-Shop-Url': realConfig.shopify.shopUrl,
                'X-Shopify-Access-Token': realConfig.shopify.accessToken
            }
        });
        console.log('✅ Sync test:', syncTestResponse.data);
        
    } catch (error) {
        console.error('❌ Test hatası:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        
        if (error.response?.status === 401) {
            console.log('\n💡 401 Hatası Çözümü:');
            console.log('- Shopify Admin API token\'ınızı kontrol edin');
            console.log('- Token\'ın "read_products" ve "write_products" yetkisine sahip olduğunu kontrol edin');
            console.log('- Store URL\'inin doğru olduğunu kontrol edin');
        }
    }
}

// Çalıştır
testRealConfig();
