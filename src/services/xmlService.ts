import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { Product, ProductVariant } from '../types/product';
import slugify from 'slugify';
import { getShopifyCategoryId } from '../utils/categoryMapper';

// Bu fonksiyonu olduğu gibi bırakıyoruz.
export async function checkXmlConnection(): Promise<{ success: boolean; message: string }> {
    const url = process.env.XML_FEED_URL;
    if (!url) return { success: false, message: 'XML URL bulunamadı' };
    try {
        const response = await axios.get(url);
        await parseStringPromise(response.data);
        return { success: true, message: 'Başarılı' };
    } catch (error) {
        console.error('XML Bağlantı Hatası:', error);
        return { success: false, message: 'Başarısız' };
    }
}

// YENİDEN YAZILMIŞ FONKSİYON: Varyantları gruplar.
export async function getProductsFromXml(): Promise<Product[]> {
    const url = process.env.XML_FEED_URL;
    if (!url) throw new Error("XML URL'i .env dosyasında bulunamadı.");

    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const data = require('iconv-lite').decode(response.data, 'utf-8');
    const parsed = await parseStringPromise(data, { explicitArray: true, trim: true });

    if (!parsed.Urunler || !parsed.Urunler.Urun) {
        console.log("XML dosyasında işlenecek ürün bulunamadı.");
        return [];
    }

    const allProducts: Product[] = [];
    const xmlProducts = parsed.Urunler.Urun;

    const getVal = (node: any[] | undefined): string => (node && node[0]) ? node[0] : '';

    // YENİ FİYAT PARÇALAMA FONKSİYONU
    const parsePrice = (priceString: string): number => {
        if (!priceString) return 0;
        // 1. Binlik ayraç olan noktaları kaldır: "1.250,99" -> "1250,99"
        // 2. Ondalık ayraç olan virgülü noktaya çevir: "1250,99" -> "1250.99"
        // 3. Sayıya çevir.
        const cleanedString = priceString.replace(/\./g, '').replace(',', '.');
        const price = parseFloat(cleanedString);
        return isNaN(price) ? 0 : price;
    };

    for (const p of xmlProducts) {
        const anaUrunAdi = getVal(p.urunismi);
        if (!anaUrunAdi) continue;

        const anaMarka = 'Vervegrand';
        const anaKategori = getVal(p.kategori_ismi);
        const shopifyCategoryId = getShopifyCategoryId(anaKategori);
        const anaAciklama = getVal(p.detayaciklama);

        const satisFiyati = parsePrice(getVal(p.satis_fiyati));
        const indirimliFiyat = parsePrice(getVal(p.indirimli_fiyat));
        
        const anaFiyat = indirimliFiyat > 0 ? indirimliFiyat : satisFiyati;

        // GÜNCELLEME: Fiyatın doğru okunup okunmadığını kontrol etmek için log eklendi.
        console.log(`[XML OKUMA] Ürün: ${anaUrunAdi} -> Okunan Fiyat: ${anaFiyat}`);

        const varyantlarXml = p.Varyantlar?.[0]?.Varyant;
        if (!varyantlarXml || varyantlarXml.length === 0) {
            continue;
        }

        const productVariants: ProductVariant[] = [];
        const productImages: { src: string }[] = [];
        const optionValues: string[] = [];

        for (const v of varyantlarXml) {
            const sku = getVal(v.stok_kodu);
            if (!sku) continue;

            const beden = getVal(v.Varyant_deger);
            optionValues.push(beden);

            productVariants.push({
                price: anaFiyat,
                sku: sku,
                inventory_quantity: parseInt(getVal(v.stok), 10) || 0,
                option1: beden,
            });

            v.resimler?.[0]?.resim?.forEach((r: any) => {
                if (productImages.findIndex(img => img.src === r) === -1) {
                    productImages.push({ src: r });
                }
            });
        }

        if (productVariants.length === 0) continue;

        const handle = slugify(anaUrunAdi, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g
        }) + '-' + getVal(p.id);

        const product: Product = {
            handle: handle,
            title: anaUrunAdi,
            body_html: anaAciklama,
            vendor: anaMarka,
            product_type: anaKategori.split('>').pop()?.trim() || 'Diğer',
            tags: anaKategori.split('>').map(t => t.trim()),
            options: [{ name: "Beden", values: optionValues }],
            variants: productVariants,
            images: productImages,
            product_category: shopifyCategoryId ? { id: shopifyCategoryId } : undefined,
        };
        allProducts.push(product);
    }
    return allProducts;
}

export async function getXmlStats(): Promise<{ success: boolean, url: string | undefined, productCount: number; variantCount: number; error?: string }> {
    const url = process.env.XML_FEED_URL;
    try {
        if (!url) throw new Error("XML URL'i .env dosyasında bulunamadı.");

        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const data = require('iconv-lite').decode(response.data, 'utf-8');
        const parsed = await parseStringPromise(data, { explicitArray: true });

        const products = parsed.Urunler?.Urun || [];
        let variantCount = 0;
        products.forEach((p: any) => {
            variantCount += p.Varyantlar?.[0]?.Varyant?.length || 0;
        });

        return { 
            success: true,
            url: url,
            productCount: products.length, 
            variantCount: variantCount 
        };
    } catch (error: any) {
        console.error("XML istatistikleri alınırken hata:", error.message);
        // Hata durumunda, success: false ve sayılar 0 olarak döndürülür.
        return { 
            success: false,
            url: url,
            productCount: 0, 
            variantCount: 0,
            error: "XML kaynağına ulaşılamadı veya işlenemedi."
        };
    }
}