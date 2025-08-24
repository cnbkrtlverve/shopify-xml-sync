exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Store-Url, X-Shopify-Admin-Token, X-XML-Feed-Url',
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
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ShopifyXMLSync/1.0)',
            'Accept': 'application/xml, text/xml, */*'
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
          status: error.response?.status
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: 'XML bağlantı hatası: ' + error.message,
            debug: {
              code: error.code,
              status: error.response?.status,
              url: XML_FEED_URL
            }
          })
        };
      }
    }

    if (action === 'stats') {
      try {
        console.log('XML stats starting for:', XML_FEED_URL);
        
        const response = await axios.get(XML_FEED_URL, { 
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ShopifyXMLSync/1.0)',
            'Accept': 'application/xml, text/xml, */*'
          }
        });
        
        console.log('XML stats response received:', {
          status: response.status,
          contentType: response.headers['content-type'],
          dataLength: response.data?.length
        });
        
        let productCount = 0;
        let parseMethod = 'string';
        
        try {
          const xml2js = require('xml2js');
          const parsed = await xml2js.parseStringPromise(response.data, {
            explicitArray: false,
            trim: true
          });
          
          console.log('XML parsed successfully');
          
          const products = parsed.Urunler?.Urun || [];
          productCount = Array.isArray(products) ? products.length : (products ? 1 : 0);
          parseMethod = 'xml2js';
          
        } catch (parseError) {
          console.warn('XML parsing failed, using string count:', parseError.message);
          
          // Basit string sayma yöntemi
          const dataStr = String(response.data || '');
          const matches = dataStr.match(/<Urun[^>]*>/g);
          productCount = matches ? matches.length : 0;
          parseMethod = 'regex';
        }

        console.log('XML stats completed:', { productCount, parseMethod });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            url: XML_FEED_URL,
            productCount,
            debug: {
              parseMethod,
              dataLength: response.data?.length,
              status: response.status
            }
          })
        };
        
      } catch (error) {
        console.error('XML stats error:', {
          message: error.message,
          code: error.code,
          status: error.response?.status
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: 'XML stats alınamadı: ' + error.message,
            debug: {
              code: error.code,
              status: error.response?.status,
              url: XML_FEED_URL
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
    if (action === 'summary') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          summary: 'Henüz bir senkronizasyon yapılmadı.'
        })
      };
    }

    if (action === 'start') {
      // Netlify Functions timeout nedeniyle uzun süreli sync işlemi yapamaz
      // Bu endpoint sadece test amaçlı
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Senkronizasyon Netlify Functions limitleri nedeniyle desteklenmiyor'
        })
      };
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
    if (action === 'status') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isAuthenticated: false
        })
      };
    }

    if (action === 'auth-url') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          url: null,
          message: 'Google auth Netlify Functions ile henüz desteklenmiyor'
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
