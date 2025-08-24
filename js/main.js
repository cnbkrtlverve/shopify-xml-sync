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
    document.getElementById('test-shopify').addEventListener('click', handleTestShopify);
    document.getElementById('test-xml').addEventListener('click', handleTestXML);
    
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
        showConfigMessage('Lütfen tüm alanları doldurun!', 'error');
        return;
    }
    
    // URL formatını kontrol et
    if (!shopifyStoreUrl.includes('.myshopify.com')) {
        showConfigMessage('Shopify Store URL formatı hatalı! Örnek: store-name.myshopify.com', 'error');
        return;
    }
    
    if (!shopifyToken.startsWith('shpat_')) {
        showConfigMessage('Shopify Token formatı hatalı! shpat_ ile başlamalı.', 'error');
        return;
    }
    
    if (!xmlFeedUrl.startsWith('http')) {
        showConfigMessage('XML URL formatı hatalı! http:// veya https:// ile başlamalı.', 'error');
        return;
    }
    
    window.appConfig.saveConfig(shopifyStoreUrl, shopifyToken, xmlFeedUrl);
    showConfigMessage('Ayarlar kaydedildi!', 'success');
    updateDashboard();
}

async function handleTestShopify() {
    const shopifyStoreUrl = document.getElementById('shopify-store-url').value;
    const shopifyToken = document.getElementById('shopify-token').value;
    
    if (!shopifyStoreUrl || !shopifyToken) {
        showConfigMessage('Lütfen Shopify ayarlarını doldurun!', 'error');
        return;
    }
    
    showConfigMessage('Shopify bağlantısı test ediliyor...', 'info');
    
    try {
        // Geçici config oluştur
        const originalConfig = {
            storeUrl: window.appConfig.shopifyStoreUrl,
            token: window.appConfig.shopifyToken
        };
        
        // Test için geçici ayarla
        window.appConfig.shopifyStoreUrl = shopifyStoreUrl;
        window.appConfig.shopifyToken = shopifyToken;
        
        const result = await window.shopifyService.checkConnection();
        
        // Orjinal ayarları geri yükle
        window.appConfig.shopifyStoreUrl = originalConfig.storeUrl;
        window.appConfig.shopifyToken = originalConfig.token;
        
        if (result.success) {
            showConfigMessage('✅ Shopify bağlantısı başarılı!', 'success');
        } else {
            showConfigMessage('❌ Shopify bağlantı hatası: ' + result.message, 'error');
        }
    } catch (error) {
        // Orjinal ayarları geri yükle
        window.appConfig.shopifyStoreUrl = originalConfig.storeUrl;
        window.appConfig.shopifyToken = originalConfig.token;
        showConfigMessage('❌ Shopify bağlantı hatası: ' + error.message, 'error');
    }
}

async function handleTestXML() {
    const xmlFeedUrl = document.getElementById('xml-feed-url').value;
    
    if (!xmlFeedUrl) {
        showConfigMessage('Lütfen XML Feed URL\'sini doldurun!', 'error');
        return;
    }
    
    showConfigMessage('XML bağlantısı test ediliyor...', 'info');
    
    try {
        // Geçici config oluştur
        const originalUrl = window.appConfig.xmlFeedUrl;
        
        // Test için geçici ayarla
        window.appConfig.xmlFeedUrl = xmlFeedUrl;
        
        const result = await window.xmlService.checkConnection();
        
        // Orjinal ayarları geri yükle
        window.appConfig.xmlFeedUrl = originalUrl;
        
        if (result.success) {
            showConfigMessage('✅ XML bağlantısı başarılı!', 'success');
        } else {
            showConfigMessage('❌ XML bağlantı hatası: ' + result.message, 'error');
        }
    } catch (error) {
        // Orjinal ayarları geri yükle
        window.appConfig.xmlFeedUrl = originalUrl;
        showConfigMessage('❌ XML bağlantı hatası: ' + error.message, 'error');
    }
}

function showConfigMessage(message, type) {
    const statusDiv = document.getElementById('config-status');
    const messageDiv = document.getElementById('config-message');
    
    statusDiv.style.display = 'block';
    messageDiv.textContent = message;
    
    // Renkleri ayarla
    switch(type) {
        case 'success':
            statusDiv.style.backgroundColor = '#d4edda';
            statusDiv.style.color = '#155724';
            statusDiv.style.borderColor = '#c3e6cb';
            break;
        case 'error':
            statusDiv.style.backgroundColor = '#f8d7da';
            statusDiv.style.color = '#721c24';
            statusDiv.style.borderColor = '#f5c6cb';
            break;
        case 'info':
            statusDiv.style.backgroundColor = '#d1ecf1';
            statusDiv.style.color = '#0c5460';
            statusDiv.style.borderColor = '#bee5eb';
            break;
    }
    
    statusDiv.style.border = '1px solid';
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
        nameEl.textContent = 'Ayarlar sekmesinden yapılandırın';
        emailEl.textContent = 'N/A';
        productsEl.textContent = 'N/A';
        return;
    }
    
    try {
        statusEl.textContent = 'Kontrol ediliyor...';
        statusEl.className = 'status';
        
        const connectionResult = await window.shopifyService.checkConnection();
        
        if (connectionResult.success) {
            const [shopInfo, productCount] = await Promise.all([
                window.shopifyService.getShopInfo(),
                window.shopifyService.getProductCount()
            ]);
            
            statusEl.textContent = 'Bağlı';
            statusEl.className = 'status success';
            nameEl.textContent = shopInfo.name || 'N/A';
            emailEl.textContent = shopInfo.email || 'N/A';
            productsEl.textContent = productCount;
        } else {
            statusEl.textContent = 'Bağlantı Hatası';
            statusEl.className = 'status error';
            nameEl.textContent = 'API anahtarını kontrol edin';
            emailEl.textContent = 'N/A';
            productsEl.textContent = 'N/A';
        }
    } catch (error) {
        statusEl.textContent = 'Hata';
        statusEl.className = 'status error';
        nameEl.textContent = error.message;
        emailEl.textContent = 'N/A';
        productsEl.textContent = 'N/A';
        console.error('Shopify status update error:', error);
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
        urlEl.textContent = 'Ayarlar sekmesinden URL girin';
        productsEl.textContent = 'N/A';
        variantsEl.textContent = 'N/A';
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
            productsEl.textContent = stats.error || 'Bağlantı hatası';
            variantsEl.textContent = 'N/A';
        }
    } catch (error) {
        statusEl.textContent = 'Hata';
        statusEl.className = 'status error';
        urlEl.textContent = error.message;
        productsEl.textContent = 'N/A';
        variantsEl.textContent = 'N/A';
        console.error('XML status update error:', error);
    }
}

function addLog(message, level = 'info') {
    const logContainer = document.getElementById('log-container');
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    logContainer.textContent += logEntry;
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Google Sheets fonksiyonları
async function handleGoogleSignIn() {
    try {
        addLog('Google hesabına giriş yapılıyor...', 'info');
        const success = await window.googleService.signIn();
        
        if (success) {
            addLog('Google hesabına başarıyla giriş yapıldı!', 'info');
            updateGoogleUI(true);
        } else {
            addLog('Google hesabına giriş yapılamadı!', 'error');
        }
    } catch (error) {
        console.error('Google sign-in error:', error);
        addLog(`Google giriş hatası: ${error.message}`, 'error');
    }
}

async function handleGoogleSignOut() {
    try {
        const success = await window.googleService.signOut();
        
        if (success) {
            addLog('Google hesabından çıkış yapıldı', 'info');
            updateGoogleUI(false);
        }
    } catch (error) {
        console.error('Google sign-out error:', error);
        addLog(`Google çıkış hatası: ${error.message}`, 'error');
    }
}

function updateGoogleUI(isSignedIn) {
    const signInBtn = document.getElementById('google-signin');
    const signOutBtn = document.getElementById('google-signout');
    const status = document.getElementById('google-status');
    
    if (signInBtn) signInBtn.style.display = isSignedIn ? 'none' : 'inline-block';
    if (signOutBtn) signOutBtn.style.display = isSignedIn ? 'inline-block' : 'none';
    if (status) status.textContent = isSignedIn ? 'Bağlı' : 'Bağlı değil';
}

// Sync progress handler
function handleSyncProgress(event) {
    const { message, percentage, totalProducts, processedProducts, isRunning } = event.detail;
    
    // Progress gösterimi
    addLog(`${message} (${processedProducts}/${totalProducts})`, 'info');
    
    // Sync button durumunu güncelle
    const syncButton = document.getElementById('sync-button');
    if (syncButton) {
        syncButton.disabled = isRunning;
        syncButton.textContent = isRunning ? 'Durduruluyor...' : 'Senkronizasyonu Başlat';
    }
}

// Event listener'ları ekle
document.addEventListener('DOMContentLoaded', function() {
    // Google Sheets event listeners
    document.getElementById('google-signin')?.addEventListener('click', handleGoogleSignIn);
    document.getElementById('google-signout')?.addEventListener('click', handleGoogleSignOut);
    document.getElementById('generate-sheet-button')?.addEventListener('click', handleGenerateSheet);
    
    // Sync progress listener
    window.addEventListener('syncProgress', handleSyncProgress);
    
    // Google UI'yi başlat
    setTimeout(() => {
        updateGoogleUI(window.googleService?.isSignedIn || false);
    }, 1000);
});

async function handleGenerateSheet() {
    try {
        if (!window.googleService.isSignedIn) {
            addLog('Google Sheets şablonu oluşturmak için önce Google hesabına giriş yapın!', 'error');
            return;
        }
        
        addLog('Shopify ürünleri getiriliyor...', 'info');
        const products = await window.shopifyService.getAllProducts();
        
        if (!products || products.length === 0) {
            addLog('Shopify\'da ürün bulunamadı!', 'error');
            return;
        }
        
        addLog(`${products.length} ürün bulundu, Google Sheets oluşturuluyor...`, 'info');
        
        // Başlık satırı
        const data = [
            ['ID', 'Başlık', 'SKU', 'Mevcut Fiyat', 'Yeni Fiyat', 'Maliyet', 'Kar Marjı (%)', 'Kategori', 'Stok', 'Durum']
        ];
        
        // Ürün verilerini ekle
        products.forEach(product => {
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(variant => {
                    const currentPrice = parseFloat(variant.price) || 0;
                    data.push([
                        product.id,
                        product.title,
                        variant.sku || '',
                        currentPrice,
                        '', // Yeni fiyat - kullanıcı dolduracak
                        '', // Maliyet - kullanıcı dolduracak
                        '', // Kar marjı - formül ile hesaplanacak
                        product.product_type || '',
                        variant.inventory_quantity || 0,
                        product.status
                    ]);
                });
            }
        });
        
        const spreadsheet = await window.googleService.createSpreadsheet(
            `Shopify Ürünler - ${new Date().toLocaleDateString('tr-TR')}`,
            data
        );
        
        addLog(`Google Sheets başarıyla oluşturuldu! URL: ${spreadsheet.url}`, 'success');
        
        // URL'yi açmak için sor
        if (confirm('Google Sheets dosyasını şimdi açmak ister misiniz?')) {
            window.open(spreadsheet.url, '_blank');
        }
        
    } catch (error) {
        console.error('Generate sheet error:', error);
        addLog(`Google Sheets oluşturma hatası: ${error.message}`, 'error');
    }
}
