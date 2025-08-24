import requests
import json

def debug_sync_issue():
    """Sync sorununu debug eder"""
    
    base_url = "https://vervegranxml.netlify.app/.netlify/functions/api"
    
    print("=== SYNC DEBUG TEST ===\n")
    
    # Test 1: Önce config durumunu kontrol et
    print("1. Config durumu:")
    try:
        response = requests.get(f"{base_url}/config", timeout=10)
        if response.status_code == 200:
            data = response.json()
            config = data.get('config', {})
            print(f"   - Shopify URL: {config.get('shopifyUrl', 'YOK')}")
            print(f"   - Admin Token: {'VAR' if config.get('shopifyAdminToken') else 'YOK'}")
            print(f"   - XML URL: {config.get('xmlUrl', 'YOK')}")
        else:
            print(f"   ❌ Config okunamadı: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Config hatası: {e}")
    
    print()
    
    # Test 2: Sync request'in tam detayını gör
    print("2. Sync request detayı:")
    sync_data = {
        "options": {
            "testMode": True,
            "maxProducts": 1
        }
    }
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    try:
        print(f"   URL: {base_url}/sync")
        print(f"   Data: {json.dumps(sync_data, indent=2)}")
        print(f"   Headers: {headers}")
        
        response = requests.post(f"{base_url}/sync", 
                               json=sync_data,
                               headers=headers,
                               timeout=30)
        
        print(f"   Response Status: {response.status_code}")
        print(f"   Response Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"   Response JSON:")
            print(json.dumps(response_data, indent=4, ensure_ascii=False))
        except:
            print(f"   Response Text: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Sync request hatası: {e}")
    
    print()
    
    # Test 3: Basit config test
    print("3. Minimal config test:")
    test_config = {
        "shopifyUrl": "https://test-store.myshopify.com",
        "shopifyAdminToken": "shpat_test123"
    }
    
    try:
        # Config kaydet
        config_response = requests.post(f"{base_url}/config", 
                                      json=test_config,
                                      headers={'Content-Type': 'application/json'},
                                      timeout=10)
        
        if config_response.status_code == 200:
            print("   ✅ Test config kaydedildi")
            
            # Hemen sync dene
            sync_response = requests.post(f"{base_url}/sync", 
                                        json={"options": {"testMode": True}},
                                        headers={'Content-Type': 'application/json'},
                                        timeout=30)
            
            print(f"   Sync Status: {sync_response.status_code}")
            
            if sync_response.status_code == 400:
                sync_data = sync_response.json()
                print(f"   Sync Error: {sync_data.get('message', 'Bilinmeyen hata')}")
                
                if 'debug' in sync_data:
                    debug = sync_data['debug']
                    print(f"   Debug Info:")
                    print(f"   - Config Source: {debug.get('configSource', {})}")
                    print(f"   - Has Store URL: {debug.get('hasStoreUrl', False)}")
                    print(f"   - Has Token: {debug.get('hasToken', False)}")
        else:
            print(f"   ❌ Test config kaydedilemedi: {config_response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Minimal test hatası: {e}")
    
    print("\n=== SYNC DEBUG TAMAMLANDI ===")

if __name__ == "__main__":
    debug_sync_issue()
