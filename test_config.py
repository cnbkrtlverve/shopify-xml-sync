import requests
import json

def test_config_endpoint():
    """Config endpoint'ini test eder"""
    
    base_url = "https://vervegranxml.netlify.app/.netlify/functions/api"
    
    print("=== CONFIG ENDPOINT TEST ===\n")
    
    # Test config kaydetme
    print("1. Config kaydetme test:")
    test_config = {
        "shopifyUrl": "https://test-store.myshopify.com",
        "shopifyAdminToken": "test-token-123",
        "xmlUrl": "https://stildiva.sentos.com.tr/xml-sentos-out/1"
    }
    
    try:
        response = requests.post(f"{base_url}/config", 
                               json=test_config, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Config kaydetme başarılı")
                print(f"   - Mesaj: {data.get('message')}")
                print(f"   - Kaydedilen alanlar: {data.get('saved')}")
            else:
                print(f"❌ Config kaydetme başarısız: {data.get('message')}")
        else:
            print(f"❌ Config kaydetme HTTP hatası: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
    except Exception as e:
        print(f"❌ Config kaydetme exception: {e}")
    
    print()
    
    # Test config okuma
    print("2. Config okuma test:")
    try:
        response = requests.get(f"{base_url}/config", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Config okuma başarılı")
                config = data.get('config', {})
                print(f"   - Shopify URL: {config.get('shopifyUrl', 'Yok')}")
                print(f"   - Token var mı: {'Evet' if config.get('shopifyAdminToken') else 'Hayır'}")
                print(f"   - XML URL: {config.get('xmlUrl', 'Yok')}")
            else:
                print(f"❌ Config okuma başarısız: {data.get('message')}")
        else:
            print(f"❌ Config okuma HTTP hatası: {response.status_code}")
    except Exception as e:
        print(f"❌ Config okuma exception: {e}")
    
    print()
    
    # Test sync ile kaydedilen config'i kullanma
    print("3. Sync config kullanım test:")
    try:
        sync_data = {"options": {"testMode": True}}
        response = requests.post(f"{base_url}/sync", 
                               json=sync_data,
                               headers={'Content-Type': 'application/json'},
                               timeout=30)
        
        if response.status_code == 400:
            data = response.json()
            debug = data.get('debug', {})
            config_source = debug.get('configSource', {})
            
            print("✅ Sync config testi")
            print(f"   - Global Config'den: {config_source.get('fromGlobalConfig', False)}")
            print(f"   - Header'lardan: {config_source.get('fromHeaders', False)}")
            print(f"   - Environment'tan: {config_source.get('fromEnv', False)}")
            
            if config_source.get('fromGlobalConfig'):
                print("   ✅ Global config kullanılıyor!")
            else:
                print("   ⚠️  Henüz test token'ları, gerçek Shopify hatası bekleniyor")
                
        else:
            print(f"❌ Sync beklenmeyen HTTP kodu: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Sync config test exception: {e}")
    
    print("\n=== CONFIG TEST TAMAMLANDI ===")

if __name__ == "__main__":
    test_config_endpoint()
