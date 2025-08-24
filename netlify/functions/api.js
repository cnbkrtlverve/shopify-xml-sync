exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
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

async function handleShopify(action, event, headers) { return { statusCode: 200, headers, body: '' };
  }

  try {
    const path = event.path.replace('/api/', '');
    const segments = path.split('/');
    const service = segments[0];
    const action = segments[1];

    console.log('API Request:', { path, service, action, method: event.httpMethod });

    if (service === 'config') {
      return await handleConfig(action, event, headers);
    }
    if (service === 'debug') {
      return await handleDebug(action, event, headers);
    }
    if (service === 'shopify') {
      return await handleShopify(action, event, headers);
    }
    if (service === 'xml') {
      return await handleXml(action, event, headers);
    }
    if (service === 'sync') {
      return await handleSync(action, event, headers);
    }
    if (service === 'google') {
      return await handleGoogle(action, event, headers);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint bulunamadı' })
    };
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
    const axios = require('axios');
    
    const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
    const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;

    console.log('Shopify ENV check:', { 
      hasStoreUrl: !!SHOPIFY_STORE_URL, 
      hasToken: !!SHOPIFY_ADMIN_API_TOKEN 
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
            SHOPIFY_ADMIN_API_TOKEN: !!SHOPIFY_ADMIN_API_TOKEN
          }
        })
      };
    }

    const shopifyApi = axios.create({
      baseURL: `https://${SHOPIFY_STORE_URL}/admin/api/2024-07`,
      headers: { 
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (action === 'check') {
      try {
        await shopifyApi.get('/shop.json');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Başarılı' })
        };
      } catch (error) {
        console.error('Shopify check error:', error.message);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: 'Bağlantı hatası: ' + error.message 
          })
        };
      }
    }

    if (action === 'info') {
      try {
        const { data: shopData } = await shopifyApi.get('/shop.json');
        const { data: countData } = await shopifyApi.get('/products/count.json');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            name: shopData.shop.name,
            email: shopData.shop.email,
            productCount: countData.count
          })
        };
      } catch (error) {
        console.error('Shopify info error:', error.message);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: 'Shopify bilgileri alınamadı: ' + error.message 
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
        const products = response.data.data.products.edges.map((edge) => {
          return {
            ...edge.node,
            variants: edge.node.variants.edges.map((vEdge) => vEdge.node)
          };
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, products })
        };
      } catch (error) {
        console.error('Shopify search error:', error.message);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: false, products: [] })
        };
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Shopify action bulunamadı' })
    };

  } catch (error) {
    console.error('Shopify handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Shopify handler hatası',
        message: error.message
      })
    };
  }
}

async function handleXml(action, event, headers) {
  try {
    const axios = require('axios');
    
    const XML_FEED_URL = process.env.XML_FEED_URL;

    console.log('XML ENV check:', { hasXmlUrl: !!XML_FEED_URL });

    if (!XML_FEED_URL) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, message: 'XML URL eksik' })
      };
    }

    if (action === 'check') {
      try {
        const response = await axios.get(XML_FEED_URL, { timeout: 10000 });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'XML bağlantısı başarılı' })
        };
      } catch (error) {
        console.error('XML check error:', error.message);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: 'XML bağlantı hatası: ' + error.message 
          })
        };
      }
    }

    if (action === 'stats') {
      try {
        const response = await axios.get(XML_FEED_URL, { timeout: 15000 });
        
        // xml2js require etmeye çalış, yoksa basit sayma yap
        let productCount = 0;
        try {
          const xml2js = require('xml2js');
          const parsed = await xml2js.parseStringPromise(response.data);
          const products = parsed.Urunler?.Urun || [];
          productCount = Array.isArray(products) ? products.length : (products ? 1 : 0);
        } catch (parseError) {
          console.warn('XML parsing failed, using string count:', parseError.message);
          // Basit string sayma yöntemi
          const matches = (response.data || '').match(/<Urun/g);
          productCount = matches ? matches.length : 0;
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            url: XML_FEED_URL,
            productCount
          })
        };
      } catch (error) {
        console.error('XML stats error:', error.message);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: false, 
            message: 'XML stats alınamadı: ' + error.message 
          })
        };
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'XML action bulunamadı' })
    };

  } catch (error) {
    console.error('XML handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'XML handler hatası',
        message: error.message
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
