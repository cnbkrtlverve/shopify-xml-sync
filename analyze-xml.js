const axios = require('axios');
const xml2js = require('xml2js');

async function analyzeXML() {
  try {
    console.log('XML analizi başlıyor...');
    
    // XML'i çek
    const response = await axios.get('https://stildiva.sentos.com.tr/xml-sentos-out/1', {
      timeout: 30000
    });
    
    console.log('XML boyutu:', response.data.length, 'karakter');
    
    // Parse et
    const parsed = await xml2js.parseStringPromise(response.data, {
      explicitArray: false,
      trim: true,
      mergeAttrs: true
    });
    
    // Ürün yapısını analiz et
    const products = parsed.Urunler.Urun;
    console.log('Toplam ürün sayısı:', Array.isArray(products) ? products.length : 1);
    
    // İlk ürünü detaylı analiz et
    const firstProduct = Array.isArray(products) ? products[0] : products;
    console.log('\n=== İLK ÜRÜN ANALİZİ ===');
    console.log('Ürün ID:', firstProduct.id);
    console.log('Ürün Adı:', firstProduct.urunismi);
    console.log('Stok Kodu:', firstProduct.stok_kodu);
    console.log('Kategori:', firstProduct.kategori_ismi);
    console.log('Marka:', firstProduct.marka);
    console.log('Stok:', firstProduct.stok);
    console.log('Satış Fiyatı:', firstProduct.satis_fiyati);
    console.log('İndirimli Fiyat:', firstProduct.indirimli_fiyat);
    console.log('Alış Fiyatı:', firstProduct.alis_fiyati);
    
    // Varyant analizi
    console.log('\n=== VARYANT ANALİZİ ===');
    if (firstProduct.Varyantlar && firstProduct.Varyantlar.Varyant) {
      const variants = Array.isArray(firstProduct.Varyantlar.Varyant) ? 
        firstProduct.Varyantlar.Varyant : [firstProduct.Varyantlar.Varyant];
      
      console.log('Bu üründe', variants.length, 'varyant var');
      console.log('Varyant İsimleri:', firstProduct.varyant_isimleri);
      console.log('Renk İsimleri:', firstProduct.renk_isimleri);
      
      // İlk varyantı detaylı göster
      const firstVariant = variants[0];
      console.log('\nİlk Varyant:');
      console.log('- Varyant İsim:', firstVariant.Varyant_isim);
      console.log('- Varyant Değer:', firstVariant.Varyant_deger);
      console.log('- Renk:', firstVariant.renk);
      console.log('- Stok Kodu:', firstVariant.stok_kodu);
      console.log('- Barkod:', firstVariant.barkod);
      console.log('- Stok:', firstVariant.stok);
      
      if (firstVariant.resimler && firstVariant.resimler.resim) {
        const images = Array.isArray(firstVariant.resimler.resim) ? 
          firstVariant.resimler.resim : [firstVariant.resimler.resim];
        console.log('- Resim Sayısı:', images.length);
        console.log('- İlk Resim:', images[0]);
      }
    }
    
    // Toplam varyant sayısını hesapla
    let totalVariants = 0;
    const productArray = Array.isArray(products) ? products : [products];
    
    productArray.forEach(product => {
      if (product.Varyantlar && product.Varyantlar.Varyant) {
        const variants = Array.isArray(product.Varyantlar.Varyant) ? 
          product.Varyantlar.Varyant : [product.Varyantlar.Varyant];
        totalVariants += variants.length;
      } else {
        totalVariants += 1; // Varyantı olmayan ürünler için 1
      }
    });
    
    console.log('\n=== TOPLAM İSTATİSTİKLER ===');
    console.log('Toplam Ürün:', productArray.length);
    console.log('Toplam Varyant:', totalVariants);
    console.log('Ortalama Varyant/Ürün:', (totalVariants / productArray.length).toFixed(2));
    
    // Birkaç ürünün varyant sayılarını göster
    console.log('\n=== ÖRNEK ÜRÜNLER ===');
    for (let i = 0; i < Math.min(5, productArray.length); i++) {
      const product = productArray[i];
      let variantCount = 1;
      
      if (product.Varyantlar && product.Varyantlar.Varyant) {
        const variants = Array.isArray(product.Varyantlar.Varyant) ? 
          product.Varyantlar.Varyant : [product.Varyantlar.Varyant];
        variantCount = variants.length;
      }
      
      console.log(`Ürün ${i+1}: ID=${product.id}, Name="${product.urunismi.substring(0, 30)}...", Variants=${variantCount}`);
    }
    
  } catch (error) {
    console.error('Hata:', error.message);
  }
}

analyzeXML();
