const handler = require('./netlify/functions/api.js').handler;

async function testLocal() {
  console.log('=== LOKAL API TEST ===\n');
  
  // Test 1: XML Stats
  console.log('1. XML Stats test:');
  try {
    const xmlStatsEvent = {
      path: '/.netlify/functions/api/xml/stats',
      httpMethod: 'GET',
      headers: {},
      body: null
    };
    
    const result = await handler(xmlStatsEvent, {});
    const data = JSON.parse(result.body);
    
    if (data.success) {
      console.log('✅ XML Stats başarılı');
      console.log(`   - Ürün Sayısı: ${data.productCount}`);
      console.log(`   - Varyant Sayısı: ${data.variantCount}`);
      console.log(`   - Parse Method: ${data.debug?.parseMethod}`);
    } else {
      console.log('❌ XML Stats başarısız:', data.message);
    }
  } catch (error) {
    console.log('❌ XML Stats hatası:', error.message);
  }
  
  console.log();
  
  // Test 2: Shopify Info
  console.log('2. Shopify Info test:');
  try {
    const shopifyEvent = {
      path: '/.netlify/functions/api/shopify/info',
      httpMethod: 'GET',
      headers: {},
      body: null
    };
    
    const result = await handler(shopifyEvent, {});
    const data = JSON.parse(result.body);
    
    console.log('✅ Shopify Info:', data.connected);
  } catch (error) {
    console.log('❌ Shopify Info hatası:', error.message);
  }
  
  console.log();
  
  // Test 3: Sync Config Test
  console.log('3. Sync config test:');
  try {
    const syncEvent = {
      path: '/.netlify/functions/api/sync',
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        options: { testMode: true }
      })
    };
    
    const result = await handler(syncEvent, {});
    const data = JSON.parse(result.body);
    
    if (result.statusCode === 400 && data.message.includes('konfigürasyonu eksik')) {
      console.log('✅ Sync config kontrolü çalışıyor');
      console.log('   - Beklenen hata:', data.message);
    } else {
      console.log('❌ Beklenmeyen sync yanıtı:', data);
    }
  } catch (error) {
    console.log('❌ Sync test hatası:', error.message);
  }
  
  console.log('\n=== LOKAL TEST TAMAMLANDI ===');
}

testLocal();
