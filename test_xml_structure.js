const axios = require('axios');
const xml2js = require('xml2js');

async function testXMLStructure() {
    try {
        console.log('🔍 XML yapısını test ediyorum...\n');
        
        const response = await axios.get('https://stildiva.sentos.com.tr/xml-sentos-out/1', { timeout: 10000 });
        
        console.log('📄 XML boyutu:', response.data.length, 'karakter');
        console.log('📄 XML ilk 500 karakter:');
        console.log(response.data.substring(0, 500));
        console.log('\n');
        
        // Parse et
        const parsed = await xml2js.parseStringPromise(response.data, { 
            explicitArray: false, 
            trim: true,
            mergeAttrs: true 
        });
        
        console.log('🔧 Parse edilen yapı:');
        console.log('Ana objeler:', Object.keys(parsed));
        
        if (parsed.Urunler) {
            console.log('✅ Urunler bulundu');
            console.log('Urunler tipi:', typeof parsed.Urunler);
            console.log('Urunler keys:', Object.keys(parsed.Urunler));
            
            if (parsed.Urunler.Urun) {
                const products = Array.isArray(parsed.Urunler.Urun) ? parsed.Urunler.Urun : [parsed.Urunler.Urun];
                console.log('✅ Ürün sayısı:', products.length);
                
                if (products.length > 0) {
                    console.log('\n📦 İlk ürün:');
                    const firstProduct = products[0];
                    console.log('- ID:', firstProduct.id);
                    console.log('- İsim:', firstProduct.urunismi);
                    console.log('- Fiyat:', firstProduct.satis_fiyati);
                    console.log('- Stok:', firstProduct.stok);
                    console.log('- Tüm alanlar:', Object.keys(firstProduct).slice(0, 10));
                }
            } else {
                console.log('❌ Urun bulunamadı');
            }
        } else {
            console.log('❌ Urunler bulunamadı');
            console.log('Mevcut ana objeler:', Object.keys(parsed));
        }
        
    } catch (error) {
        console.error('❌ XML test hatası:', error.message);
    }
}

testXMLStructure();
