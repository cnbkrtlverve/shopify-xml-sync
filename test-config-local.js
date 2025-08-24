const handler = require('./netlify/functions/api.js').handler;

async function testConfigLocal() {
  console.log('=== LOKAL CONFIG TEST ===\n');
  
  // Test 1: Config Kaydetme
  console.log('1. Config kaydetme test:');
  try {
    const configEvent = {
      path: '/.netlify/functions/api/config',
      httpMethod: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopifyUrl: 'https://test-store.myshopify.com',
        shopifyAdminToken: 'test-token-123',
        xmlUrl: 'https://stildiva.sentos.com.tr/xml-sentos-out/1'
      })
    };
    
    const result = await handler(configEvent, {});
    const data = JSON.parse(result.body);
    
    if (data.success) {
      console.log('✅ Config kaydetme başarılı');
      console.log('   - Mesaj:', data.message);
      console.log('   - Kaydedilen:', data.saved);
    } else {
      console.log('❌ Config kaydetme başarısız:', data.message);
    }
  } catch (error) {
    console.log('❌ Config kaydetme hatası:', error.message);
  }
  
  console.log();
  
  // Test 2: Config Okuma
  console.log('2. Config okuma test:');
  try {
    const readEvent = {
      path: '/.netlify/functions/api/config',
      httpMethod: 'GET',
      headers: {},
      body: null
    };
    
    const result = await handler(readEvent, {});
    const data = JSON.parse(result.body);
    
    if (data.success) {
      console.log('✅ Config okuma başarılı');
      const config = data.config;
      console.log('   - Shopify URL:', config.shopifyUrl || 'Yok');
      console.log('   - Token var mı:', config.shopifyAdminToken ? 'Evet' : 'Hayır');
      console.log('   - XML URL:', config.xmlUrl || 'Yok');
    } else {
      console.log('❌ Config okuma başarısız:', data.message);
    }
  } catch (error) {
    console.log('❌ Config okuma hatası:', error.message);
  }
  
  console.log();
  
  // Test 3: Sync ile Config Kullanımı
  console.log('3. Sync config kullanım test:');
  try {
    const syncEvent = {
      path: '/.netlify/functions/api/sync',
      httpMethod: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        options: { testMode: true }
      })
    };
    
    const result = await handler(syncEvent, {});
    const data = JSON.parse(result.body);
    
    console.log('Status Code:', result.statusCode);
    console.log('Mesaj:', data.message);
    
    if (data.debug && data.debug.configSource) {
      const configSource = data.debug.configSource;
      console.log('✅ Config kaynak testi:');
      console.log('   - Global Config\'den:', configSource.fromGlobalConfig);
      console.log('   - Header\'lardan:', configSource.fromHeaders);
      console.log('   - Environment\'tan:', configSource.fromEnv);
      
      if (configSource.fromGlobalConfig) {
        console.log('   🎉 Global config başarıyla kullanılıyor!');
      }
    }
  } catch (error) {
    console.log('❌ Sync test hatası:', error.message);
  }
  
  console.log('\n=== LOKAL CONFIG TEST TAMAMLANDI ===');
}

testConfigLocal();
