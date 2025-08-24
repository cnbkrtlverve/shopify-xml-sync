import requests
import json

def test_full_sync():
    """Tam sync işlemini test eder"""
    
    base_url = "https://vervegranxml.netlify.app/.netlify/functions/api"
    
    print("=== TAM SYNC TEST BAŞLADI ===\n")
    
    # Test için örnek Shopify bilgileri (gerçek bilgileri kullanıcı verecek)
    shopify_headers = {
        'Content-Type': 'application/json',
        'X-Shopify-Store-Url': 'https://your-test-store.myshopify.com',  # Kullanıcının vereceği
        'X-Shopify-Admin-Token': 'your-admin-api-token'  # Kullanıcının vereceği
    }
    
    print("NOT: Gerçek Shopify bilgileri gerekli!")
    print("Şu bilgileri sağlayın:")
    print("1. Shopify Store URL (https://yourstore.myshopify.com)")
    print("2. Shopify Admin API Token")
    print("\nŞimdilik test için konfigürasyon eksikliği hatası alacağız...\n")
    
    # Sync test
    sync_data = {
        "options": {
            "testMode": True,
            "maxProducts": 1,
            "syncImages": True,
            "syncInventory": True
        }
    }
    
    try:
        print("Sync işlemi başlatılıyor...")
        response = requests.post(f"{base_url}/sync", 
                               json=sync_data, 
                               headers=shopify_headers, 
                               timeout=60)
        
        print(f"HTTP Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ SYNC BAŞARILI!")
                print(f"   - İşlenen Ürün: {data.get('processedCount', 0)}")
                print(f"   - Oluşturulan: {data.get('createdCount', 0)}")
                print(f"   - Güncellenen: {data.get('updatedCount', 0)}")
                print(f"   - Hata Sayısı: {data.get('errorCount', 0)}")
                print(f"   - Mesaj: {data.get('message', '')}")
                
                if 'debug' in data:
                    debug = data['debug']
                    print(f"   - XML Ürün Sayısı: {debug.get('xmlProductCount', 0)}")
                    print(f"   - XML Varyant Sayısı: {debug.get('xmlVariantCount', 0)}")
                    print(f"   - Shopify Ürün ID: {debug.get('shopifyProductId', 'N/A')}")
                    print(f"   - Ürün Başlığı: {debug.get('productTitle', 'N/A')}")
                    if 'variantTitles' in debug:
                        print(f"   - Varyant Başlıkları: {', '.join(debug['variantTitles'][:3])}...")
            else:
                print(f"❌ Sync başarısız: {data.get('message')}")
                if 'debug' in data:
                    print(f"   Debug: {data['debug']}")
        
        elif response.status_code == 400:
            data = response.json()
            if 'konfigürasyonu eksik' in data.get('message', ''):
                print("⚠️  Beklenen durum: Shopify konfigürasyonu eksik")
                print(f"   Mesaj: {data.get('message')}")
                print("\n📝 Gerçek kullanım için şunları yapın:")
                print("1. Dashboard'da Settings'e gidin")
                print("2. Shopify Store URL'inizi girin")
                print("3. Shopify Admin API Token'ınızı girin")
                print("4. Sync butonuna basın")
            else:
                print(f"❌ Beklenmeyen sync hatası: {data.get('message')}")
                if 'debug' in data:
                    print(f"   Debug: {data['debug']}")
        else:
            print(f"❌ HTTP hatası: {response.status_code}")
            print(f"   Response: {response.text[:300]}...")
            
    except Exception as e:
        print(f"❌ Sync test exception: {e}")
    
    print("\n=== TAM SYNC TEST TAMAMLANDI ===")

if __name__ == "__main__":
    test_full_sync()
