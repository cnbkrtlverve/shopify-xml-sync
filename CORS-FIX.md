# CORS Sorunu ve Çözümleri

## 🚨 Önemli Bilgi

GitHub Pages üzerinde çalışan uygulamalar, **doğrudan** Shopify API'sine erişemez. Bunun nedeni CORS (Cross-Origin Resource Sharing) politikalarıdır.

## 🔧 Çözüm Seçenekleri

### Seçenek 1: Browser Extension Kullanın (Önerilen)
1. Chrome/Edge için "CORS Unblock" veya "Disable CORS" eklentisi yükleyin
2. Eklentiyi aktif edin
3. Uygulamayı yeniden yüklemeyi deneyin

### Seçenek 2: Chrome'u CORS Devre Dışı Başlatın
```bash
# Windows için
chrome.exe --user-data-dir=/tmp/chrome --disable-web-security --disable-features=VizDisplayCompositor

# Mac için  
open -n -a /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --args --user-data-dir="/tmp/chrome_dev_test" --disable-web-security
```

### Seçenek 3: Farklı Tarayıcı Kullanın
- Firefox'ta `about:config` üzerinden `security.tls.insecure_fallback_hosts` ayarını düzenleyin
- Safari'de Geliştirici menüsünden CORS'u devre dışı bırakın

## ⚠️ Güvenlik Uyarısı

CORS devre dışı bırakıldığında güvenlik riskleri vardır. Bu ayarları sadece test amaçlı kullanın ve işiniz bittiğinde normal tarayıcı moduna dönün.

## 🎯 Test Adımları

1. Yukarıdaki yöntemlerden birini uygulayın
2. Ayarlar sekmesine gidin
3. "Shopify Bağlantısını Test Et" butonuna tıklayın
4. Başarılı olursa ana sayfaya dönün ve senkronizasyonu deneyin

## 📞 Yardım

CORS sorunu devam ederse, lütfen repository'de issue açın.
