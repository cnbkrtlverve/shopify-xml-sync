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

    // Check for Google OAuth callback
    checkGoogleCallback();

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

function checkGoogleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code) {
        console.log('Google OAuth callback detected:', code);
        
        // Google OAuth'dan dönen kodu işle
        const config = window.configService.getConfig();
        
        const apiHeaders = {
            'Content-Type': 'application/json'
        };
        
        if (config.googleClientId) apiHeaders['X-Google-Client-Id'] = config.googleClientId;
        if (config.googleClientSecret) apiHeaders['X-Google-Client-Secret'] = config.googleClientSecret;
        if (config.googleRedirectUri) apiHeaders['X-Google-Redirect-Uri'] = config.googleRedirectUri;
        
        // Backend'e authorization code'u gönder
        fetch('/api/google/exchange-code', {
            method: 'POST',
            headers: apiHeaders,
            body: JSON.stringify({ code: code })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.refreshToken) {
                // Refresh token'ı kaydet
                const currentConfig = window.configService.getConfig();
                currentConfig.googleRefreshToken = data.refreshToken;
                window.configService.saveConfig(currentConfig);
                
                alert('Google ile bağlantı başarılı!');
                
                // URL'den OAuth parametrelerini temizle
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Dashboard'ı güncelle
                updateDashboard();
            } else {
                alert('Google authentication hatası: ' + (data.message || 'Bilinmeyen hata'));
            }
        })
        .catch(error => {
            console.error('Google callback error:', error);
            alert('Google authentication işlenirken hata: ' + error.message);
        });
    }
}

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
    document.getElementById('start-sync-btn').addEventListener('click', handleStartSync);

    // Google Sheets Page
    document.getElementById('google-auth-btn').addEventListener('click', handleGoogleAuth);
    document.getElementById('create-sheet-btn').addEventListener('click', handleCreateSheet);
    
    // Search Page
    const searchInput = document.getElementById('product-search-input');
    const searchResults = document.getElementById('search-results-container');
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value;
        if (query.length > 2) {
            searchTimeout = setTimeout(() => {
                handleProductSearch(query);
            }, 500); // Kullanıcı yazmayı bıraktıktan 500ms sonra ara
        } else {
            searchResults.innerHTML = ''; // Sorgu kısaysa sonuçları temizle
        }
    });
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

    if (page === 'dashboard') {
        updateDashboard();
    }
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
    if (document.getElementById('google-client-id')) {
        document.getElementById('google-client-id').value = config.googleClientId || '';
    }
    if (document.getElementById('google-client-secret')) {
        document.getElementById('google-client-secret').value = config.googleClientSecret || '';
    }
    if (document.getElementById('google-redirect-uri')) {
        document.getElementById('google-redirect-uri').value = config.googleRedirectUri || '';
    }
    if (document.getElementById('google-refresh-token')) {
        document.getElementById('google-refresh-token').value = config.googleRefreshToken || '';
    }
    if (document.getElementById('google-sheet-id')) {
        document.getElementById('google-sheet-id').value = config.googleSheetId || '';
    }
}

function handleSaveConfig() {
    const shopifyUrl = document.getElementById('shopify-url').value;
    const shopifyAdminToken = document.getElementById('shopify-admin-token').value;
    const xmlUrl = document.getElementById('xml-url').value;
    const googleClientId = document.getElementById('google-client-id').value;
    const googleClientSecret = document.getElementById('google-client-secret').value;
    const googleRedirectUri = document.getElementById('google-redirect-uri').value;
    const googleRefreshToken = document.getElementById('google-refresh-token').value;
    const googleSheetId = document.getElementById('google-sheet-id').value;
    
    window.configService.saveConfig({ 
        shopifyUrl, 
        shopifyAdminToken, 
        xmlUrl,
        googleClientId,
        googleClientSecret,
        googleRedirectUri,
        googleRefreshToken,
        googleSheetId 
    });
    
    // Backend'e de kaydet (Netlify'da bu sadece log amaçlı)
    fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            SHOPIFY_STORE_URL: shopifyUrl,
            SHOPIFY_ADMIN_API_TOKEN: shopifyAdminToken,
            XML_FEED_URL: xmlUrl,
            GOOGLE_CLIENT_ID: googleClientId,
            GOOGLE_CLIENT_SECRET: googleClientSecret,
            GOOGLE_REDIRECT_URI: googleRedirectUri,
            GOOGLE_REFRESH_TOKEN: googleRefreshToken,
            GOOGLE_SHEET_ID: googleSheetId
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showConfigMessage('⚠️ Ayarlar tarayıcıda kaydedildi. Netlify\'da çalışması için Environment Variables\'ları manuel olarak eklemelisiniz.', 'warn');
        } else {
            showConfigMessage(`Sunucu tarafında kaydetme hatası: ${data.message || 'Bilinmeyen hata'}`, 'error');
        }
    })
    .catch(err => {
        showConfigMessage(`Sunucuya bağlanırken hata: ${err.message}`, 'error');
    });

    updateDashboard(); // Refresh dashboard with new settings
}

async function handleTestShopify() {
    const currentConfig = window.configService.getConfig();
    
    const apiHeaders = {
        'Content-Type': 'application/json'
    };
    
    if (currentConfig.shopifyUrl) apiHeaders['X-Shopify-Store-Url'] = currentConfig.shopifyUrl;
    if (currentConfig.shopifyAdminToken) apiHeaders['X-Shopify-Admin-Token'] = currentConfig.shopifyAdminToken;

    showConfigMessage('Shopify bağlantısı test ediliyor...', 'info');
    try {
        const result = await fetch('/api/shopify/check', {
            headers: apiHeaders
        });
        const data = await result.json();
        if (data.success) {
            showConfigMessage('Shopify bağlantısı başarılı!', 'success');
        } else {
            showConfigMessage(`Bağlantı başarısız: ${data.message}`, 'error');
        }
    } catch (error) {
        showConfigMessage(`Bağlantı hatası: ${error.message}`, 'error');
    }
}

async function handleTestXML() {
    const currentConfig = window.configService.getConfig();
    
    const apiHeaders = {
        'Content-Type': 'application/json'
    };
    
    if (currentConfig.xmlUrl) apiHeaders['X-XML-Feed-Url'] = currentConfig.xmlUrl;

    showConfigMessage('XML bağlantısı test ediliyor...', 'info');
    
    // 8 saniye timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
        const result = await fetch('/api/xml/check', {
            headers: apiHeaders,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await result.json();
        if (data.success) {
            showConfigMessage('XML bağlantısı başarılı!', 'success');
        } else {
            showConfigMessage(`Bağlantı başarısız: ${data.message}`, 'error');
        }
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            showConfigMessage('XML bağlantısı zaman aşımına uğradı (8s)', 'error');
        } else {
            showConfigMessage(`Bağlantı hatası: ${error.message}`, 'error');
        }
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

    // API başlıklarını hazırla
    const apiHeaders = {
        'Content-Type': 'application/json'
    };
    
    if (config.shopifyUrl) apiHeaders['X-Shopify-Store-Url'] = config.shopifyUrl;
    if (config.shopifyAdminToken) apiHeaders['X-Shopify-Admin-Token'] = config.shopifyAdminToken;
    if (config.xmlUrl) apiHeaders['X-XML-Feed-Url'] = config.xmlUrl;

    console.log('Dashboard API çağrısı yapılıyor:', {
        url: '/api/shopify/info',
        headers: {
            hasShopifyUrl: !!apiHeaders['X-Shopify-Store-Url'],
            hasShopifyToken: !!apiHeaders['X-Shopify-Admin-Token'],
            shopifyUrl: apiHeaders['X-Shopify-Store-Url']?.substring(0, 20) + '...'
        }
    });

    // Önce debug endpoint'i test edelim
    try {
        console.log('Debug endpoint test ediliyor...');
        const debugResponse = await fetch('/api/debug/env', {
            headers: apiHeaders
        });
        const debugText = await debugResponse.text();
        console.log('Debug endpoint yanıtı:', {
            status: debugResponse.status,
            text: debugText
        });
    } catch (debugError) {
        console.error('Debug endpoint hatası:', debugError);
    }

    fetch('/api/shopify/info', {
        headers: apiHeaders
    })
        .then(res => {
            console.log('Dashboard API yanıtı alındı:', {
                status: res.status,
                statusText: res.statusText,
                headers: Object.fromEntries(res.headers.entries())
            });
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.text(); // Önce text olarak al
        })
        .then(text => {
            console.log('Dashboard raw response:', text);
            
            if (!text || text.trim() === '') {
                throw new Error('Boş yanıt alındı');
            }
            try {
                const data = JSON.parse(text);
                console.log('Dashboard parsed data:', data);
                
                if (data.success) {
                    shopifyStatus.textContent = 'Bağlandı';
                    shopifyStatus.className = 'status-badge success';
                    shopifyName.textContent = data.name || 'N/A';
                    shopifyEmail.textContent = data.email || 'N/A';
                    shopifyProducts.textContent = data.productCount || 0;
                } else {
                    throw new Error(data.message || 'Shopify\'e bağlanılamadı.');
                }
            } catch (jsonError) {
                console.error('JSON Parse Error:', jsonError);
                console.log('Raw response for debug:', text);
                throw new Error('Geçersiz JSON yanıtı alındı');
            }
        })
        .catch(e => {
            console.error('Shopify dashboard hatası:', e);
            shopifyStatus.textContent = 'Hata';
            shopifyStatus.className = 'status-badge error';
            shopifyName.textContent = 'N/A';
            shopifyEmail.textContent = 'N/A';
            shopifyProducts.textContent = 'N/A';
        });


    // XML Status
    const xmlStatus = document.getElementById('xml-status');
    const xmlSourceUrl = document.getElementById('xml-source-url');
    const xmlProducts = document.getElementById('xml-products');
    const lastChecked = document.getElementById('xml-last-checked');

    // AbortController ile timeout
    const xmlController = new AbortController();
    const xmlTimeoutId = setTimeout(() => xmlController.abort(), 30000); // 30 saniye

    console.log('XML kontrol başlatılıyor:', {
        url: '/api/xml/check',
        xmlUrl: config.xmlUrl,
        headers: Object.keys(apiHeaders)
    });

    fetch('/api/xml/check', {
        headers: apiHeaders,
        signal: xmlController.signal
    })
        .then(res => {
            clearTimeout(xmlTimeoutId);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.text(); // Önce text olarak al
        })
        .then(text => {
            if (!text || text.trim() === '') {
                throw new Error('Boş yanıt alındı');
            }
            try {
                const data = JSON.parse(text);
                if (data.success) {
                    xmlStatus.textContent = 'Bağlandı';
                    xmlStatus.className = 'status-badge success';
                    xmlSourceUrl.textContent = config.xmlUrl || 'N/A';
                    xmlProducts.textContent = data.debug?.dataLength ? 'Veri var' : 'N/A';
                    lastChecked.textContent = new Date().toLocaleString();
                } else {
                    throw new Error(data.message || 'XML\'e bağlanılamadı.');
                }
            } catch (jsonError) {
                console.error('XML JSON Parse Error:', jsonError);
                throw new Error('Geçersiz JSON yanıtı alındı');
            }
        })
        .catch(e => {
            clearTimeout(xmlTimeoutId);
            if (e.name === 'AbortError') {
                console.log('XML zaman aşımı (6s)');
                xmlStatus.textContent = 'Zaman Aşımı';
            } else {
                console.error('XML dashboard hatası:', e);
                xmlStatus.textContent = 'Hata';
            }
            xmlStatus.className = 'status-badge error';
            xmlSourceUrl.textContent = 'N/A';
            xmlProducts.textContent = 'N/A';
            lastChecked.textContent = 'N/A';
        });
    
    // Google Status
    const googleStatus = document.getElementById('google-status');
    
    // Google header'larını ekle
    if (config.googleClientId) apiHeaders['X-Google-Client-Id'] = config.googleClientId;
    if (config.googleClientSecret) apiHeaders['X-Google-Client-Secret'] = config.googleClientSecret;
    if (config.googleRedirectUri) apiHeaders['X-Google-Redirect-Uri'] = config.googleRedirectUri;
    if (config.googleRefreshToken) apiHeaders['X-Google-Refresh-Token'] = config.googleRefreshToken;
    
    fetch('/api/google/status', {
        headers: apiHeaders
    })
        .then(res => res.json())
        .then(data => {
            console.log('Google status response:', data);
            if (data.isAuthenticated) {
                googleStatus.textContent = 'Bağlandı';
                googleStatus.className = 'status-badge success';
            } else if (data.hasConfig) {
                googleStatus.textContent = 'Yapılandırıldı';
                googleStatus.className = 'status-badge warn';
            } else {
                googleStatus.textContent = 'Bağlı Değil';
                googleStatus.className = 'status-badge warn';
            }
        })
        .catch((error) => {
            console.error('Google status error:', error);
            googleStatus.textContent = 'Hata';
            googleStatus.className = 'status-badge error';
        });

    // Son Senkronizasyon Özeti
    const syncSummary = document.getElementById('last-sync-summary');
    fetch('/api/sync/summary', {
        headers: apiHeaders
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                syncSummary.innerHTML = data.summary || 'Henüz senkronizasyon yapılmadı.';
            } else {
                syncSummary.textContent = data.message || 'Özet alınamadı.';
            }
        })
        .catch(() => {
            syncSummary.textContent = 'Özet alınamadı.';
        });
}

function addLog(message, type = 'info') {
    const logContainer = document.getElementById('sync-log');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight; // Auto-scroll
}

// --- YENİ FONKSİYONLAR ---

function handleStartSync() {
    const config = window.configService.getConfig();
    
    if (!config.shopifyUrl || !config.shopifyAdminToken || !config.xmlUrl) {
        alert('Lütfen önce konfigürasyonu tamamlayın.');
        return;
    }

    const syncOptions = {
        full: document.getElementById('sync-full').checked,
        price: document.getElementById('sync-price').checked,
        inventory: document.getElementById('sync-inventory').checked,
        details: document.getElementById('sync-details').checked,
        images: document.getElementById('sync-images').checked,
    };

    const logContainer = document.getElementById('sync-log');
    logContainer.innerHTML = ''; // Önceki logları temizle
    addLog('Senkronizasyon başlatılıyor...', 'info');

    // Header'ları hazırla
    const apiHeaders = {
        'Content-Type': 'application/json'
    };
    
    if (config.shopifyUrl) apiHeaders['X-Shopify-Store-Url'] = config.shopifyUrl;
    if (config.shopifyAdminToken) apiHeaders['X-Shopify-Admin-Token'] = config.shopifyAdminToken;
    if (config.xmlUrl) apiHeaders['X-XML-Feed-Url'] = config.xmlUrl;

    // POST request ile sync başlat - AbortController ile timeout
    const syncController = new AbortController();
    const syncTimeoutId = setTimeout(() => {
        syncController.abort();
        addLog('Senkronizasyon zaman aşımına uğradı (30 saniye)', 'error');
    }, 30000); // 30 saniye timeout

    fetch('/api/sync', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ options: syncOptions }),
        signal: syncController.signal
    })
    .then(response => {
        clearTimeout(syncTimeoutId);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(result => {
        if (result.success) {
            addLog('Senkronizasyon başarılı!', 'success');
            addLog(`İşlenen ürün sayısı: ${result.processedCount || 0}`, 'info');
            if (result.debug) {
                addLog(`XML boyutu: ${result.debug.xmlSize} byte`, 'info');
                addLog(`Bulunan ürün: ${result.debug.productCount}`, 'info');
            }
            updateDashboard(); // Dashboard'u güncelle
        } else {
            addLog(`Senkronizasyon hatası: ${result.message}`, 'error');
            if (result.debug) {
                console.log('Sync debug:', result.debug);
            }
        }
    })
    .catch(error => {
        clearTimeout(syncTimeoutId);
        if (error.name === 'AbortError') {
            addLog('Senkronizasyon zaman aşımına uğradı', 'error');
        } else {
            addLog(`Bağlantı hatası: ${error.message}`, 'error');
        }
        console.error('Sync error:', error);
    });
}

function handleGoogleAuth() {
    const config = window.configService.getConfig();
    
    if (!config.googleClientId || !config.googleClientSecret) {
        alert('Lütfen önce Google Client ID ve Client Secret ayarlarını girin.');
        return;
    }
    
    const apiHeaders = {
        'Content-Type': 'application/json'
    };
    
    if (config.googleClientId) apiHeaders['X-Google-Client-Id'] = config.googleClientId;
    if (config.googleClientSecret) apiHeaders['X-Google-Client-Secret'] = config.googleClientSecret;
    if (config.googleRedirectUri) apiHeaders['X-Google-Redirect-Uri'] = config.googleRedirectUri;

    // Backend'deki auth URL'ini alıp yeni pencerede aç
    fetch('/api/google/auth-url', {
        headers: apiHeaders
    })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.url) {
                // Popup pencere yerine ana pencerede aç (redirect)
                window.location.href = data.url;
            } else {
                alert('Google kimlik doğrulama URL\'i alınamadı: ' + (data.message || 'Bilinmeyen hata'));
            }
        })
        .catch(err => {
            alert(`Hata: ${err.message}`);
        });
}

async function handleCreateSheet() {
    const btn = document.getElementById('create-sheet-btn');
    const status = document.getElementById('sheet-status');
    
    btn.disabled = true;
    status.textContent = 'Google Sheet oluşturuluyor, lütfen bekleyin...';
    
    try {
        const response = await fetch('/api/google/create-sheet', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            status.innerHTML = `Başarılı! <a href="${data.spreadsheetUrl}" target="_blank">Sheet'i Görüntüle</a>`;
        } else {
            status.textContent = `Hata: ${data.message}`;
        }
    } catch (err) {
        status.textContent = `İstek gönderilirken hata: ${err.message}`;
    } finally {
        btn.disabled = false;
    }
}

async function handleProductSearch(query) {
    const config = window.configService.getConfig();
    const resultsContainer = document.getElementById('search-results-container');
    resultsContainer.innerHTML = '<div class="loader"></div>'; // Yükleniyor animasyonu

    // Header'ları hazırla
    const apiHeaders = {
        'Content-Type': 'application/json'
    };
    
    if (config.shopifyUrl) apiHeaders['X-Shopify-Store-Url'] = config.shopifyUrl;
    if (config.shopifyAdminToken) apiHeaders['X-Shopify-Admin-Token'] = config.shopifyAdminToken;

    try {
        const response = await fetch(`/api/shopify/search?q=${encodeURIComponent(query)}`, {
            headers: apiHeaders
        });
        const data = await response.json();

        if (data.success && data.products) {
            renderSearchResults(data.products);
        } else {
            resultsContainer.innerHTML = `<p>Arama sırasında hata: ${data.message || 'Bilinmeyen hata'}</p>`;
        }
    } catch (error) {
        resultsContainer.innerHTML = `<p>Arama isteği gönderilemedi: ${error.message}</p>`;
    }
}

function renderSearchResults(products) {
    const resultsContainer = document.getElementById('search-results-container');
    if (products.length === 0) {
        resultsContainer.innerHTML = '<p>Aramanızla eşleşen ürün bulunamadı.</p>';
        return;
    }

    const productCards = products.map(product => `
        <div class="product-card">
            <div class="product-card-header">
                <h3 class="product-title">${product.title}</h3>
                <a href="https://${window.configService.getConfig().shopifyUrl}/admin/products/${product.id.split('/').pop()}" target="_blank" class="product-link">Shopify'da Görüntüle</a>
            </div>
            <div class="product-card-body">
                <p><strong>Handle:</strong> ${product.handle}</p>
                <p><strong>ID:</strong> ${product.id}</p>
                <h4>Varyantlar (${product.variants.length})</h4>
                <ul class="variant-list">
                    ${product.variants.map(v => `
                        <li>
                            <strong>${v.title}</strong> - 
                            SKU: ${v.sku || 'N/A'}, 
                            Fiyat: ${v.price || 'N/A'}, 
                            Stok: ${v.inventoryQuantity === null ? 'Takip Edilmiyor' : v.inventoryQuantity}
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `).join('');

    resultsContainer.innerHTML = productCards;
}
