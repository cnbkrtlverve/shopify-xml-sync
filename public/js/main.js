// main.js - Ana uygulama mantığı

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all services
    window.configService = new ConfigService();
    window.authService = new AuthService();
    window.shopifyService = new ShopifyService();
    window.xmlService = new XMLService();
    // Mock services for now to avoid errors
    window.syncService = window.syncService || { setLogCallback: () => {}, runSync: () => {} };
    window.googleService = window.googleService || {};

    // Check login state and setup UI
    // Demo için otomatik login yapalım - zorla giriş yap
    sessionStorage.setItem('isLoggedIn', 'true');
    
    if (window.authService.isLoggedIn()) {
        document.getElementById('app-container').style.display = 'block';
        document.getElementById('login-container').style.display = 'none';
        initializeApp();
    } else {
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('login-container').style.display = 'flex';
    }
    
    // Always setup login form listener
    document.getElementById('login-form').addEventListener('submit', handleLogin);
});

function initializeApp() {
    setupEventListeners();
    loadConfigToUI();
    updateDashboard();
}

function setupEventListeners() {
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Config Page
    document.getElementById('save-config').addEventListener('click', handleSaveConfig);
    document.getElementById('test-shopify').addEventListener('click', handleTestShopify);
    document.getElementById('test-xml').addEventListener('click', handleTestXML);
    
    // Sync Page
    document.getElementById('start-sync').addEventListener('click', () => addLog('Senkronizasyon başlatıldı.', 'info'));

    // Google Sheets Page
    // Add listeners for google auth and sheet generation if they exist
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    if (window.authService.login(username, password)) {
        errorDiv.style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        document.getElementById('login-container').style.display = 'none';
        initializeApp();
    } else {
        errorDiv.style.display = 'block';
    }
}

function handleLogout() {
    window.authService.logout();
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';
    // Clear sensitive UI data on logout
    if (document.getElementById('shopify-admin-token')) {
        document.getElementById('shopify-admin-token').value = '';
    }
    if (document.getElementById('shopify-storefront-token')) {
        document.getElementById('shopify-storefront-token').value = '';
    }
}

function handleNavigation(e) {
    e.preventDefault();
    const page = e.target.dataset.page;
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    e.target.classList.add('active');
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
}

function loadConfigToUI() {
    const config = window.configService.getConfig();
    if (document.getElementById('shopify-url')) {
        document.getElementById('shopify-url').value = config.shopifyUrl || '';
    }
    if (document.getElementById('shopify-admin-token')) {
        document.getElementById('shopify-admin-token').value = config.shopifyAdminToken || '';
    }
    if (document.getElementById('shopify-storefront-token')) {
        document.getElementById('shopify-storefront-token').value = config.shopifyStorefrontToken || '';
    }
    if (document.getElementById('xml-url')) {
        document.getElementById('xml-url').value = config.xmlUrl || '';
    }
}

function handleSaveConfig() {
    const shopifyUrl = document.getElementById('shopify-url').value;
    const shopifyAdminToken = document.getElementById('shopify-admin-token').value;
    const shopifyStorefrontToken = document.getElementById('shopify-storefront-token').value;
    const xmlUrl = document.getElementById('xml-url').value;
    
    window.configService.saveConfig({ shopifyUrl, shopifyAdminToken, shopifyStorefrontToken, xmlUrl });
    
    showConfigMessage('Ayarlar başarıyla kaydedildi!', 'success');
    updateDashboard(); // Refresh dashboard with new settings
}

async function handleTestShopify() {
    const shopifyUrl = document.getElementById('shopify-url').value;
    const shopifyAdminToken = document.getElementById('shopify-admin-token').value;
    const shopifyStorefrontToken = document.getElementById('shopify-storefront-token').value;
    const messageDiv = document.getElementById('config-message');

    if (!shopifyUrl || (!shopifyAdminToken && !shopifyStorefrontToken)) {
        showConfigMessage('Shopify URL ve en az bir token (Admin veya Storefront) gerekli.', 'error');
        return;
    }

    // Temporarily set config for the test
    window.configService.setConfig({ shopifyUrl, shopifyAdminToken, shopifyStorefrontToken });
    
    showConfigMessage('Shopify bağlantısı test ediliyor...', 'info');

    try {
        const shopData = await window.shopifyService.checkConnection();
        if (shopData) {
            showConfigMessage(`Bağlantı başarılı! Mağaza: ${shopData.name}`, 'success');
        } else {
            showConfigMessage('Bağlantı başarısız. Bilgileri ve CORS proxy durumunu kontrol edin.', 'error');
        }
    } catch (error) {
        showConfigMessage(`Bağlantı hatası: ${error.message}`, 'error');
    }
}

async function handleTestXML() {
    const xmlUrl = document.getElementById('xml-url').value;
    const messageDiv = document.getElementById('config-message');

    if (!xmlUrl) {
        showConfigMessage('XML URL alanı dolu olmalı.', 'error');
        return;
    }

    // Temporarily set config for the test
    window.configService.setConfig({ xmlUrl });

    showConfigMessage('XML bağlantısı test ediliyor...', 'info');

    try {
        const result = await window.xmlService.checkConnection();
        if (result.success) {
            showConfigMessage(`XML bağlantısı başarılı! Kök element: ${result.rootElement}`, 'success');
        } else {
            showConfigMessage(`Bağlantı başarısız: ${result.message}`, 'error');
        }
    } catch (error) {
        showConfigMessage(`Bağlantı hatası: ${error.message}`, 'error');
    }
}

function showConfigMessage(message, type) {
    const messageDiv = document.getElementById('config-message');
    messageDiv.textContent = message;
    messageDiv.className = `config-message ${type}`; // Use classes for styling
    
    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = 'config-message';
    }, 5000);
}

async function updateDashboard() {
    const config = window.configService.getConfig();

    // Shopify Status
    const shopifyStatus = document.getElementById('shopify-status');
    const shopifyName = document.getElementById('shopify-name');
    const shopifyEmail = document.getElementById('shopify-email');
    const shopifyProducts = document.getElementById('shopify-products');

    if (config.shopifyUrl && (config.shopifyAdminToken || config.shopifyStorefrontToken)) {
        try {
            console.log('Shopify bağlantısı kontrol ediliyor...');
            const shopData = await window.shopifyService.checkConnection();
            console.log('Shopify shop data:', shopData);
            
            if (shopData) {
                shopifyStatus.textContent = 'Bağlandı';
                shopifyStatus.className = 'status-badge success';
                shopifyName.textContent = shopData.name || 'N/A';
                shopifyEmail.textContent = shopData.email || 'N/A';
                
                // Get product count
                console.log('Shopify ürün sayısı getiriliyor...');
                const productCount = await window.shopifyService.getProductCount();
                console.log('Shopify ürün sayısı:', productCount);
                shopifyProducts.textContent = productCount;
            } else {
                 throw new Error('Shopify\'e bağlanılamadı.');
            }
        } catch (e) {
            console.error('Shopify dashboard hatası:', e);
            shopifyStatus.textContent = 'Hata';
            shopifyStatus.className = 'status-badge error';
            shopifyName.textContent = 'N/A';
            shopifyEmail.textContent = 'N/A';
            shopifyProducts.textContent = 'N/A';
        }
    } else {
        shopifyStatus.textContent = 'Yapılandırılmadı';
        shopifyStatus.className = 'status-badge warn';
    }

    // XML Status
    const xmlStatus = document.getElementById('xml-status');
    const xmlSourceUrl = document.getElementById('xml-source-url');
    const xmlProducts = document.getElementById('xml-products');
    const xmlVariants = document.getElementById('xml-variants');

    if (config.xmlUrl) {
        xmlSourceUrl.textContent = config.xmlUrl;
        try {
            console.log('XML stats alınıyor...');
            const stats = await window.xmlService.getXMLStats();
            console.log('XML stats:', stats);
            console.log('XML yapısı analizi:', stats.structure);
            
            xmlStatus.textContent = 'Bağlandı';
            xmlStatus.className = 'status-badge success';
            xmlProducts.textContent = stats.productCount || 0;
            xmlVariants.textContent = stats.variantCount || 0;
            
            // XML yapısını console'da göster
            if (stats.structure) {
                console.log('🔍 XML-Shopify Uyumluluk Analizi:');
                console.log('📦 Ürün Tag:', stats.productTagName);
                console.log('🏷️  Title alanı:', stats.structure.title);
                console.log('💰 Price alanı:', stats.structure.price);
                console.log('🖼️  Image alanı:', stats.structure.image);
                console.log('📝 Description alanı:', stats.structure.description);
                console.log('📦 Inventory alanı:', stats.structure.inventory);
                console.log('🗂️  Category alanı:', stats.structure.category);
                console.log('🏷️  Tags alanı:', stats.structure.tags);
                console.log('🔢 SKU alanı:', stats.structure.sku);
            }
        } catch (e) {
            console.error('XML dashboard hatası:', e);
            xmlStatus.textContent = 'Hata';
            xmlStatus.className = 'status-badge error';
            xmlProducts.textContent = 'N/A';
            xmlVariants.textContent = 'N/A';
        }
    } else {
        xmlStatus.textContent = 'Yapılandırılmadı';
        xmlStatus.className = 'status-badge warn';
        xmlSourceUrl.textContent = 'N/A';
    }
}

function addLog(message, type = 'info') {
    const logContainer = document.getElementById('sync-log');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight; // Auto-scroll
}

// Mock/Placeholder services for features not yet implemented
window.syncService = {
    setLogCallback: (cb) => { window.logCallback = cb; },
    runSync: async () => {
        window.logCallback('Senkronizasyon özelliği henüz tam olarak uygulanmadı.', 'warn');
        return Promise.resolve();
    }
};

window.googleService = {};
