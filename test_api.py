import requests
import json

def test_api():
    """API'yi tam test eder"""
    
    base_url = "https://vervegranxml.netlify.app/.netlify/functions/api"
    
    print("=== API TEST BAŞLADI ===\n")
    
    # 1. XML Stats test
    print("1. XML Stats test:")
    try:
        response = requests.get(f"{base_url}/xml/stats", timeout=30)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print(f"✅ XML Stats başarılı")
                print(f"   - Ürün Sayısı: {data.get('productCount')}")
                print(f"   - Varyant Sayısı: {data.get('variantCount')}")
                print(f"   - Parse Method: {data.get('debug', {}).get('parseMethod')}")
            else:
                print(f"❌ XML Stats başarısız: {data.get('message')}")
        else:
            print(f"❌ XML Stats HTTP hatası: {response.status_code}")
    except Exception as e:
        print(f"❌ XML Stats exception: {e}")
    
    print()
    
    # 2. Shopify Info test
    print("2. Shopify Info test:")
    try:
        response = requests.get(f"{base_url}/shopify/info", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Shopify Info: {data.get('connected', False)}")
        else:
            print(f"❌ Shopify Info HTTP hatası: {response.status_code}")
    except Exception as e:
        print(f"❌ Shopify Info exception: {e}")
    
    print()
    
    # 3. Sync test (sadece yapılandırma kontrolü)
    print("3. Sync yapılandırma test:")
    try:
        sync_data = {
            "options": {
                "testMode": True,
                "maxProducts": 1
            }
        }
        
        headers = {
            'Content-Type': 'application/json',
            # Test için boş headers - hata mesajı almalıyız
        }
        
        response = requests.post(f"{base_url}/sync", 
                               json=sync_data, 
                               headers=headers, 
                               timeout=30)
        
        if response.status_code == 400:
            data = response.json()
            if 'konfigürasyonu eksik' in data.get('message', ''):
                print("✅ Sync yapılandırma kontrolü çalışıyor")
                print(f"   - Beklenen hata: {data.get('message')}")
            else:
                print(f"❌ Beklenmeyen sync hatası: {data.get('message')}")
        else:
            print(f"❌ Sync beklenmeyen HTTP kodu: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            
    except Exception as e:
        print(f"❌ Sync test exception: {e}")
    
    print("\n=== API TEST TAMAMLANDI ===")

if __name__ == "__main__":
    test_api()
