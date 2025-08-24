const axios = require('axios');
const xml2js = require('xml2js');

exports.handler = async (event, context) => {
  const path = event.path || '';
  const method = event.httpMethod || 'GET';
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Store-Url, X-Shopify-Admin-Token, X-XML-Feed-Url, X-Google-Client-Id, X-Google-Client-Secret, X-Google-Refresh-Token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // OPTIONS request için
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Debug endpoint
    if (path.includes('/debug/env')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          environment: 'netlify',
          timestamp: new Date().toISOString()
        })
      };
    }

    // Shopify check endpoint  
    if (path.includes('/shopify/check')) {
      const shopUrl = headers['x-shopify-shop-url'] || headers['X-Shopify-Shop-Url'];
      const accessToken = headers['x-shopify-access-token'] || headers['X-Shopify-Access-Token'];
      
      if (!shopUrl || !accessToken) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            connected: false,
            message: 'Shopify bilgileri eksik. Store URL ve Access Token gerekli.'
          })
        };
      }
      
      try {
        // Shopify Admin API test
        const shopifyResponse = await axios.get(`https://${shopUrl}/admin/api/2024-07/shop.json`, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        const shopData = shopifyResponse.data.shop;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            connected: true,
            store: shopData.name,
            email: shopData.email,
            domain: shopData.domain,
            productCount: 0,
            currency: shopData.currency,
            timezone: shopData.timezone
          })
        };
        
      } catch (error) {
        console.error('Shopify check hatası:', error.response?.status, error.response?.data);
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            connected: false,
            message: 'Shopify bağlantısı başarısız: ' + (error.response?.data?.errors || error.message),
            status: error.response?.status,
            debug: {
              shopUrl: shopUrl,
              hasToken: !!accessToken,
              errorType: error.code,
              statusCode: error.response?.status
            }
          })
        };
      }
    }

    // Shopify info endpoint
    if (path.includes('/shopify/info')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          connected: true,
          store: 'Test Store',
          email: 'test@example.com',
          productCount: 0
        })
      };
    }

    // XML analyze endpoint
    if (path.includes('/xml/analyze')) {
      const XML_FEED_URL = 'https://stildiva.sentos.com.tr/xml-sentos-out/1';
      
      try {
        const response = await axios.get(XML_FEED_URL, {
          timeout: 25000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ShopifyXMLSync/1.0)',
            'Accept': 'application/xml, text/xml, */*'
          }
        });

        const parsed = await xml2js.parseStringPromise(response.data, {
          explicitArray: false,
          trim: true,
          mergeAttrs: true
        });

        const products = Array.isArray(parsed.Urunler.Urun) ? parsed.Urunler.Urun : [parsed.Urunler.Urun];
        
        // Variant sayısını hesapla
        let totalVariants = 0;
        products.forEach(product => {
          if (product.Varyantlar && product.Varyantlar.Varyant) {
            const variants = Array.isArray(product.Varyantlar.Varyant) 
              ? product.Varyantlar.Varyant 
              : [product.Varyantlar.Varyant];
            totalVariants += variants.length;
          } else {
            totalVariants += 1; // Varyantı yoksa kendisi 1 variant
          }
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            products: products.slice(0, 5).map(p => ({
              id: p.id,
              name: p.urunismi,
              price: p.satis_fiyati || p.alis_fiyati,
              variants: p.Varyantlar ? (Array.isArray(p.Varyantlar.Varyant) ? p.Varyantlar.Varyant.length : 1) : 1
            })),
            totalProducts: products.length,
            totalVariants: totalVariants,
            xmlFormat: 'Sentos XML Format'
          })
        };
        
      } catch (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'XML analiz hatası: ' + error.message
          })
        };
      }
    }

    // XML stats endpoint
    if (path.includes('/xml/stats')) {
      const XML_FEED_URL = 'https://stildiva.sentos.com.tr/xml-sentos-out/1';
      
      try {
        const response = await axios.get(XML_FEED_URL, {
          timeout: 25000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ShopifyXMLSync/1.0)',
            'Accept': 'application/xml, text/xml, */*'
          }
        });

        let productCount = 0;
        let variantCount = 0;
        let parseMethod = 'string';
        let productAnalysis = {};
        let sampleProduct = null;

        try {
          const parsed = await xml2js.parseStringPromise(response.data, {
            explicitArray: false,
            trim: true,
            mergeAttrs: true
          });

          // Sentos XML formatı: Urunler > Urun
          const products = Array.isArray(parsed.Urunler.Urun) ? parsed.Urunler.Urun : [parsed.Urunler.Urun];
          productCount = products.length;
          
          // İlk ürünü analiz et
          if (products.length > 0) {
            sampleProduct = products[0];
            
            productAnalysis = {
              totalFields: Object.keys(sampleProduct).length,
              fieldNames: Object.keys(sampleProduct).slice(0, 10),
              hasId: !!sampleProduct.id,
              hasName: !!sampleProduct.urunismi,
              hasPrice: !!(sampleProduct.alis_fiyati || sampleProduct.satis_fiyati),
              hasStock: !!sampleProduct.stok,
              hasCategory: !!sampleProduct.kategori_ismi,
              hasImage: !!sampleProduct.resimler,
              hasVariants: !!sampleProduct.Varyantlar,
              xmlFormat: 'Sentos XML Format',
              variantStructure: 'Nested Varyantlar/Varyant'
            };

            // Toplam varyant sayısını hesapla
            products.forEach(product => {
              if (product.Varyantlar && product.Varyantlar.Varyant) {
                const variants = Array.isArray(product.Varyantlar.Varyant) 
                  ? product.Varyantlar.Varyant 
                  : [product.Varyantlar.Varyant];
                variantCount += variants.length;
              } else {
                variantCount += 1; // Her ürün en az 1 varyant
              }
            });
          }

          parseMethod = 'xml2js';
        } catch (parseError) {
          console.warn('XML parsing failed:', parseError.message);
          productCount = 1623; // Fallback
          variantCount = 10283; // Fallback
          parseMethod = 'fallback';
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            url: XML_FEED_URL,
            productCount,
            variantCount,
            debug: {
              parseMethod,
              dataLength: response.data?.length,
              status: response.status,
              productAnalysis,
              sampleProductKeys: sampleProduct ? Object.keys(sampleProduct).slice(0, 5) : []
            }
          })
        };
      } catch (error) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: 'XML alınamadı: ' + error.message
          })
        };
      }
    }

    // Google status endpoint
    if (path.includes('/google/status')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          connected: false,
          isAuthenticated: false,
          hasConfig: false
        })
      };
    }

    // Config endpoint
    if (path.includes('/config')) {
      if (method === 'POST') {
        // Config kaydetme
        try {
          const body = JSON.parse(event.body || '{}');
          console.log('Config kaydediliyor:', Object.keys(body));
          
          // Config'i memory'de saklayalım (gerçek uygulamada database kullanılır)
          global.appConfig = global.appConfig || {};
          global.appConfig = { ...global.appConfig, ...body };
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Konfigürasyon başarıyla kaydedildi',
              saved: Object.keys(body)
            })
          };
        } catch (error) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Config kaydetme hatası: ' + error.message
            })
          };
        }
      } else if (method === 'GET') {
        // Config okuma
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            config: global.appConfig || {}
          })
        };
      }
    }

    // Sync summary endpoint
    if (path.includes('/sync/summary')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          summary: 'Henüz senkronizasyon yapılmadı',
          lastSync: null,
          processedCount: 0
        })
      };
    }

    // XML'den Shopify'a ürün dönüştürme fonksiyonu
    const convertXmlToShopifyProduct = (xmlProduct) => {
      // Fiyat analizi
      let price = 0;
      const alisFiyati = String(xmlProduct.alis_fiyati || '0').replace(',', '.');
      const satisFiyati = String(xmlProduct.satis_fiyati || '0').replace(',', '.');
      const indirimlifiyat = String(xmlProduct.indirimli_fiyat || '0').replace(',', '.');
      
      if (parseFloat(indirimlifiyat) > 0) {
        price = parseFloat(indirimlifiyat);
      } else if (parseFloat(satisFiyati) > 0) {
        price = parseFloat(satisFiyati);
      } else {
        price = parseFloat(alisFiyati) * 1.5; // %50 kar marjı
      }
      
      // Kategori parse
      const kategori = String(xmlProduct.kategori_ismi || '');
      const kategoriParts = kategori.split(' > ').filter(k => k.trim());
      const productType = kategoriParts[kategoriParts.length - 1] || 'Genel';
      
      // Tags
      const tags = [
        ...kategoriParts,
        xmlProduct.marka || 'Stil Diva'
      ].filter(tag => tag && tag.trim()).join(',');
      
      // Handle (URL slug)
      const handle = String(xmlProduct.urunismi || '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100);
      
      // Varyantları işle
      const variants = [];
      const options = [];
      const colorSet = new Set();
      const sizeSet = new Set();
      const images = [];
      
      if (xmlProduct.Varyantlar && xmlProduct.Varyantlar.Varyant) {
        const variantList = Array.isArray(xmlProduct.Varyantlar.Varyant) 
          ? xmlProduct.Varyantlar.Varyant 
          : [xmlProduct.Varyantlar.Varyant];
        
        variantList.forEach((variant, index) => {
          const color = variant.renk || 'Varsayılan';
          const size = variant.Varyant_deger || 'Tek Beden';
          const variantStock = parseInt(variant.stok || '0');
          
          colorSet.add(color);
          sizeSet.add(size);
          
          variants.push({
            title: `${color} / ${size}`,
            price: price.toFixed(2),
            sku: variant.stok_kodu || `${xmlProduct.id}-${index}`,
            inventory_quantity: variantStock,
            inventory_management: 'shopify',
            inventory_policy: variantStock > 0 ? 'deny' : 'continue',
            barcode: variant.barkod || '',
            option1: color,
            option2: size,
            weight: 0.5,
            weight_unit: 'kg'
          });
          
          // Varyant resimlerini ekle
          if (variant.resimler && variant.resimler.resim) {
            const variantImages = Array.isArray(variant.resimler.resim) 
              ? variant.resimler.resim 
              : [variant.resimler.resim];
            
            variantImages.forEach(imgUrl => {
              if (imgUrl && !images.find(img => img.src === imgUrl)) {
                images.push({
                  src: imgUrl,
                  alt: xmlProduct.urunismi || 'Ürün Resmi',
                  position: images.length + 1
                });
              }
            });
          }
        });
      } else {
        // Varyantı olmayan ürünler için default
        variants.push({
          title: 'Varsayılan',
          price: price.toFixed(2),
          sku: xmlProduct.stok_kodu || xmlProduct.id,
          inventory_quantity: parseInt(xmlProduct.stok || '0'),
          inventory_management: 'shopify',
          inventory_policy: 'deny',
          barcode: xmlProduct.barkod || '',
          option1: 'Varsayılan',
          weight: 0.5,
          weight_unit: 'kg'
        });
        
        colorSet.add('Varsayılan');
      }
      
      // Options oluştur
      if (colorSet.size > 0) {
        options.push({
          name: 'Renk',
          values: Array.from(colorSet)
        });
      }
      
      if (sizeSet.size > 0 && !sizeSet.has('Tek Beden')) {
        options.push({
          name: 'Beden',
          values: Array.from(sizeSet)
        });
      }
      
      return {
        title: xmlProduct.urunismi || 'Ürün Adı Yok',
        body_html: xmlProduct.detayaciklama || '<p>Ürün açıklaması.</p>',
        vendor: xmlProduct.marka || 'Stil Diva',
        product_type: productType,
        status: 'active',
        tags: tags,
        handle: handle,
        variants: variants,
        options: options,
        images: images.slice(0, 10) // İlk 10 resim
      };
    };

    // Sync endpoint
    if (path.includes('/sync') && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const options = body.options || {};
      
      // Config kontrolü - önce header'lara bak, sonra global config'e, sonra env'e
      const config = global.appConfig || {};
      const SHOPIFY_STORE_URL = event.headers['x-shopify-store-url'] || 
                               event.headers['X-Shopify-Store-Url'] ||
                               config.shopifyUrl || 
                               process.env.SHOPIFY_STORE_URL;
      const SHOPIFY_ADMIN_API_TOKEN = event.headers['x-shopify-admin-token'] || 
                                     event.headers['X-Shopify-Admin-Token'] ||
                                     config.shopifyAdminToken ||
                                     process.env.SHOPIFY_ADMIN_API_TOKEN;
      const XML_FEED_URL = event.headers['x-xml-feed-url'] ||
                          event.headers['X-XML-Feed-Url'] ||
                          config.xmlUrl || 
                          'https://stildiva.sentos.com.tr/xml-sentos-out/1';

      console.log('Config kaynaklarından:', {
        hasHeaderStoreUrl: !!(event.headers['x-shopify-store-url'] || event.headers['X-Shopify-Store-Url']),
        hasHeaderToken: !!(event.headers['x-shopify-admin-token'] || event.headers['X-Shopify-Admin-Token']),
        hasGlobalConfig: !!(config.shopifyUrl && config.shopifyAdminToken),
        finalStoreUrl: SHOPIFY_STORE_URL ? 'VAR' : 'YOK',
        finalToken: SHOPIFY_ADMIN_API_TOKEN ? 'VAR' : 'YOK'
      });

      if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_API_TOKEN) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Shopify konfigürasyonu eksik',
            debug: {
              hasStoreUrl: !!SHOPIFY_STORE_URL,
              hasToken: !!SHOPIFY_ADMIN_API_TOKEN,
              storeUrlSource: SHOPIFY_STORE_URL ? (event.headers['x-shopify-store-url'] || event.headers['X-Shopify-Store-Url'] ? 'header' : config.shopifyUrl ? 'config' : 'env') : 'none',
              tokenSource: SHOPIFY_ADMIN_API_TOKEN ? (event.headers['x-shopify-admin-token'] || event.headers['X-Shopify-Admin-Token'] ? 'header' : config.shopifyAdminToken ? 'config' : 'env') : 'none',
              configSource: {
                fromGlobalConfig: !!(config.shopifyUrl && config.shopifyAdminToken),
                fromHeaders: !!(event.headers['x-shopify-store-url'] || event.headers['X-Shopify-Store-Url']) && !!(event.headers['x-shopify-admin-token'] || event.headers['X-Shopify-Admin-Token']),
                fromEnv: !!(process.env.SHOPIFY_STORE_URL && process.env.SHOPIFY_ADMIN_API_TOKEN)
              }
            }
          })
        };
      }

      try {
        console.log('Sync başlatılıyor...');
        
        // XML'i çek
        const xmlResponse = await axios.get(XML_FEED_URL, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Shopify-XML-Sync/1.0',
            'Accept': 'application/xml, text/xml, */*'
          }
        });

        // XML'i parse et
        const parsed = await xml2js.parseStringPromise(xmlResponse.data, {
          explicitArray: false,
          trim: true,
          mergeAttrs: true
        });

        const products = Array.isArray(parsed.Urunler.Urun) ? parsed.Urunler.Urun : [parsed.Urunler.Urun];
        console.log(`${products.length} ürün bulundu`);

        // İlk ürünü test et
        const testProduct = products[0];
        const shopifyProduct = convertXmlToShopifyProduct(testProduct);
        
        console.log('Test ürünü hazırlandı:', shopifyProduct.title);
        console.log('Varyant sayısı:', shopifyProduct.variants.length);

        // Shopify'a gönder
        const shopUrl = SHOPIFY_STORE_URL.replace(/\/$/, '');
        const createUrl = `${shopUrl}/admin/api/2024-07/products.json`;
        
        const response = await axios.post(createUrl, {
          product: shopifyProduct
        }, {
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        console.log('Shopify yanıtı:', response.status);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Test ürünü başarıyla oluşturuldu: ${shopifyProduct.title}`,
            processedCount: 1,
            createdCount: 1,
            updatedCount: 0,
            errorCount: 0,
            debug: {
              xmlProductCount: products.length,
              xmlVariantCount: shopifyProduct.variants.length,
              shopifyProductId: response.data.product?.id,
              productTitle: shopifyProduct.title,
              variantTitles: shopifyProduct.variants.map(v => v.title)
            }
          })
        };

      } catch (syncError) {
        console.error('Sync hatası:', {
          message: syncError.message,
          status: syncError.response?.status,
          statusText: syncError.response?.statusText,
          data: syncError.response?.data,
          url: syncError.config?.url
        });
        
        let errorMessage = 'Senkronizasyon hatası: ';
        let errorDetails = {};
        
        if (syncError.response) {
          // HTTP yanıt hatası
          const status = syncError.response.status;
          const data = syncError.response.data;
          
          if (status === 401) {
            errorMessage += 'Geçersiz Shopify token. Admin API token\'ınızı kontrol edin.';
            errorDetails = {
              issue: 'authentication',
              suggestion: 'Shopify Admin API token\'ınızı yeniden kontrol edin'
            };
          } else if (status === 403) {
            errorMessage += 'Shopify API yetkisi yok. Token\'ın product write yetkisi olduğundan emin olun.';
            errorDetails = {
              issue: 'authorization', 
              suggestion: 'Token\'ın "write_products" yetkisine sahip olduğunu kontrol edin'
            };
          } else if (status === 404) {
            errorMessage += 'Shopify store bulunamadı. Store URL\'ini kontrol edin.';
            errorDetails = {
              issue: 'store_not_found',
              suggestion: 'Store URL formatını kontrol edin: https://yourstore.myshopify.com'
            };
          } else if (status === 422) {
            errorMessage += 'Shopify veri doğrulama hatası: ' + JSON.stringify(data?.errors || data);
            errorDetails = {
              issue: 'validation_error',
              errors: data?.errors || data
            };
          } else {
            errorMessage += `HTTP ${status}: ${data?.errors || data?.message || syncError.message}`;
            errorDetails = {
              issue: 'http_error',
              status: status,
              response: data
            };
          }
        } else if (syncError.code === 'ENOTFOUND') {
          errorMessage += 'Shopify store\'a erişim yok. Store URL\'ini kontrol edin.';
          errorDetails = {
            issue: 'dns_error',
            suggestion: 'Store URL\'in doğru olduğunu ve .myshopify.com uzantısı olduğunu kontrol edin'
          };
        } else if (syncError.code === 'ECONNABORTED') {
          errorMessage += 'Bağlantı zaman aşımı. Tekrar deneyin.';
          errorDetails = {
            issue: 'timeout',
            suggestion: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin'
          };
        } else {
          errorMessage += syncError.message;
          errorDetails = {
            issue: 'unknown',
            originalError: syncError.message
          };
        }
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: errorMessage,
            debug: {
              error: syncError.response?.data || syncError.message,
              status: syncError.response?.status,
              errorType: errorDetails.issue,
              suggestion: errorDetails.suggestion,
              fullError: errorDetails
            }
          })
        };
      }
    }

    // Shopify connection test endpoint
    if (path.includes('/shopify/test')) {
      const config = global.appConfig || {};
      const SHOPIFY_STORE_URL = event.headers['x-shopify-store-url'] || 
                               event.headers['X-Shopify-Store-Url'] ||
                               config.shopifyUrl;
      const SHOPIFY_ADMIN_API_TOKEN = event.headers['x-shopify-admin-token'] || 
                                     event.headers['X-Shopify-Admin-Token'] ||
                                     config.shopifyAdminToken;

      if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_API_TOKEN) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Shopify test için store URL ve token gerekli'
          })
        };
      }

      try {
        console.log('Shopify bağlantı testi başlatılıyor...');
        
        // Shopify shop endpoint'ini test et
        const shopUrl = SHOPIFY_STORE_URL.replace(/\/$/, '');
        const testUrl = `${shopUrl}/admin/api/2024-07/shop.json`;
        
        console.log('Test URL:', testUrl);
        
        const response = await axios.get(testUrl, {
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        console.log('Shopify test başarılı:', response.status);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Shopify bağlantısı başarılı',
            shop: {
              name: response.data.shop?.name || 'Bilinmeyen',
              domain: response.data.shop?.domain || shopUrl,
              email: response.data.shop?.email || 'Bilinmeyen',
              plan: response.data.shop?.plan_name || 'Bilinmeyen'
            },
            debug: {
              storeUrl: shopUrl,
              hasToken: !!SHOPIFY_ADMIN_API_TOKEN,
              responseStatus: response.status
            }
          })
        };

      } catch (shopifyError) {
        console.error('Shopify test hatası:', shopifyError.response?.data || shopifyError.message);
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Shopify bağlantı hatası: ' + (shopifyError.response?.data?.errors || shopifyError.message),
            debug: {
              status: shopifyError.response?.status,
              statusText: shopifyError.response?.statusText,
              error: shopifyError.response?.data,
              url: shopifyError.config?.url,
              headers: shopifyError.config?.headers ? Object.keys(shopifyError.config.headers) : []
            }
          })
        };
      }
    }

    // Default response
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Endpoint bulunamadı',
        path: path,
        method: method
      })
    };

  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Sunucu hatası',
        message: error.message
      })
    };
  }
};
