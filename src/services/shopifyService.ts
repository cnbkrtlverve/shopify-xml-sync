import axios, { AxiosInstance } from 'axios';
import { Product } from '../types/product.d';
import dotenv from 'dotenv';

dotenv.config();

// DÜZELTME: GraphQL yanıtı için tipler tanımlandı
interface PageInfo {
    hasNextPage: boolean;
    endCursor: string | null;
}

interface ShopifyGraphQLResponse {
    data: {
        products: {
            pageInfo: PageInfo;
            edges: any[];
        }
    }
}

const apiVersion = '2024-07';

export function getShopifyApiClient(): AxiosInstance {
    const storeUrl = process.env.SHOPIFY_STORE_URL;
    const accessToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

    if (!storeUrl || !accessToken) {
        throw new Error("Shopify mağaza URL'si veya API anahtarı .env dosyasında bulunamadı.");
    }

    return axios.create({
        baseURL: `https://${storeUrl}/admin/api/${apiVersion}`,
        headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
    });
}

// YENİ: Rota dosyasının beklediği, mağaza bilgilerini getiren fonksiyon
export async function getShopifyStoreInfo() {
    const shopifyApi = getShopifyApiClient();
    try {
        const { data: shopData } = await shopifyApi.get('/shop.json');
        const { data: countData } = await shopifyApi.get('/products/count.json');
        return {
            success: true,
            name: shopData.shop.name,
            email: shopData.shop.email,
            productCount: countData.count,
        };
    } catch (error) {
        console.error("Shopify store info error:", error);
        return { success: false };
    }
}

// YENİ: Google Sheets oluşturmak için gereken, tüm ürünleri getiren fonksiyon
export async function fetchAllShopifyProducts(): Promise<any[]> {
    const shopifyApi = getShopifyApiClient();
    let allProducts: any[] = [];
    let nextPageInfo: string | null = null;

    const query = `
      query getAllProducts($cursor: String) {
        products(first: 50, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              handle
              title
              variants(first: 10) {
                edges {
                  node {
                    id
                    sku
                    price
                    compareAtPrice
                  }
                }
              }
            }
          }
        }
      }`;

    do {
        const response: { data: ShopifyGraphQLResponse } = await shopifyApi.post('/graphql.json', {
            query,
            variables: { cursor: nextPageInfo },
        });

        const productsData = response.data.data.products;

        const products = productsData.edges.map((edge: any) => ({
            ...edge.node,
            variants: edge.node.variants.edges.map((vEdge: any) => vEdge.node)
        }));
        
        allProducts = allProducts.concat(products);
        
        const pageInfo: PageInfo = productsData.pageInfo;
        nextPageInfo = pageInfo.hasNextPage ? pageInfo.endCursor : null;

    } while (nextPageInfo);

    return allProducts;
}


// --- MEVCUT KODUNUZ OLDUĞU GİBİ KORUNUYOR ---

export async function checkShopifyConnection(): Promise<{ success: boolean; message: string }> {
    try {
        const shopifyApi = getShopifyApiClient();
        await shopifyApi.get('/shop.json');
        return { success: true, message: 'Başarılı' };
    } catch (error: any) {
        console.error('--- SHOPIFY BAĞLANTI HATASI DETAYI ---');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('Request:', error.request);
        } else {
            console.error('Error Message:', error.message);
        }
        console.error('--- HATA DETAYI SONU ---');
        return { success: false, message: 'Başarısız' };
    }
}

export async function findProductByHandle(handle: string): Promise<{ id: string; variants: { id: string, sku: string }[] } | null> {
    const shopifyApi = getShopifyApiClient();
    const query = `query($handle: String!) { productByHandle(handle: $handle) { id variants(first: 50) { edges { node { id sku } } } } }`;
    const response = await shopifyApi.post('/graphql.json', { query, variables: { handle } });
    const product = response.data.data.productByHandle;
    if (product) {
        return {
            id: product.id,
            variants: product.variants.edges.map((e: any) => e.node)
        };
    }
    return null;
}

export async function createShopifyProduct(product: Product, logCallback: (message: string, level: 'info' | 'success' | 'warn') => void) {
    const shopifyApi = getShopifyApiClient();
    const payload = {
        product: {
            handle: product.handle,
            title: product.title,
            body_html: product.body_html,
            vendor: product.vendor,
            product_type: product.product_type,
            tags: product.tags.join(','),
            options: product.options,
            images: product.images,
            product_category: product.product_category,
            variants: product.variants.map(v => ({
                price: String(v.price),
                sku: v.sku,
                inventory_management: "shopify",
                inventory_quantity: v.inventory_quantity,
                option1: v.option1,
            })),
        }
    };
    try {
        await shopifyApi.post('/products.json', payload);
        logCallback(`-> Ürün '${product.title}' (${product.variants.length} varyant ile) başarıyla oluşturuldu.`, 'success');
    } catch (error: any) {
        const errorMessages = error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message;
        logCallback(`-> Ürün '${product.title}' oluşturulurken HATA: ${errorMessages}`, 'warn');
    }
}

export async function updateShopifyProduct(
    productId: string, 
    existingVariants: { id: string, sku: string }[], 
    product: Product,
    options: { full: boolean; price: boolean; inventory: boolean; details: boolean; images: boolean },
    logCallback: (message: string, level: 'info' | 'success' | 'warn') => void
) {
    const shopifyApi = getShopifyApiClient();
    const productIdNumber = productId.split('/').pop();

    const productUpdatePayload: any = { product: { id: productIdNumber } };
    let updatedFields: string[] = [];

    // Detayları (başlık, açıklama, satıcı vb.) güncelle
    if (options.full || options.details) {
        productUpdatePayload.product.title = product.title;
        productUpdatePayload.product.body_html = product.body_html;
        productUpdatePayload.product.vendor = product.vendor;
        productUpdatePayload.product.product_type = product.product_type;
        productUpdatePayload.product.tags = product.tags.join(',');
        if (product.product_category) {
            productUpdatePayload.product.product_category_id = product.product_category.id;
        }
        updatedFields.push('Detaylar');
    }

    // Resimleri güncelle
    if (options.full || options.images) {
        if (product.images && product.images.length > 0) {
            productUpdatePayload.product.images = product.images;
            updatedFields.push('Resimler');
        }
    }

    // Sadece güncellenecek alan varsa ana ürün PUT isteği gönder
    if (Object.keys(productUpdatePayload.product).length > 1) {
        try {
            await shopifyApi.put(`/products/${productIdNumber}.json`, productUpdatePayload);
            logCallback(`-> Ana ürün güncellendi: [${updatedFields.join(', ')}]`, 'info');
        } catch (error: any) {
            const errorMessages = error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message;
            logCallback(`-> Ana ürün güncellenirken HATA: ${errorMessages}`, 'warn');
        }
    }

    // Varyantları güncelle
    for (const xmlVariant of product.variants) {
        const shopifyVariant = existingVariants.find(v => v.sku === xmlVariant.sku);
        const variantIdNumber = shopifyVariant?.id.split('/').pop();

        if (shopifyVariant && variantIdNumber) {
            const variantPayload: any = {};
            let variantUpdated = false;

            if (options.full || options.price) {
                variantPayload.price = String(xmlVariant.price);
                variantUpdated = true;
            }
            if (options.full || options.inventory) {
                variantPayload.inventory_quantity = xmlVariant.inventory_quantity;
                variantUpdated = true;
            }

            if (variantUpdated) {
                try {
                    await shopifyApi.put(`/variants/${variantIdNumber}.json`, { variant: { id: variantIdNumber, ...variantPayload } });
                    logCallback(`  - Varyant güncellendi (SKU: ${xmlVariant.sku})`, 'info');
                } catch (error: any) {
                    const errorMessages = error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message;
                    logCallback(`  - Varyant güncellenirken HATA (SKU: ${xmlVariant.sku}): ${errorMessages}`, 'warn');
                }
            }
        } else {
            // Shopify'da olmayan yeni varyantı ürüne ekle
            try {
                await shopifyApi.post(`/products/${productIdNumber}/variants.json`, {
                    variant: {
                        price: String(xmlVariant.price),
                        sku: xmlVariant.sku,
                        inventory_quantity: xmlVariant.inventory_quantity,
                        option1: xmlVariant.option1,
                    }
                });
                logCallback(`  + Yeni varyant eklendi (SKU: ${xmlVariant.sku})`, 'success');
            } catch (error: any) {
                const errorMessages = error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message;
                logCallback(`  + Yeni varyant eklenirken HATA (SKU: ${xmlVariant.sku}): ${errorMessages}`, 'warn');
            }
        }
    }
}

export async function getShopInfo(): Promise<{ name: string; email: string }> {
    const shopifyApi = getShopifyApiClient();
    const response = await shopifyApi.get('/shop.json');
    return {
        name: response.data.shop.name,
        email: response.data.shop.email,
    };
}

export async function getShopifyProductCount(): Promise<number> {
    const shopifyApi = getShopifyApiClient();
    const response = await shopifyApi.get('/products/count.json');
    return response.data.count;
}

export async function getShopifyStats(): Promise<{ productCount: number; variantCount: number }> {
    const shopifyApi = getShopifyApiClient();
    const productCountResponse = await shopifyApi.get('/products/count.json');
    const productCount = productCountResponse.data.count;

    let variantCount = 0;
    if (productCount > 0) {
        // Not: Bu yöntem büyük mağazalarda yavaş olabilir.
        // Daha performanslı bir yöntem için GraphQL kullanılabilir.
        const response = await shopifyApi.get('/products.json?limit=250&fields=variants');
        response.data.products.forEach((product: any) => {
            if (product.variants) {
                variantCount += product.variants.length;
            }
        });
    }
    return { productCount, variantCount };
}

export async function searchShopifyProducts(query: string): Promise<any[]> {
    const shopifyApi = getShopifyApiClient();
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

    try {
        const response = await shopifyApi.post('/graphql.json', graphqlQuery);
        const products = response.data.data.products.edges.map((edge: any) => {
            return {
                ...edge.node,
                variants: edge.node.variants.edges.map((vEdge: any) => vEdge.node)
            };
        });
        return products;
    } catch (error: any) {
        console.error("Shopify GraphQL search error:", error.response?.data?.errors);
        return [];
    }
}
