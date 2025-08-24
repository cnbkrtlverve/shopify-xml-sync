const axios = require('axios');

async function quickTest() {
    try {
        console.log('🔍 API Test Başlıyor...');
        
        const response = await axios.get('https://vervegranxml.netlify.app/.netlify/functions/api/xml/analyze');
        const data = response.data;
        
        console.log('✅ XML Test Başarılı:');
        console.log('- Ürün sayısı:', data.products?.length || 0);
        console.log('- Variant sayısı:', data.totalVariants || 0);
        console.log('- İlk ürün:', data.products?.[0]?.name || 'N/A');
        
    } catch (error) {
        console.log('❌ Test hatası:', error.message);
        console.log('Status:', error.response?.status);
        console.log('Data:', error.response?.data);
    }
}

quickTest();
