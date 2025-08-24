# Shopify XML Sync

XML dosyalarını Shopify ile senkronize eden web uygulaması.

## Özellikler

- XML dosyalarından ürün bilgilerini okuma
- Shopify Admin API ile ürün oluşturma/güncelleme
- Stok takibi ve fiyat senkronizasyonu
- Browser tabanlı uygulama
- CORS sorunları için Netlify proxy desteği

## Netlify Deployment

### 1. GitHub Repository'ye Push

```bash
git add .
git commit -m "Netlify edge function proxy eklendi"
git push origin main
```

### 2. Netlify'de Deploy

1. [Netlify](https://app.netlify.com) hesabınıza giriş yapın
2. "New site from Git" butonuna tıklayın
3. GitHub repository'nizi seçin
4. Deploy ayarları:
   - **Build command:** `npm run build` (veya boş bırakın)
   - **Publish directory:** `.` (kök dizin)
5. "Deploy site" butonuna tıklayın

### 3. Environment Variables (Opsiyonel)

Netlify dashboard'da Settings > Environment variables kısmından:
- `NODE_ENV` = `production`

## Kullanım

1. Uygulamayı açın
2. Shopify mağaza bilgilerinizi girin:
   - Mağaza URL'i (örn: `mystore.myshopify.com`)
   - Admin API Access Token
   - Storefront API Access Token
3. XML dosyasını seçin
4. "Senkronize Et" butonuna tıklayın

## API Token'ları

### Admin API Token
1. Shopify Admin > Settings > Apps and sales channels
2. "Develop apps for your store" > "Create an app"
3. Admin API access token oluşturun
4. Gerekli izinler: `write_products`, `read_products`

### Storefront API Token
1. Shopify Admin > Settings > Apps and sales channels
2. "Develop apps for your store" > App'inizi seçin
3. Storefront API access token oluşturun

## Teknik Detaylar

- **Frontend:** Vanilla JavaScript, HTML, CSS
- **Backend:** Netlify Edge Functions (CORS proxy)
- **API:** Shopify Admin API 2024-07, Storefront API
- **Hosting:** Netlify (otomatik deployment)

## CORS Çözümü

Uygulama, Shopify Admin API'ye erişim için Netlify Edge Functions kullanarak CORS sorununu çözer. Proxy fonksiyonu `netlify/edge-functions/shopify-proxy.js` dosyasında bulunur.

## Dosya Yapısı

```
/
├── netlify/
│   ├── edge-functions/
│   │   └── shopify-proxy.js    # CORS proxy
│   └── netlify.toml            # Netlify config
├── public/
│   ├── css/
│   ├── js/
│   └── ...
├── index.html
└── package.json
```
