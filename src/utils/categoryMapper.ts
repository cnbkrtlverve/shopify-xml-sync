const categoryMap: { [key: string]: string } = {
    // ÖNEMLİ: Bu listeyi kendi XML kategorilerinize ve Shopify'ın standartlarına göre doldurmanız gerekecek.
    // Shopify Kategori Listesi: https://help.shopify.com/tr/manual/products/details/product-category

    // --- Alt Giyim ---
    "Pantolon": "gid://shopify/ProductCategory/555",
    "Eşofman Altı": "gid://shopify/ProductCategory/555", // Pantolon kategorisine girer
    "Şort": "gid://shopify/ProductCategory/556",
    "Tayt": "gid://shopify/ProductCategory/554",
    "Etek": "gid://shopify/ProductCategory/557",

    // --- Üst Giyim ---
    "Sweatshirt": "gid://shopify/ProductCategory/549",
    "Kapüşonlular": "gid://shopify/ProductCategory/549", // Sweatshirt ile aynı kategori
    "T-shirt": "gid://shopify/ProductCategory/549",
    "Gömlek": "gid://shopify/ProductCategory/549",
    "Bluz": "gid://shopify/ProductCategory/549",
    "Hırka": "gid://shopify/ProductCategory/550", // Süveter kategorisine girer
    "Süveter": "gid://shopify/ProductCategory/550",
    "Body": "gid://shopify/ProductCategory/549",

    // --- Dış Giyim ---
    "Ceket": "gid://shopify/ProductCategory/536",
    "Kaban": "gid://shopify/ProductCategory/536", // Ceket ile aynı kategori
    "Yelek": "gid://shopify/ProductCategory/538",
    "Yağmurluk": "gid://shopify/ProductCategory/536",

    // --- Tek Parça ---
    "Elbise": "gid://shopify/ProductCategory/207",
    "Tulum": "gid://shopify/ProductCategory/559", // Jumpsuits & Rompers
};

// GÜNCELLENMİŞ VE DAHA AKILLI FONKSİYON
export function getShopifyCategoryId(xmlCategoryPath: string): string | undefined {
    if (!xmlCategoryPath) return undefined;

    // "Giyim > Büyük Beden > Pantolon" -> ["Giyim", "Büyük Beden", "Pantolon"]
    const categories = xmlCategoryPath.split('>').map(c => c.trim());

    // Diziyi sondan başa doğru kontrol ederek en spesifik kategoriden
    // en genele doğru bir eşleşme arıyoruz.
    for (let i = categories.length - 1; i >= 0; i--) {
        const category = categories[i];
        if (category && categoryMap[category]) {
            return categoryMap[category]; // İlk bulduğumuz eşleşmeyi döndürüyoruz.
        }
    }

    return undefined; // Hiçbir eşleşme bulunamadı.
}