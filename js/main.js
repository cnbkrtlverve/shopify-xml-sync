// main.js - Ana uygulama mantığı
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadConfigToUI();
    updateDashboard();
}

function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Sync controls
    document.getElementById('sync-button').addEventListener('click', handleSync);
    document.getElementById('sync-opt-full').addEventListener('change', handleSyncOptionChange);
    document.querySelectorAll('.sync-opt-partial').forEach(opt => {
        opt.addEventListener('change', handlePartialSyncChange);
    });
    
    // Config
    document.getElementById('save-config').addEventListener('click', handleSaveConfig);
    
    // Setup log callback for sync service
    window.syncService.setLogCallback(addLog);
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    if (window.auth.login(username, password)) {
        errorDiv.style.display = 'none';
        updateDashboard();
    } else {
        errorDiv.style.display = 'block';
    }
}

function handleLogout() {
    window.auth.logout();
}

function handleNavigation(e) {
    e.preventDefault();
    const targetId = e.target.getAttribute('href').substring(1);
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Update active page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`page-${targetId}`).classList.add('active');
}

function handleSyncOptionChange(e) {
    const isChecked = e.target.checked;
    const partialOpts = document.querySelectorAll('.sync-opt-partial');
    
    partialOpts.forEach(opt => {
        opt.disabled = isChecked;
        if (isChecked) {
            opt.checked = false;
        }
    });
}

function handlePartialSyncChange() {
    const partialOpts = document.querySelectorAll('.sync-opt-partial');
    const anyPartialChecked = Array.from(partialOpts).some(opt => opt.checked);
    const fullSyncOpt = document.getElementById('sync-opt-full');
    
    if (anyPartialChecked) {
        fullSyncOpt.checked = false;
    }
}

async function handleSync() {
    const syncButton = document.getElementById('sync-button');
    
    if (!window.appConfig.isConfigured()) {
        addLog('Lütfen önce ayarları yapılandırın!', 'error');
        return;
    }
    
    // Disable button
    syncButton.disabled = true;
    syncButton.textContent = 'Senkronize Ediliyor...';
    
    // Clear logs
    document.getElementById('log-container').textContent = '';
    
    // Get sync options
    const options = {
        full: document.getElementById('sync-opt-full').checked,
        price: document.querySelector('[data-sync="price"]').checked,
        inventory: document.querySelector('[data-sync="inventory"]').checked,
        details: document.querySelector('[data-sync="details"]').checked,
        images: document.querySelector('[data-sync="images"]').checked
    };
    
    try {
        await window.syncService.runSync(options);
        updateDashboard();
    } catch (error) {
        addLog(`Senkronizasyon hatası: ${error.message}`, 'error');
    } finally {
        // Re-enable button
        syncButton.disabled = false;
        syncButton.textContent = 'Senkronizasyonu Başlat';
    }
}

function handleSaveConfig() {
    const shopifyStoreUrl = document.getElementById('shopify-store-url').value;
    const shopifyToken = document.getElementById('shopify-token').value;
    const xmlFeedUrl = document.getElementById('xml-feed-url').value;
    
    if (!shopifyStoreUrl || !shopifyToken || !xmlFeedUrl) {
        addLog('Lütfen tüm alanları doldurun!', 'error');
        return;
    }
    
    window.appConfig.saveConfig(shopifyStoreUrl, shopifyToken, xmlFeedUrl);
    addLog('Ayarlar kaydedildi!', 'success');
    updateDashboard();
}

function loadConfigToUI() {
    document.getElementById('shopify-store-url').value = window.appConfig.shopifyStoreUrl;
    document.getElementById('shopify-token').value = window.appConfig.shopifyToken;
    document.getElementById('xml-feed-url').value = window.appConfig.xmlFeedUrl;
}

async function updateDashboard() {
    if (!window.auth.isLoggedIn) return;
    
    try {
        // Update Shopify status
        updateShopifyStatus();
        
        // Update XML status
        updateXMLStatus();
        
    } catch (error) {
        console.error('Dashboard update error:', error);
    }
}

async function updateShopifyStatus() {
    const statusEl = document.getElementById('shopify-status');
    const nameEl = document.getElementById('shopify-name');
    const emailEl = document.getElementById('shopify-email');
    const productsEl = document.getElementById('shopify-products');
    
    if (!window.appConfig.isConfigured()) {
        statusEl.textContent = 'Yapılandırılmamış';
        statusEl.className = 'status error';
        return;
    }
    
    try {
        statusEl.textContent = 'Kontrol ediliyor...';
        statusEl.className = 'status';
        
        const [connectionResult, shopInfo, productCount] = await Promise.all([
            window.shopifyService.checkConnection(),
            window.shopifyService.getShopInfo(),
            window.shopifyService.getProductCount()
        ]);
        
        if (connectionResult.success) {
            statusEl.textContent = 'Bağlı';
            statusEl.className = 'status success';
            nameEl.textContent = shopInfo.name || 'N/A';
            emailEl.textContent = shopInfo.email || 'N/A';
            productsEl.textContent = productCount;
        } else {
            statusEl.textContent = 'Bağlantı Hatası';
            statusEl.className = 'status error';
            nameEl.textContent = 'N/A';
            emailEl.textContent = 'N/A';
            productsEl.textContent = 'N/A';
        }
    } catch (error) {
        statusEl.textContent = 'Hata';
        statusEl.className = 'status error';
    }
}

async function updateXMLStatus() {
    const statusEl = document.getElementById('xml-status');
    const urlEl = document.getElementById('xml-url');
    const productsEl = document.getElementById('xml-products');
    const variantsEl = document.getElementById('xml-variants');
    
    if (!window.appConfig.xmlFeedUrl) {
        statusEl.textContent = 'Yapılandırılmamış';
        statusEl.className = 'status error';
        return;
    }
    
    try {
        statusEl.textContent = 'Kontrol ediliyor...';
        statusEl.className = 'status';
        
        const stats = await window.xmlService.getXMLStats();
        
        if (stats.success) {
            statusEl.textContent = 'Ulaşılabilir';
            statusEl.className = 'status success';
            urlEl.textContent = stats.url;
            productsEl.textContent = stats.productCount;
            variantsEl.textContent = stats.variantCount;
        } else {
            statusEl.textContent = 'Ulaşılamıyor';
            statusEl.className = 'status error';
            urlEl.textContent = stats.url;
            productsEl.textContent = 'N/A';
            variantsEl.textContent = 'N/A';
        }
    } catch (error) {
        statusEl.textContent = 'Hata';
        statusEl.className = 'status error';
    }
}

function addLog(message, level = 'info') {
    const logContainer = document.getElementById('log-container');
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}\\n`;
    
    logContainer.textContent += logEntry;
    logContainer.scrollTop = logContainer.scrollHeight;
}
