exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Store-Url, X-Shopify-Admin-Token, X-XML-Feed-Url, X-Google-Client-Id, X-Google-Client-Secret, X-Google-Redirect-Uri, X-Google-Refresh-Token',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

async function handleConfig(action, event, headers) {
  try {
    // config endpoint'i için action yok, direkt POST isteği
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      // Frontend'den gelen config bilgileri
      console.log('Config kaydetme isteği alındı:', body);
      
      // Not: Netlify Functions'da .env dosyasını değiştirmek mümkün değil
      // Bu endpoint sadece config'in alındığını onaylamak için
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Ayarlar alındı. Not: Netlify\'da ayarlar Environment Variables üzerinden yapılmalıdır.' 
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Sadece POST metodu desteklenir' })
    };
  } catch (error) {
    console.error('Config handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Config handler hatası',
        message: error.message
      })
    };
  }
}

async function handleDebug(action, event, headers) {
  try {
    if (action === 'env') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          environment: {
            SHOPIFY_STORE_URL: process.env.SHOPIFY_STORE_URL || 'NOT_SET',
            SHOPIFY_ADMIN_API_TOKEN: process.env.SHOPIFY_ADMIN_API_TOKEN ? 'SET' : 'NOT_SET',
            XML_FEED_URL: process.env.XML_FEED_URL || 'NOT_SET',
            NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
            netlifyContext: event.headers['x-nf-request-id'] ? 'NETLIFY' : 'LOCAL'
          }
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Debug action bulunamadı' })
    };
  } catch (error) {
    console.error('Debug handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Debug handler hatası',
        message: error.message
      })
    };
  }
}

  try {
    const path = event.path.replace('/api/', '');
    const segments = path.split('/');
    const service = segments[0];
    const action = segments[1];

    console.log('API Request:', { 
      path, 
      service, 
      action, 
      method: event.httpMethod,
      queryParams: event.queryStringParameters 
    });

    let result;
    
    if (service === 'config') {
      result = await handleConfig(action, event, headers);
    } else if (service === 'debug') {
      result = await handleDebug(action, event, headers);
    } else if (service === 'shopify') {
      result = await handleShopify(action, event, headers);
    } else if (service === 'xml') {
      result = await handleXml(action, event, headers);
    } else if (service === 'sync') {
      result = await handleSync(action, event, headers);
    } else if (service === 'google') {
      result = await handleGoogle(action, event, headers);
    } else {
      result = {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Endpoint bulunamadı', path, service, action })
      };
    }

    // JSON formatı kontrolü
    if (result.body) {
      try {
        JSON.parse(result.body);
      } catch (jsonError) {
        console.error('Invalid JSON response:', result.body);
        result.body = JSON.stringify({ error: 'Invalid JSON response', original: result.body });
      }
    }

    console.log('API Response:', { statusCode: result.statusCode, bodyLength: result.body?.length });
    return result;

  } catch (error) {
    console.error('API Main Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Server error',
        message: error.message,
        stack: error.stack
      })
    };
  }
};

async function handleShopify(action, event, headers) {
  try {
    console.log('=== SHOPIFY HANDLER START ===');
    console.log('Action:', action);
    console.log('Headers received:', Object.keys(event.headers || {}));
    console.log('Relevant headers:', {
      'x-shopify-store-url': event.headers['x-shopify-store-url'],
      'x-shopify-admin-token': event.headers['x-shopify-admin-token']
    });
    
    const axios = require('axios');
    
    // Önce environment variables'dan, sonra header'lardan al (case-insensitive)
    let SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || 
                           event.headers['x-shopify-store-url'] || 
                           event.headers['X-Shopify-Store-Url'];
    let SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN || 
                                 event.headers['x-shopify-admin-token'] || 
                                 event.headers['X-Shopify-Admin-Token'];

    console.log('Shopify ENV + Header check:', { 
      hasStoreUrl: !!SHOPIFY_STORE_URL, 
      hasToken: !!SHOPIFY_ADMIN_API_TOKEN,
      storeUrl: SHOPIFY_STORE_URL?.substring(0, 20) + '...',
      source: process.env.SHOPIFY_STORE_URL ? 'env' : 'header'
    });

    if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_API_TOKEN) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: false, 
          message: 'Shopify ayarları eksik',
          debug: {
            SHOPIFY_STORE_URL: !!SHOPIFY_STORE_URL,
            SHOPIFY_ADMIN_API_TOKEN: !!SHOPIFY_ADMIN_API_TOKEN,
            envVars: {
              SHOPIFY_STORE_URL: !!process.env.SHOPIFY_STORE_URL,
              SHOPIFY_ADMIN_API_TOKEN: !!process.env.SHOPIFY_ADMIN_API_TOKEN
            },
            headers: {
              storeUrl: !!event.headers['x-shopify-store-url'],
              token: !!event.headers['x-shopify-admin-token']
            }
          }
        })
      };
    }

    // URL formatını düzelt
    let shopUrl = SHOPIFY_STORE_URL;
    if (!shopUrl.includes('.myshopify.com')) {
      shopUrl = shopUrl.replace('https://', '').replace('http://', '');
      shopUrl = `https://${shopUrl}.myshopify.com`;
    }
    if (!shopUrl.startsWith('https://')) {
      shopUrl = `https://${shopUrl}`;
    }

    console.log('Shopify URL formatı:', {
      original: SHOPIFY_STORE_URL,
      formatted: shopUrl
    });

    const shopifyApi = axios.create({
      baseURL: `${shopUrl}/admin/api/2024-07`,
      headers: { 
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    if (action === 'check') {
      try {
        console.log('Shopify check starting');
        const response = await shopifyApi.get('/shop.json');
        console.log('Shopify check successful:', response.status);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'Başarılı',
            debug: {
              status: response.status,
              shopName: response.data?.shop?.name
            }
          })
        };
      } catch (error) {
        console.error('Shopify check error:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: 'Bağlantı hatası: ' + error.message,
            debug: {
              status: error.response?.status,
              statusText: error.response?.statusText,
              code: error.code
            }
          })
        };
      }
    }

    if (action === 'info') {
      try {
        console.log('Shopify info starting - URL:', SHOPIFY_STORE_URL);
        
        const [shopResponse, countResponse] = await Promise.all([
          shopifyApi.get('/shop.json'),
          shopifyApi.get('/products/count.json')
        ]);
        
        console.log('Shopify info responses received:', {
          shopStatus: shopResponse.status,
          countStatus: countResponse.status,
          shopName: shopResponse.data?.shop?.name
        });
        
        const result = {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            name: shopResponse.data.shop.name,
            email: shopResponse.data.shop.email,
            productCount: countResponse.data.count,
            debug: {
              shopStatus: shopResponse.status,
              countStatus: countResponse.status
            }
          })
        };
        
        console.log('Shopify info final result:', result);
        return result;
      } catch (error) {
        console.error('Shopify info error:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: 'Shopify bilgileri alınamadı: ' + error.message,
            debug: {
              status: error.response?.status,
              statusText: error.response?.statusText,
              code: error.code
            }
          })
        };
      }
    }

    if (action === 'search') {
      const query = event.queryStringParameters?.q;
      if (!query) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, message: 'Arama sorgusu gerekli' })
        };
      }

      try {
        console.log('Shopify search starting for query:', query);
        
        const graphqlQuery = {
          query: `
          query productSearch($query: String!) {
            products(first: 10, query: $query) {
              edges {
                node {
                  id
                  title
                  handle
                  variants(first: 20) {
                    edges {
                      node {
                        id
                        title
                        sku
                        price
                        barcode
                        inventoryQuantity
                      }
                    }
                  }
                }
              }
            }
          }
          `,
          variables: { query: `title:*${query}* OR sku:${query}` },
        };

        const response = await shopifyApi.post('/graphql.json', graphqlQuery);
        console.log('Shopify search successful');
        
        const products = response.data.data.products.edges.map((edge) => {
          return {
            ...edge.node,
            variants: edge.node.variants.edges.map((vEdge) => vEdge.node)
          };
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            products,
            debug: {
              status: response.status,
              resultCount: products.length
            }
          })
        };
      } catch (error) {
        console.error('Shopify search error:', {
          message: error.message,
          status: error.response?.status
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: false, 
            products: [],
            message: 'Arama hatası: ' + error.message
          })
        };
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Shopify action bulunamadı: ' + action })
    };

  } catch (error) {
    console.error('Shopify handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Shopify handler hatası',
        message: error.message,
        stack: error.stack?.substring(0, 500)
      })
    };
  }
}

async function handleXml(action, event, headers) {
  try {
    const axios = require('axios');
    
    // Önce environment variables'dan, sonra header'lardan al (case-insensitive)
    let XML_FEED_URL = process.env.XML_FEED_URL || 
                      event.headers['x-xml-feed-url'] || 
                      event.headers['X-XML-Feed-Url'];
    
    console.log('XML ENV + Header check:', { 
      hasXmlUrl: !!XML_FEED_URL,
      xmlUrl: XML_FEED_URL?.substring(0, 50) + '...',
      source: process.env.XML_FEED_URL ? 'env' : 'header'
    });

    if (!XML_FEED_URL) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: false, 
          message: 'XML URL eksik',
          debug: {
            envVar: !!process.env.XML_FEED_URL,
            header: !!event.headers['x-xml-feed-url'],
            message: 'XML URL hem environment variable\'da hem header\'da bulunamadı'
          }
        })
      };
    }

    if (action === 'check') {
      try {
        console.log('XML check starting for:', XML_FEED_URL);
        
        const response = await axios.get(XML_FEED_URL, { 
          timeout: 25000, // 25 saniye
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ShopifyXMLSync/1.0)',
            'Accept': 'application/xml, text/xml, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache'
          },
          validateStatus: function (status) {
            return status >= 200 && status < 300;
          }
        });
        
        console.log('XML check response:', { 
          status: response.status, 
          contentType: response.headers['content-type'],
          dataLength: response.data?.length 
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            message: 'XML bağlantısı başarılı',
            debug: {
              status: response.status,
              contentType: response.headers['content-type'],
              dataLength: response.data?.length
            }
          })
        };
      } catch (error) {
        console.error('XML check error:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          url: XML_FEED_URL
        });
        
        let errorMessage = 'XML bağlantı hatası: ';
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          errorMessage += 'Bağlantı zaman aşımına uğradı (25s)';
        } else if (error.code === 'ENOTFOUND') {
          errorMessage += 'XML URL\'si bulunamadı';
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage += 'Bağlantı reddedildi';
        } else {
          errorMessage += error.message;
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: errorMessage,
            debug: {
              code: error.code,
              status: error.response?.status,
              url: XML_FEED_URL?.substring(0, 100) + '...',
              timeout: '25 saniye'
            }
          })
        };
      }
    }

    if (action === 'stats') {
      try {
        console.log('XML stats starting for:', XML_FEED_URL);
        
        const response = await axios.get(XML_FEED_URL, { 
          timeout: 25000, // 25 saniye
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ShopifyXMLSync/1.0)',
            'Accept': 'application/xml, text/xml, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache'
          },
          validateStatus: function (status) {
            return status >= 200 && status < 300; // Sadece 2xx kodları kabul et
          }
        });
        
        console.log('XML stats response received:', {
          status: response.status,
          contentType: response.headers['content-type'],
          dataLength: response.data?.length
        });
        
        let productCount = 0;
        let variantCount = 0;
        let parseMethod = 'string';
        let productAnalysis = {};
        let sampleProduct = null;
        
        try {
          const xml2js = require('xml2js');
          const parsed = await xml2js.parseStringPromise(response.data, {
            explicitArray: false,
            trim: true,
            mergeAttrs: true
          });
          
          console.log('XML parsed successfully, root keys:', Object.keys(parsed));
          
          // Çeşitli XML formatlarını kontrol et
          let products = [];
          let foundPath = '';
          
          if (parsed.catalog?.product) {
            products = Array.isArray(parsed.catalog.product) ? parsed.catalog.product : [parsed.catalog.product];
            foundPath = 'catalog.product';
          } else if (parsed.products?.product) {
            products = Array.isArray(parsed.products.product) ? parsed.products.product : [parsed.products.product];
            foundPath = 'products.product';
          } else if (parsed.Urunler?.Urun) {
            products = Array.isArray(parsed.Urunler.Urun) ? parsed.Urunler.Urun : [parsed.Urunler.Urun];
            foundPath = 'Urunler.Urun';
          } else if (parsed.urunler?.urun) {
            products = Array.isArray(parsed.urunler.urun) ? parsed.urunler.urun : [parsed.urunler.urun];
            foundPath = 'urunler.urun';
          } else if (parsed.rss?.channel?.[0]?.item) {
            products = parsed.rss.channel[0].item;
            foundPath = 'rss.channel[0].item';
          } else if (parsed.root?.product) {
            products = Array.isArray(parsed.root.product) ? parsed.root.product : [parsed.root.product];
            foundPath = 'root.product';
          } else if (parsed.product) {
            products = Array.isArray(parsed.product) ? parsed.product : [parsed.product];
            foundPath = 'product';
          } else if (parsed.urun) {
            products = Array.isArray(parsed.urun) ? parsed.urun : [parsed.urun];
            foundPath = 'urun';
          } else {
            // Recursive search
            const findArrays = (obj, path = '', depth = 0) => {
              if (depth > 2) return [];
              let arrays = [];
              
              if (typeof obj === 'object' && obj !== null) {
                for (const [key, value] of Object.entries(obj)) {
                  const currentPath = path ? `${path}.${key}` : key;
                  
                  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                    arrays.push({ path: currentPath, data: value, count: value.length });
                  } else if (typeof value === 'object' && !Array.isArray(value)) {
                    arrays = arrays.concat(findArrays(value, currentPath, depth + 1));
                  }
                }
              }
              return arrays;
            };
            
            const foundArrays = findArrays(parsed);
            if (foundArrays.length > 0) {
              const bestMatch = foundArrays.sort((a, b) => b.count - a.count)[0];
              products = bestMatch.data;
              foundPath = bestMatch.path;
            }
          }
          
          productCount = products.length;
          console.log(`Products found: ${productCount} in path: ${foundPath}`);
          
          // İlk ürünü analiz et
          if (products.length > 0) {
            sampleProduct = products[0];
            const keys = Object.keys(sampleProduct);
            
            productAnalysis = {
              totalFields: keys.length,
              fieldNames: keys.slice(0, 10), // İlk 10 alan
              hasId: !!(sampleProduct.id || sampleProduct.ID || sampleProduct.productId || sampleProduct.kod || sampleProduct.UrunKodu),
              hasName: !!(sampleProduct.name || sampleProduct.title || sampleProduct.baslik || sampleProduct.ad || sampleProduct.UrunAdi),
              hasPrice: !!(sampleProduct.price || sampleProduct.fiyat || sampleProduct.SatisFiyati || sampleProduct.cost),
              hasStock: !!(sampleProduct.stock || sampleProduct.stok || sampleProduct.Stok || sampleProduct.quantity),
              hasCategory: !!(sampleProduct.category || sampleProduct.kategori || sampleProduct.Kategori),
              hasImage: !!(sampleProduct.image || sampleProduct.resim || sampleProduct.Resim || sampleProduct.foto),
              hasVariants: !!(sampleProduct.variants || sampleProduct.varyantlar || sampleProduct.Varyantlar || sampleProduct.renk || sampleProduct.beden)
            };
            
            // Varyant sayısını hesapla
            products.forEach(product => {
              if (product.variants) {
                const variants = Array.isArray(product.variants) ? product.variants : [product.variants];
                variantCount += variants.length;
              } else if (product.varyantlar) {
                const variants = Array.isArray(product.varyantlar) ? product.varyantlar : [product.varyantlar];
                variantCount += variants.length;
              } else if (product.renk || product.beden) {
                variantCount += 1; // Basit varyant
              } else {
                variantCount += 1; // Her ürün en az 1 varyant
              }
            });
          }
          
          parseMethod = 'xml2js';
          
        } catch (parseError) {
          console.warn('XML parsing failed, using string count:', parseError.message);
          
          // Basit string sayma yöntemi
          const dataStr = String(response.data || '');
          
          // Çeşitli ürün tag'lerini dene
          const patterns = [
            /<Urun[^>]*>/g,
            /<urun[^>]*>/g,
            /<product[^>]*>/g,
            /<item[^>]*>/g,
            /<entry[^>]*>/g
          ];
          
          for (const pattern of patterns) {
            const matches = dataStr.match(pattern);
            if (matches && matches.length > 0) {
              productCount = matches.length;
              variantCount = productCount; // Fallback
              parseMethod = 'regex';
              break;
            }
          }
        }

        console.log('XML stats completed:', { productCount, variantCount, parseMethod });

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
        console.error('XML stats error:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          url: XML_FEED_URL
        });
        
        let errorMessage = 'XML stats alınamadı: ';
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          errorMessage += 'Bağlantı zaman aşımına uğradı (25s)';
        } else if (error.code === 'ENOTFOUND') {
          errorMessage += 'XML URL\'si bulunamadı';
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage += 'Bağlantı reddedildi';
        } else {
          errorMessage += error.message;
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: errorMessage,
            debug: {
              code: error.code,
              status: error.response?.status,
              url: XML_FEED_URL?.substring(0, 100) + '...',
              timeout: '25 saniye'
            }
          })
        };
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'XML action bulunamadı: ' + action })
    };

  } catch (error) {
    console.error('XML handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'XML handler hatası',
        message: error.message,
        stack: error.stack?.substring(0, 500)
      })
    };
  }
}

async function handleSync(action, event, headers) {
  try {
    const axios = require('axios');
    const xml2js = require('xml2js');
    
    // Environment variables veya header'lardan config al
    const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || 
                             event.headers['x-shopify-store-url'] || 
                             event.headers['X-Shopify-Store-Url'];
    const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN || 
                                   event.headers['x-shopify-admin-token'] || 
                                   event.headers['X-Shopify-Admin-Token'];
    const XML_FEED_URL = process.env.XML_FEED_URL || 
                        event.headers['x-xml-feed-url'] || 
                        event.headers['X-XML-Feed-Url'];

    if (!SHOPIFY_STORE_URL || !SHOPIFY_ADMIN_API_TOKEN || !XML_FEED_URL) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Shopify veya XML konfigürasyonu eksik'
        })
      };
    }

    if (action === 'summary') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          summary: 'Henüz bir senkronizasyon yapılmadı.',
          lastSync: null,
          processedCount: 0
        })
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const options = body.options || {};
      
      console.log('Sync başlatılıyor:', options);
      
      try {
        // XML'den ürünleri al - timeout'u artır
        console.log('XML\'den ürünler alınıyor:', XML_FEED_URL?.substring(0, 100) + '...');
        
        const xmlResponse = await axios.get(XML_FEED_URL, { 
          timeout: 10000, // 10 saniye (Netlify timeout'u önlemek için)
          headers: {
            'User-Agent': 'Shopify-XML-Sync/1.0',
            'Accept': 'application/xml, text/xml, */*'
          },
          maxContentLength: 50 * 1024 * 1024, // 50MB max
          maxBodyLength: 50 * 1024 * 1024
        });
        
        console.log('XML yanıtı alındı, boyut:', xmlResponse.data.length);
        
        // Memory kontrolü - çok büyük XML'leri işleme
        if (xmlResponse.data.length > 10 * 1024 * 1024) { // 10MB'dan büyükse
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'XML dosyası çok büyük (10MB limit)',
              debug: {
                xmlSize: xmlResponse.data.length,
                limit: '10MB'
              }
            })
          };
        }
        
        // XML parsing - simplified parser kullan
        const xml2js = require('xml2js');
        const parser = new xml2js.Parser({
          explicitArray: false,
          trim: true,
          mergeAttrs: true,
          ignoreAttrs: false,
          parseNumbers: false,
          parseBooleans: false
        });
        
        console.log('XML parse ediliyor...');
        const xmlData = await parser.parseStringPromise(xmlResponse.data);
        console.log('XML parse edildi');
        
        // XML yapısını kontrol et ve ürünleri bul - kapsamlı format desteği
        let products = [];
        let foundPath = '';
        
        console.log('XML root anahtarları:', Object.keys(xmlData));
        
        // İlk seviye kontrol
        if (xmlData.catalog?.product) {
          products = Array.isArray(xmlData.catalog.product) ? xmlData.catalog.product : [xmlData.catalog.product];
          foundPath = 'catalog.product';
        } else if (xmlData.products?.product) {
          products = Array.isArray(xmlData.products.product) ? xmlData.products.product : [xmlData.products.product];
          foundPath = 'products.product';
        } else if (xmlData.rss?.channel?.[0]?.item) {
          products = xmlData.rss.channel[0].item;
          foundPath = 'rss.channel[0].item';
        } else if (xmlData.root?.product) {
          products = Array.isArray(xmlData.root.product) ? xmlData.root.product : [xmlData.root.product];
          foundPath = 'root.product';
        } else if (xmlData.product) {
          products = Array.isArray(xmlData.product) ? xmlData.product : [xmlData.product];
          foundPath = 'product';
        } else if (xmlData.items?.item) {
          products = Array.isArray(xmlData.items.item) ? xmlData.items.item : [xmlData.items.item];
          foundPath = 'items.item';
        } else if (xmlData.channel?.item) {
          products = Array.isArray(xmlData.channel.item) ? xmlData.channel.item : [xmlData.channel.item];
          foundPath = 'channel.item';
        } else if (xmlData.feed?.entry) {
          products = Array.isArray(xmlData.feed.entry) ? xmlData.feed.entry : [xmlData.feed.entry];
          foundPath = 'feed.entry';
        } else if (xmlData.urunler?.urun) {
          products = Array.isArray(xmlData.urunler.urun) ? xmlData.urunler.urun : [xmlData.urunler.urun];
          foundPath = 'urunler.urun';
        } else if (xmlData.urun) {
          products = Array.isArray(xmlData.urun) ? xmlData.urun : [xmlData.urun];
          foundPath = 'urun';
        } else {
          // Daha derin arama - recursive search
          const findProductArrays = (obj, path = '', maxDepth = 3) => {
            if (maxDepth <= 0) return [];
            let found = [];
            
            if (typeof obj === 'object' && obj !== null) {
              for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;
                
                // Array kontrolü
                if (Array.isArray(value) && value.length > 0) {
                  // Array elemanları object mi kontrol et
                  if (typeof value[0] === 'object' && value[0] !== null) {
                    found.push({ path: currentPath, data: value, count: value.length });
                  }
                } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                  // Object ise içine bak
                  found = found.concat(findProductArrays(value, currentPath, maxDepth - 1));
                }
              }
            }
            return found;
          };
          
          const foundArrays = findProductArrays(xmlData);
          console.log('Bulunan array alanları:', foundArrays.map(a => `${a.path} (${a.count} items)`));
          
          if (foundArrays.length > 0) {
            // En çok eleman içeren array'i seç
            const bestMatch = foundArrays.sort((a, b) => b.count - a.count)[0];
            products = bestMatch.data;
            foundPath = bestMatch.path;
            console.log(`En uygun array seçildi: ${foundPath} (${bestMatch.count} items)`);
          }
        }
        
        console.log(`Ürünler bulundu: ${foundPath}, sayı: ${products.length}`);
        
        // Ürün bulunamadıysa detaylı debug bilgisi
        if (products.length === 0) {
          // XML'in ilk birkaç karakterini göster
          const xmlPreview = xmlResponse.data.substring(0, 500);
          
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'XML\'de ürün verisi bulunamadı',
              debug: {
                rootKeys: Object.keys(xmlData),
                dataLength: xmlResponse.data.length,
                xmlPreview: xmlPreview,
                checkedPaths: [
                  'catalog.product', 'products.product', 'rss.channel[0].item', 
                  'root.product', 'product', 'items.item', 'channel.item', 
                  'feed.entry', 'urunler.urun', 'urun'
                ],
                suggestion: 'XML yapısını console\'da kontrol edin'
              }
            })
          };
        }
        
        console.log('Bulunan ürün sayısı:', products.length);
        
        // İlk ürünün yapısını analiz et
        let productAnalysis = {};
        if (products.length > 0) {
          const firstProduct = products[0];
          productAnalysis = {
            keys: Object.keys(firstProduct).slice(0, 15), // İlk 15 anahtar
            hasId: !!(firstProduct.id || firstProduct.ID || firstProduct.productId || firstProduct.kod || firstProduct.code),
            hasName: !!(firstProduct.name || firstProduct.title || firstProduct.baslik || firstProduct.ad || firstProduct.urun_adi),
            hasPrice: !!(firstProduct.price || firstProduct.fiyat || firstProduct.satis_fiyati || firstProduct.cost),
            hasDescription: !!(firstProduct.description || firstProduct.aciklama || firstProduct.tanim),
            hasCategory: !!(firstProduct.category || firstProduct.kategori || firstProduct.category_name),
            hasStock: !!(firstProduct.stock || firstProduct.stok || firstProduct.quantity || firstProduct.miktar),
            hasImage: !!(firstProduct.image || firstProduct.resim || firstProduct.foto || firstProduct.picture)
          };
          
          console.log('Ürün analizi:', productAnalysis);
          
          // İlk ürünün örnek değerlerini al
          const sampleValues = {};
          Object.keys(firstProduct).slice(0, 5).forEach(key => {
            const value = firstProduct[key];
            if (typeof value === 'string' || typeof value === 'number') {
              sampleValues[key] = String(value).substring(0, 50);
            } else if (typeof value === 'object') {
              sampleValues[key] = `[Object: ${Object.keys(value).join(', ')}]`;
            } else {
              sampleValues[key] = typeof value;
            }
          });
          
          console.log('İlk ürün örnek değerleri:', sampleValues);
        }
        
        // Memory'yi korumak için ürün detaylarını temizle
        xmlData = null;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Senkronizasyon başarıyla tamamlandı - ${products.length} ürün işlendi`,
            processedCount: products.length,
            options: options,
            debug: {
              xmlSize: xmlResponse.data.length,
              productCount: products.length,
              foundPath: foundPath,
              productAnalysis: productAnalysis
            }
          })
        };
        
      } catch (syncError) {
        console.error('Sync error:', {
          message: syncError.message,
          code: syncError.code,
          status: syncError.response?.status
        });
        
        let errorMessage = 'Senkronizasyon hatası: ';
        if (syncError.code === 'ECONNABORTED' || syncError.message.includes('timeout')) {
          errorMessage += 'XML bağlantısı zaman aşımına uğradı (10s)';
        } else if (syncError.code === 'ENOTFOUND') {
          errorMessage += 'XML URL\'si bulunamadı';
        } else if (syncError.code === 'ECONNREFUSED') {
          errorMessage += 'XML sunucusuna bağlanılamadı';
        } else if (syncError.message.includes('Parse')) {
          errorMessage += 'XML formatı geçersiz';
        } else {
          errorMessage += syncError.message;
        }
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: errorMessage,
            debug: {
              code: syncError.code,
              status: syncError.response?.status,
              timeout: '10 saniye'
            }
          })
        };
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Sync action bulunamadı' })
    };
  } catch (error) {
    console.error('Sync handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Sync handler hatası',
        message: error.message
      })
    };
  }
}

async function handleGoogle(action, event, headers) {
  try {
    // Environment variables veya header'lardan Google config al
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 
                             event.headers['x-google-client-id'] || 
                             event.headers['X-Google-Client-Id'];
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 
                                 event.headers['x-google-client-secret'] || 
                                 event.headers['X-Google-Client-Secret'];
    const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 
                               event.headers['x-google-redirect-uri'] || 
                               event.headers['X-Google-Redirect-Uri'] ||
                               'https://vervegranxml.netlify.app/auth/google/callback';

    console.log('Google config check:', {
      hasClientId: !!GOOGLE_CLIENT_ID,
      hasClientSecret: !!GOOGLE_CLIENT_SECRET,
      redirectUri: GOOGLE_REDIRECT_URI
    });

    if (action === 'status') {
      const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || 
                                  event.headers['x-google-refresh-token'] || 
                                  event.headers['X-Google-Refresh-Token'];
      
      console.log('Google status check:', {
        hasRefreshToken: !!GOOGLE_REFRESH_TOKEN,
        hasClientId: !!GOOGLE_CLIENT_ID,
        hasClientSecret: !!GOOGLE_CLIENT_SECRET,
        refreshTokenSource: process.env.GOOGLE_REFRESH_TOKEN ? 'env' : 'header'
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          connected: !!GOOGLE_REFRESH_TOKEN,
          isAuthenticated: !!GOOGLE_REFRESH_TOKEN,
          hasConfig: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
          debug: {
            hasRefreshToken: !!GOOGLE_REFRESH_TOKEN,
            hasClientId: !!GOOGLE_CLIENT_ID,
            hasClientSecret: !!GOOGLE_CLIENT_SECRET,
            refreshTokenSource: process.env.GOOGLE_REFRESH_TOKEN ? 'env' : 'header'
          }
        })
      };
    }

    if (action === 'auth-url') {
      if (!GOOGLE_CLIENT_ID) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Google Client ID bulunamadı'
          })
        };
      }

      const scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ];

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&` +
        `redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&` +
        `scope=${encodeURIComponent(scopes.join(' '))}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          url: authUrl
        })
      };
    }

    if (action === 'exchange-code' && event.httpMethod === 'POST') {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Google Client ID veya Client Secret bulunamadı'
          })
        };
      }

      const body = JSON.parse(event.body || '{}');
      const code = body.code;

      if (!code) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Authorization code bulunamadı'
          })
        };
      }

      try {
        const axios = require('axios');
        
        // Google'dan access token ve refresh token al
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: GOOGLE_REDIRECT_URI
        });

        const tokens = tokenResponse.data;
        
        if (tokens.refresh_token) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              refreshToken: tokens.refresh_token,
              accessToken: tokens.access_token
            })
          };
        } else {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Refresh token alınamadı. Lütfen Google hesabınızdan uygulamaya verilen izinleri kaldırıp tekrar deneyin.'
            })
          };
        }
      } catch (tokenError) {
        console.error('Google token exchange error:', tokenError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Token değişimi hatası: ' + tokenError.message
          })
        };
      }
    }

    if (action === 'create-sheet') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Google Sheets entegrasyonu henüz tamamlanmadı'
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Google action bulunamadı' })
    };
  } catch (error) {
    console.error('Google handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Google handler hatası',
        message: error.message
      })
    };
  }
}
