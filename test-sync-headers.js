const handler = require('./netlify/functions/api.js').handler;

async function testSyncWithHeaders() {
  console.log('=== SYNC HEADER TEST ===\n');
  
  // Test sync with headers (simulating frontend request)
  console.log('Sync test with headers:');
  try {
    const syncEvent = {
      path: '/.netlify/functions/api/sync',
      httpMethod: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Store-Url': 'https://test-store.myshopify.com',
        'X-Shopify-Admin-Token': 'shpat_test123',
        'X-XML-Feed-Url': 'https://stildiva.sentos.com.tr/xml-sentos-out/1'
      },
      body: JSON.stringify({
        options: { 
          testMode: true,
          maxProducts: 1 
        }
      })
    };
    
    const result = await handler(syncEvent, {});
    console.log('Status Code:', result.statusCode);
    
    const data = JSON.parse(result.body);
    console.log('Success:', data.success);
    console.log('Message:', data.message);
    
    if (data.debug) {
      console.log('Debug Info:');
      console.log('- Store URL Source:', data.debug.storeUrlSource || 'N/A');
      console.log('- Token Source:', data.debug.tokenSource || 'N/A');
      console.log('- Has Store URL:', data.debug.hasStoreUrl);
      console.log('- Has Token:', data.debug.hasToken);
      
      if (data.debug.configSource) {
        console.log('- Config Sources:');
        console.log('  * Headers:', data.debug.configSource.fromHeaders);
        console.log('  * Global:', data.debug.configSource.fromGlobalConfig);
        console.log('  * Env:', data.debug.configSource.fromEnv);
      }
    }
    
    if (data.success) {
      console.log('🎉 SYNC BAŞARILI!');
      console.log('- İşlenen:', data.processedCount);
      console.log('- Oluşturulan:', data.createdCount);
      if (data.debug && data.debug.productTitle) {
        console.log('- Ürün:', data.debug.productTitle);
      }
    } else if (data.message && data.message.includes('401')) {
      console.log('✅ Header\'lar başarıyla okundu, Shopify token hatası (beklenen)');
    }
    
  } catch (error) {
    console.log('❌ Test hatası:', error.message);
  }
  
  console.log('\n=== HEADER TEST TAMAMLANDI ===');
}

testSyncWithHeaders();
