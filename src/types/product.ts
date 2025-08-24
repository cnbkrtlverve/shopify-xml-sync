export interface ProductVariant {
    price: number;
    sku: string;
    inventory_quantity: number;
    option1: string; // Beden gibi varyant seçenekleri için
}

export interface ProductCategory {
    id: string;
}

export interface Product {
    handle: string; // Shopify'da URL için kullanılır
    title: string;
    body_html: string;
    vendor: string;
    product_type: string;
    tags: string[];
    options: { name: string; values: string[] }[];
    variants: ProductVariant[];
    images: { src: string }[];
    product_category?: ProductCategory; // YENİ: Bu satırı ekleyin
}