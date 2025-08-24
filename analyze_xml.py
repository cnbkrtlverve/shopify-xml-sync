import requests
import xmltodict
import json

def analyze_xml():
    try:
        print("XML analizi başlıyor...")
        
        # XML'i çek
        response = requests.get('https://stildiva.sentos.com.tr/xml-sentos-out/1', timeout=30)
        response.encoding = 'utf-8'
        
        print(f"XML boyutu: {len(response.text)} karakter")
        
        # Parse et
        parsed = xmltodict.parse(response.text)
        
        # Ürün yapısını analiz et
        products = parsed['Urunler']['Urun']
        product_count = len(products) if isinstance(products, list) else 1
        print(f"Toplam ürün sayısı: {product_count}")
        
        # İlk ürünü detaylı analiz et
        first_product = products[0] if isinstance(products, list) else products
        print("\n=== İLK ÜRÜN ANALİZİ ===")
        print(f"Ürün ID: {first_product.get('id')}")
        print(f"Ürün Adı: {first_product.get('urunismi')}")
        print(f"Stok Kodu: {first_product.get('stok_kodu')}")
        print(f"Kategori: {first_product.get('kategori_ismi')}")
        print(f"Marka: {first_product.get('marka')}")
        print(f"Stok: {first_product.get('stok')}")
        print(f"Satış Fiyatı: {first_product.get('satis_fiyati')}")
        print(f"İndirimli Fiyat: {first_product.get('indirimli_fiyat')}")
        print(f"Alış Fiyatı: {first_product.get('alis_fiyati')}")
        
        # Varyant analizi
        print("\n=== VARYANT ANALİZİ ===")
        if 'Varyantlar' in first_product and 'Varyant' in first_product['Varyantlar']:
            variants = first_product['Varyantlar']['Varyant']
            variant_count = len(variants) if isinstance(variants, list) else 1
            
            print(f"Bu üründe {variant_count} varyant var")
            print(f"Varyant İsimleri: {first_product.get('varyant_isimleri')}")
            print(f"Renk İsimleri: {first_product.get('renk_isimleri')}")
            
            # İlk varyantı detaylı göster
            first_variant = variants[0] if isinstance(variants, list) else variants
            print("\nİlk Varyant:")
            print(f"- Varyant İsim: {first_variant.get('Varyant_isim')}")
            print(f"- Varyant Değer: {first_variant.get('Varyant_deger')}")
            print(f"- Renk: {first_variant.get('renk')}")
            print(f"- Stok Kodu: {first_variant.get('stok_kodu')}")
            print(f"- Barkod: {first_variant.get('barkod')}")
            print(f"- Stok: {first_variant.get('stok')}")
            
            if 'resimler' in first_variant and 'resim' in first_variant['resimler']:
                images = first_variant['resimler']['resim']
                image_count = len(images) if isinstance(images, list) else 1
                print(f"- Resim Sayısı: {image_count}")
                if isinstance(images, list):
                    print(f"- İlk Resim: {images[0]}")
                else:
                    print(f"- Resim: {images}")
        
        # Toplam varyant sayısını hesapla
        total_variants = 0
        product_array = products if isinstance(products, list) else [products]
        
        for product in product_array:
            if 'Varyantlar' in product and 'Varyant' in product['Varyantlar']:
                variants = product['Varyantlar']['Varyant']
                variant_count = len(variants) if isinstance(variants, list) else 1
                total_variants += variant_count
            else:
                total_variants += 1  # Varyantı olmayan ürünler için 1
        
        print("\n=== TOPLAM İSTATİSTİKLER ===")
        print(f"Toplam Ürün: {len(product_array)}")
        print(f"Toplam Varyant: {total_variants}")
        print(f"Ortalama Varyant/Ürün: {total_variants / len(product_array):.2f}")
        
        # Birkaç ürünün varyant sayılarını göster
        print("\n=== ÖRNEK ÜRÜNLER ===")
        for i in range(min(5, len(product_array))):
            product = product_array[i]
            variant_count = 1
            
            if 'Varyantlar' in product and 'Varyant' in product['Varyantlar']:
                variants = product['Varyantlar']['Varyant']
                variant_count = len(variants) if isinstance(variants, list) else 1
            
            name = product.get('urunismi', '')[:30] + "..." if len(product.get('urunismi', '')) > 30 else product.get('urunismi', '')
            print(f"Ürün {i+1}: ID={product.get('id')}, Name=\"{name}\", Variants={variant_count}")
        
        # XML yapısının özetini JSON olarak kaydet
        sample_data = {
            "xml_structure": {
                "root": "Urunler",
                "product_node": "Urun",
                "total_products": len(product_array),
                "total_variants": total_variants
            },
            "product_fields": list(first_product.keys()),
            "variant_structure": first_product.get('Varyantlar', {}).get('Varyant', [{}])[0] if isinstance(first_product.get('Varyantlar', {}).get('Varyant', []), list) else first_product.get('Varyantlar', {}).get('Varyant', {}),
            "sample_product": {
                "id": first_product.get('id'),
                "name": first_product.get('urunismi'),
                "price": first_product.get('satis_fiyati'),
                "stock": first_product.get('stok'),
                "variants": variant_count if 'Varyantlar' in first_product else 0
            }
        }
        
        with open('xml-analysis.json', 'w', encoding='utf-8') as f:
            json.dump(sample_data, f, ensure_ascii=False, indent=2)
        
        print("\n=== ANALİZ TAMAMLANDI ===")
        print("Detaylı analiz xml-analysis.json dosyasına kaydedildi.")
        
    except Exception as error:
        print(f"Hata: {error}")

if __name__ == "__main__":
    analyze_xml()
