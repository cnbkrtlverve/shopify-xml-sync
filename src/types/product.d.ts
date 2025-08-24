// Bu dosya, Shopify'dan gelen ürün verileri için temel tipleri tanımlar.
// İhtiyaç duyuldukça genişletilebilir.

export interface ProductVariant {
    price: number;
    sku: string;
    inventory_quantity: number;
    option1?: string; // Örneğin, "Beden"
    option2?: string; // Örneğin, "Renk"
    option3?: string;
    compare_at_price?: number; // İndirimli fiyatlar için
    barcode?: string;
}

export interface ProductImage {
    src: string;
    alt?: string;
}

export interface ProductOption {
    name: string;
    values: string[];
}

export interface ShopifyProductCategory {
    id: string;
}

export interface Product {
    handle: string;
    title: string;
    body_html: string;
    vendor: string;
    product_type: string;
    tags: string[];
    options: ProductOption[];
    variants: ProductVariant[];
    images: ProductImage[];
    product_category?: {
        id: string;
    };
}
