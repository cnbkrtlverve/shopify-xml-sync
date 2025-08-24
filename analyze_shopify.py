import requests
import json

def analyze_shopify_structure():
    """Shopify ürün yapısını analiz eder"""
    
    print("=== SHOPIFY ÜRÜN YAPISI ANALİZİ ===\n")
    
    # Shopify Product API yapısı (2024-07 API version)
    shopify_product_structure = {
        "product": {
            "title": "Ürün Adı (ZORUNLU)",
            "body_html": "Ürün Açıklaması (HTML)",
            "vendor": "Marka/Tedarikci",
            "product_type": "Ürün Tipi",
            "status": "active|draft|archived",
            "tags": "tag1,tag2,tag3",
            "handle": "url-slug",
            "images": [
                {
                    "src": "https://image-url.jpg",
                    "alt": "Resim açıklaması",
                    "position": 1
                }
            ],
            "variants": [
                {
                    "title": "Varyant Adı",
                    "price": "0.00",
                    "sku": "STOK-KODU",
                    "inventory_quantity": 0,
                    "inventory_management": "shopify",
                    "inventory_policy": "deny",
                    "barcode": "BARKOD",
                    "option1": "Renk",
                    "option2": "Beden",
                    "option3": "Materyal",
                    "weight": 0,
                    "weight_unit": "kg"
                }
            ],
            "options": [
                {
                    "name": "Renk",
                    "values": ["Kırmızı", "Mavi", "Siyah"]
                },
                {
                    "name": "Beden", 
                    "values": ["S", "M", "L", "XL"]
                }
            ]
        }
    }
    
    print("Shopify Product API Yapısı:")
    print(json.dumps(shopify_product_structure, ensure_ascii=False, indent=2))
    
    # XML'den Shopify'a mapping
    xml_to_shopify_mapping = {
        "product_level": {
            "title": "urunismi",
            "body_html": "detayaciklama", 
            "vendor": "marka",
            "product_type": "kategori_ismi",
            "status": "active",  # Hep aktif
            "tags": "kategori_ismi + marka",
            "handle": "urunismi'nden slug"
        },
        "variant_level": {
            "title": "Varyant_deger + renk",
            "price": "alis_fiyati", # satis_fiyati 0 olduğu için alış fiyatını kullan
            "sku": "stok_kodu (varyant seviyesinde)",
            "inventory_quantity": "stok (varyant seviyesinde)",
            "barcode": "barkod (varyant seviyesinde)",
            "option1": "renk",
            "option2": "Varyant_deger (beden)"
        },
        "images": {
            "src": "Varyantlar.Varyant.resimler.resim[]",
            "alt": "urunismi",
            "position": "sıralı"
        }
    }
    
    print("\n=== XML'DEN SHOPIFY'A MAPPING ===")
    print(json.dumps(xml_to_shopify_mapping, ensure_ascii=False, indent=2))
    
    # Örnek dönüşüm
    sample_conversion = {
        "xml_input": {
            "id": "1781",
            "urunismi": "Büyük Beden Cepli Bol Kesim Likralı Jarse Pantolon 144236",
            "marka": "Stil Diva",
            "kategori_ismi": "Giyim > Büyük Beden > Alt Giyim > Pantolon",
            "alis_fiyati": "190,00",
            "stok": "259",
            "detayaciklama": "<p>Ürün açıklaması...</p>",
            "Varyantlar": {
                "Varyant": [
                    {
                        "Varyant_isim": "Beden",
                        "Varyant_deger": "48",
                        "renk": "Siyah",
                        "stok_kodu": "144236Siyah-M47-R15",
                        "barkod": "144236-SYH-48",
                        "stok": "0"
                    }
                ]
            }
        },
        "shopify_output": {
            "product": {
                "title": "Büyük Beden Cepli Bol Kesim Likralı Jarse Pantolon 144236",
                "body_html": "<p>Ürün açıklaması...</p>",
                "vendor": "Stil Diva",
                "product_type": "Pantolon",
                "status": "active",
                "tags": "Giyim,Büyük Beden,Alt Giyim,Pantolon,Stil Diva",
                "variants": [
                    {
                        "title": "Siyah / 48",
                        "price": "190.00",
                        "sku": "144236Siyah-M47-R15",
                        "inventory_quantity": 0,
                        "inventory_management": "shopify",
                        "barcode": "144236-SYH-48",
                        "option1": "Siyah",
                        "option2": "48"
                    }
                ],
                "options": [
                    {
                        "name": "Renk",
                        "values": ["Siyah"]
                    },
                    {
                        "name": "Beden",
                        "values": ["48", "46", "44", "42", "40", "66-68", "50-52", "54-56", "58-60", "62-64"]
                    }
                ]
            }
        }
    }
    
    print("\n=== ÖRNEK DÖNÜŞÜM ===")
    print(json.dumps(sample_conversion, ensure_ascii=False, indent=2))
    
    # Dosyaya kaydet
    with open('shopify-analysis.json', 'w', encoding='utf-8') as f:
        json.dump({
            "shopify_structure": shopify_product_structure,
            "xml_to_shopify_mapping": xml_to_shopify_mapping,
            "sample_conversion": sample_conversion
        }, f, ensure_ascii=False, indent=2)
    
    print("\n=== ANALİZ TAMAMLANDI ===")
    print("Shopify analizi shopify-analysis.json dosyasına kaydedildi.")
    
    return xml_to_shopify_mapping

if __name__ == "__main__":
    analyze_shopify_structure()
