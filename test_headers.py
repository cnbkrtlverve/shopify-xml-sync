import requests
import json

def test_sync_with_headers():
    """Header'larla sync test eder"""
    
    base_url = "https://vervegranxml.netlify.app/.netlify/functions/api"
    
    print("=== HEADER'LARLA SYNC TEST ===\n")
    
    # Test config kaydet
    print("1. Config kaydetme:")
    test_config = {
        "shopifyUrl": "https://test-store.myshopify.com",
        "shopifyAdminToken": "shpat_test123",
        "xmlUrl": "https://stildiva.sentos.com.tr/xml-sentos-out/1"
    }
    
    config_response = requests.post(f"{base_url}/config", 
                                  json=test_config,
                                  headers={'Content-Type': 'application/json'},
                                  timeout=10)
    
    if config_response.status_code == 200:
        print("   ✅ Config kaydedildi")
    else:
        print(f"   ❌ Config hatası: {config_response.status_code}")
    
    print()
    
    # Test sync with headers (frontend'in yaptığı gibi)
    print("2. Header'larla sync test:")
    sync_headers = {
        'Content-Type': 'application/json',
        'X-Shopify-Store-Url': 'https://test-store.myshopify.com',
        'X-Shopify-Admin-Token': 'shpat_test123',
        'X-XML-Feed-Url': 'https://stildiva.sentos.com.tr/xml-sentos-out/1'
    }
    
    sync_data = {
        "options": {
            "full": True,
            "price": True,
            "inventory": True,
            "details": True,
            "images": True
        }
    }
    
    try:
        print(f"   Headers gönderiliyor: {list(sync_headers.keys())}")
        response = requests.post(f"{base_url}/sync", 
                               json=sync_data,
                               headers=sync_headers,
                               timeout=45)
        
        print(f"   Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("   🎉 SYNC BAŞARILI!")
            print(f"   - İşlenen: {data.get('processedCount', 0)}")
            print(f"   - Oluşturulan: {data.get('createdCount', 0)}")
            print(f"   - Mesaj: {data.get('message', '')}")
            
        elif response.status_code == 400:
            data = response.json()
            if '401' in data.get('message', ''):
                print("   ✅ Header'lar başarıyla okundu!")
                print(f"   - 401 Shopify hatası (test token): {data.get('message')}")
                
                if 'debug' in data:
                    debug = data['debug']
                    print(f"   - Debug var: {list(debug.keys())}")
            else:
                print(f"   ❌ Beklenmeyen hata: {data.get('message')}")
                print(f"   - Debug: {data.get('debug', {})}")
        else:
            print(f"   ❌ HTTP hatası: {response.status_code}")
            print(f"   Response: {response.text[:300]}...")
            
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    print("\n=== HEADER TEST TAMAMLANDI ===")

if __name__ == "__main__":
    test_sync_with_headers()
