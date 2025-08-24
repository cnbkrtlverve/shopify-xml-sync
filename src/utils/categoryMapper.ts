// Bu dosya, XML'deki kategori adlarını standart Shopify kategori ID'lerine eşler.
// Bu, Shopify'ın ürünleri daha iyi sınıflandırmasına ve yönetmesine yardımcı olur.
// Kategori ID'lerini Shopify'ın resmi dokümantasyonundan veya bir kategori arama aracından bulabilirsiniz.
// Örnek: https://help.shopify.com/en/manual/products/product-taxonomy/product-category-taxonomy.csv

const categoryMap: { [key: string]: string } = {
    // Örnek Eşleştirmeler (Kendi kategorilerinize göre düzenleyin)
    "Giyim > Kadın > Elbise": "gid://shopify/ProductCategory/123",
    "Giyim > Erkek > Tişört": "gid://shopify/ProductCategory/456",
    "Aksesuar > Çanta": "gid://shopify/ProductCategory/789",
    
    // Gerçek Veriden Gelen Kategori Örnekleri (ID'leri bulunmalı)
    "KADIN > DIŞ GİYİM > Ceket": "gid://shopify/ProductCategory/5336", // Apparel & Accessories > Clothing > Outerwear > Coats & Jackets
    "KADIN > GİYİM > Bluz": "gid://shopify/ProductCategory/5324",      // Apparel & Accessories > Clothing > Shirts & Tops
    "KADIN > GİYİM > Elbise": "gid://shopify/ProductCategory/227",     // Apparel & Accessories > Clothing > Dresses
    "KADIN > GİYİM > Etek": "gid://shopify/ProductCategory/214",       // Apparel & Accessories > Clothing > Skirts
    "KADIN > GİYİM > Pantolon": "gid://shopify/ProductCategory/207",   // Apparel & Accessories > Clothing > Pants
    "KADIN > GİYİM > Tulum": "gid://shopify/ProductCategory/234",      // Apparel & Accessories > Clothing > Jumpsuits & Rompers
    "KADIN > GİYİM > T-shirt": "gid://shopify/ProductCategory/5324",   // Apparel & Accessories > Clothing > Shirts & Tops
    "KADIN > GİYİM > Şort": "gid://shopify/ProductCategory/212",      // Apparel & Accessories > Clothing > Shorts
    "KADIN > GİYİM > Sweatshirt": "gid://shopify/ProductCategory/5324",// Apparel & Accessories > Clothing > Shirts & Tops
    "KADIN > GİYİM > Takım": "gid://shopify/ProductCategory/5449",     // Apparel & Accessories > Clothing > Clothing Sets
    "KADIN > GİYİM > Tayt": "gid://shopify/ProductCategory/5431",      // Apparel & Accessories > Clothing > Leggings
    "KADIN > GİYİM > Gömlek": "gid://shopify/ProductCategory/5324",    // Apparel & Accessories > Clothing > Shirts & Tops
    "KADIN > GİYİM > Yelek": "gid://shopify/ProductCategory/5336",     // Apparel & Accessories > Clothing > Outerwear > Vests
    "KADIN > GİYİM > Hırka": "gid://shopify/ProductCategory/5324",     // Apparel & Accessories > Clothing > Shirts & Tops > Cardigans
    "KADIN > GİYİM > Body": "gid://shopify/ProductCategory/5324",      // Apparel & Accessories > Clothing > Shirts & Tops
    "KADIN > GİYİM > Büstiyer": "gid://shopify/ProductCategory/5324",  // Apparel & Accessories > Clothing > Shirts & Tops
    "KADIN > GİYİM > Trençkot": "gid://shopify/ProductCategory/5336",  // Apparel & Accessories > Clothing > Outerwear > Trench Coats
    "KADIN > GİYİM > Mont": "gid://shopify/ProductCategory/5336",      // Apparel & Accessories > Clothing > Outerwear > Coats & Jackets
    "KADIN > GİYİM > Kaban": "gid://shopify/ProductCategory/5336",     // Apparel & Accessories > Clothing > Outerwear > Coats & Jackets
};

/**
 * Verilen bir kategori yolunu (ör: "KADIN > GİYİM > Elbise") alır
 * ve eşleşen Shopify Product Category ID'sini döndürür.
 * Eşleşme bulunamazsa undefined döndürür.
 * @param categoryPath - XML'den gelen kategori yolu.
 * @returns Eşleşen Shopify kategori ID'si veya undefined.
 */
export function getShopifyCategoryId(categoryPath: string): number | undefined {
    const trimmedPath = categoryPath.trim();
    const gid = categoryMap[trimmedPath];
    if (gid) {
        const id = gid.split('/').pop();
        return id ? parseInt(id, 10) : undefined;
    }
    return undefined;
}
