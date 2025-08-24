import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { Product, ProductVariant } from '../types/product.d';
import slugify from 'slugify';
import { getShopifyCategoryId } from '../utils/categoryMapper';
import iconv from 'iconv-lite';

// Bu fonksiyonu olduğu gibi bırakıyoruz.
export async function checkXmlConnection(): Promise<{ success: boolean; message: string }> {
    const url = process.env.XML_FEED_URL;
    if (!url) return { success: false, message: 'XML URL bulunamadı' };
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const data = iconv.decode(response.data, 'utf-8');
        await parseStringPromise(data);
        return { success: true, message: 'Başarılı' };
    } catch (error) {
        console.error('XML Bağlantı Hatası:', error);
        return { success: false, message: 'Başarısız' };
    }
}

// YENİDEN YAZILMIŞ FONKSİYON: Varyantları gruplar.
export async function getProductsFromXml(logCallback: (message: string, level: 'info' | 'warn') => void): Promise<Product[]> {
    const url = process.env.XML_FEED_URL;
    if (!url) throw new Error("XML URL'i .env dosyasında bulunamadı.");

    logCallback("XML verisi indiriliyor...", 'info');
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const data = iconv.decode(response.data, 'utf-8');
    
    logCallback("XML verisi parse ediliyor...", 'info');
    const parsed = await parseStringPromise(data, { explicitArray: false, trim: true, charkey: 'text' });

    if (!parsed.Urunler || !parsed.Urunler.Urun) {
        logCallback("XML dosyasında işlenecek ürün bulunamadı.", 'warn');
        return [];
    }

    const allProducts: Product[] = [];
    const xmlProducts = Array.isArray(parsed.Urunler.Urun) ? parsed.Urunler.Urun : [parsed.Urunler.Urun];

    const getVal = (node: any): string => (node && typeof node === 'object' ? node.text : node) || '';

    const parsePrice = (priceString: string): number => {
        if (!priceString) return 0;
        const cleanedString = priceString.replace(/\./g, '').replace(',', '.');
        const price = parseFloat(cleanedString);
        return isNaN(price) ? 0 : price;
    };

    logCallback(`${xmlProducts.length} ürün işlenmeye başlanıyor...`, 'info');
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

        const varyantlarXml = p.Varyantlar?.Varyant;
        if (!varyantlarXml) {
            continue;
        }
        const varyantlar = Array.isArray(varyantlarXml) ? varyantlarXml : [varyantlarXml];


        const productVariants: ProductVariant[] = [];
        const productImages: { src: string }[] = [];
        const optionValues: string[] = [];

        for (const v of varyantlar) {
            const sku = getVal(v.stok_kodu);
            if (!sku) continue;

            const beden = getVal(v.Varyant_deger);
            if (beden && !optionValues.includes(beden)) {
                optionValues.push(beden);
            }

            productVariants.push({
                price: anaFiyat,
                sku: sku,
                inventory_quantity: parseInt(getVal(v.stok), 10) || 0,
                option1: beden,
            });

            const resimler = v.resimler?.resim;
            if (resimler) {
                const resimList = Array.isArray(resimler) ? resimler : [resimler];
                resimList.forEach((r: any) => {
                    const resimUrl = getVal(r);
                    if (resimUrl && productImages.findIndex(img => img.src === resimUrl) === -1) {
                        productImages.push({ src: resimUrl });
                    }
                });
            }
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
    logCallback(`XML'den ${allProducts.length} ürün başarıyla işlendi.`, 'info');
    return allProducts;
}

export async function getXmlStats(): Promise<{ success: boolean, url: string | undefined, productCount: number; variantCount: number; error?: string }> {
    const url = process.env.XML_FEED_URL;
    try {
        if (!url) throw new Error("XML URL'i .env dosyasında bulunamadı.");

        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const data = iconv.decode(response.data, 'utf-8');
        const parsed = await parseStringPromise(data, { explicitArray: false });

        const products = parsed.Urunler?.Urun ? (Array.isArray(parsed.Urunler.Urun) ? parsed.Urunler.Urun : [parsed.Urunler.Urun]) : [];
        let variantCount = 0;
        products.forEach((p: any) => {
            const variants = p.Varyantlar?.Varyant;
            if (variants) {
                variantCount += Array.isArray(variants) ? variants.length : 1;
            }
        });

        return { 
            success: true,
            url: url,
            productCount: products.length, 
            variantCount: variantCount 
        };
    } catch (error: any) {
        console.error("XML istatistikleri alınırken hata:", error.message);
        return { 
            success: false,
            url: url,
            productCount: 0, 
            variantCount: 0,
            error: "XML kaynağına ulaşılamadı veya işlenemedi."
        };
    }
}
