# Vervegrand Shopify Sync Panel

Bu proje, GitHub Pages üzerinde çalışacak şekilde statik bir web uygulaması olarak yeniden yapılandırılmıştır.

## 🚀 GitHub Pages'te Yayınlama

1. Bu repository'yi GitHub'a push edin
2. Repository ayarlarında "Pages" bölümüne gidin
3. Source olarak "Deploy from a branch" seçin
4. Branch olarak "main" ve folder olarak "/ (root)" seçin
5. Save butonuna tıklayın

## 🔐 Giriş Bilgileri

**Kullanıcı Adı:** `admin`
**Şifre:** `vervegrand2024`

## ⚙️ İlk Kurulum

1. Panele giriş yaptıktan sonra "Ayarlar" sekmesine gidin
2. Aşağıdaki bilgileri girin:
   - **Shopify Store URL:** `your-store.myshopify.com` (https:// olmadan)
   - **Shopify Admin API Token:** Shopify admin panelinden aldığınız token
   - **XML Feed URL:** XML beslenme kaynağınızın tam URL'si

3. "Ayarları Kaydet" butonuna tıklayın

## 🔧 Özellikler

- **Tam Senkronizasyon:** Tüm ürün bilgilerini günceller
- **Kısmi Senkronizasyon:** Sadece seçilen alanları günceller
  - Sadece Fiyat
  - Sadece Stok
  - Sadece Açıklama
  - Sadece Fotoğraflar

## 📱 Kullanım

1. Ana sayfa üzerinden Shopify ve XML bağlantı durumlarını kontrol edin
2. Senkronizasyon seçeneklerini belirleyin
3. "Senkronizasyonu Başlat" butonuna tıklayın
4. Log alanından işlem durumunu takip edin

## 🔒 Güvenlik Notları

- Tüm API anahtarları tarayıcının localStorage'ında saklanır
- Oturum bilgileri sessionStorage'da tutulur
- CORS kısıtlamaları için XML verisi proxy üzerinden alınır

## 🛠️ Teknik Detaylar

- **Teknoloji:** Vanilla JavaScript, HTML5, CSS3
- **API'ler:** Shopify Admin API, AllOrigins CORS Proxy
- **Depolama:** Browser LocalStorage & SessionStorage
- **Hosting:** GitHub Pages

## 📞 Destek

Herhangi bir sorun yaşarsanız, repository'de issue açabilirsiniz.