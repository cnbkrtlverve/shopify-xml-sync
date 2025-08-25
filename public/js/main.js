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
        fetch('/.netlify/functions/api/google/exchange-code', {
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
    document.getElementById('clean-test-btn').addEventListener('click', handleCleanTestProducts);

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
    fetch('/.netlify/functions/api/config', {
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
    
    if (currentConfig.shopifyUrl) apiHeaders['X-Shopify-Shop-Url'] = currentConfig.shopifyUrl;
    if (currentConfig.shopifyAdminToken) apiHeaders['X-Shopify-Access-Token'] = currentConfig.shopifyAdminToken;

    showConfigMessage('Shopify bağlantısı test ediliyor...', 'info');
    try {
        const result = await fetch('/.netlify/functions/api/shopify/check', {
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
        const result = await fetch('/.netlify/functions/api/xml/check', {
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
    
    if (config.shopifyUrl) apiHeaders['X-Shopify-Shop-Url'] = config.shopifyUrl;
    if (config.shopifyAdminToken) apiHeaders['X-Shopify-Access-Token'] = config.shopifyAdminToken;
    if (config.xmlUrl) apiHeaders['X-XML-Feed-Url'] = config.xmlUrl;

    console.log('Dashboard API çağrısı yapılıyor:', {
    url: '/.netlify/functions/api/shopify/info',
        headers: {
            hasShopifyUrl: !!apiHeaders['X-Shopify-Shop-Url'],
            hasShopifyToken: !!apiHeaders['X-Shopify-Access-Token'],
            shopifyUrl: apiHeaders['X-Shopify-Shop-Url']?.substring(0, 20) + '...'
        }
    });

    // Önce debug endpoint'i test edelim
    try {
        console.log('Debug endpoint test ediliyor...');
        const debugResponse = await fetch('/.netlify/functions/api/debug/env', {
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

    fetch('/.netlify/functions/api/shopify/info', {
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
    const xmlVariants = document.getElementById('xml-variants');
    const xmlParseMethod = document.getElementById('xml-parse-method');
    const xmlFeatures = document.getElementById('xml-features');
    const lastChecked = document.getElementById('xml-last-checked');

    // AbortController ile timeout
    const xmlController = new AbortController();
    const xmlTimeoutId = setTimeout(() => xmlController.abort(), 30000); // 30 saniye

    console.log('XML stats kontrol başlatılıyor:', {
    url: '/.netlify/functions/api/xml/stats',
        xmlUrl: config.xmlUrl,
        headers: Object.keys(apiHeaders)
    });

    fetch('/.netlify/functions/api/xml/stats', {
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
                    xmlSourceUrl.textContent = data.url?.substring(0, 50) + '...' || 'N/A';
                    xmlProducts.textContent = data.productCount || 0;
                    xmlVariants.textContent = data.variantCount || 0;
                    xmlParseMethod.textContent = data.debug?.parseMethod || 'N/A';
                    
                    // Ürün özelliklerini göster
                    if (data.debug?.productAnalysis) {
                        const analysis = data.debug.productAnalysis;
                        const features = [];
                        if (analysis.hasId) features.push('ID');
                        if (analysis.hasName) features.push('İsim');
                        if (analysis.hasPrice) features.push('Fiyat');
                        if (analysis.hasStock) features.push('Stok');
                        if (analysis.hasCategory) features.push('Kategori');
                        if (analysis.hasImage) features.push('Resim');
                        if (analysis.hasVariants) features.push('Varyant');
                        
                        xmlFeatures.textContent = features.length > 0 ? features.join(', ') : 'Temel alanlar';
                    } else {
                        xmlFeatures.textContent = 'Analiz edilmedi';
                    }
                    
                    lastChecked.textContent = new Date().toLocaleString();
                    
                    console.log('XML Stats:', {
                        products: data.productCount,
                        variants: data.variantCount,
                        parseMethod: data.debug?.parseMethod,
                        analysis: data.debug?.productAnalysis
                    });
                } else {
                    throw new Error(data.message || 'XML stats alınamadı.');
                }
            } catch (jsonError) {
                console.error('XML JSON Parse Error:', jsonError);
                throw new Error('Geçersiz JSON yanıtı alındı');
            }
        })
        .catch(e => {
            clearTimeout(xmlTimeoutId);
            if (e.name === 'AbortError') {
                console.log('XML zaman aşımı (30s)');
                xmlStatus.textContent = 'Zaman Aşımı';
            } else {
                console.error('XML dashboard hatası:', e);
                xmlStatus.textContent = 'Hata';
            }
            xmlStatus.className = 'status-badge error';
            xmlSourceUrl.textContent = 'N/A';
            xmlProducts.textContent = 'N/A';
            xmlVariants.textContent = 'N/A';
            xmlParseMethod.textContent = 'N/A';
            xmlFeatures.textContent = 'N/A';
            lastChecked.textContent = 'N/A';
        });
    
    // Google Status
    const googleStatus = document.getElementById('google-status');
    
    // Google header'larını ekle
    if (config.googleClientId) apiHeaders['X-Google-Client-Id'] = config.googleClientId;
    if (config.googleClientSecret) apiHeaders['X-Google-Client-Secret'] = config.googleClientSecret;
    if (config.googleRedirectUri) apiHeaders['X-Google-Redirect-Uri'] = config.googleRedirectUri;
    if (config.googleRefreshToken) apiHeaders['X-Google-Refresh-Token'] = config.googleRefreshToken;
    
    fetch('/.netlify/functions/api/google/status', {
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
    fetch('/.netlify/functions/api/sync/summary', {
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

// --- YENİ SYNC V2 FONKSİYONLARI ---

let isSyncing = false;
let stopSync = false;

function handleStopSync() {
    if (isSyncing) {
        stopSync = true;
        addLog('🛑 Durdurma isteği alındı. Mevcut batch tamamlandıktan sonra durdurulacak.', 'warn');
        document.getElementById('stop-sync-btn').disabled = true;
        document.getElementById('stop-sync-btn').textContent = 'Durduruluyor...';
    }
}

async function handleStartSync() {
    if (isSyncing) {
        addLog('Zaten bir senkronizasyon çalışıyor.', 'warn');
        return;
    }

    const config = window.configService.getConfig();
    if (!config.shopifyUrl || !config.shopifyAdminToken) {
        alert('Lütfen önce Shopify konfigürasyonunu tamamlayın.');
        return;
    }

    // UI'ı başlat
    isSyncing = true;
    stopSync = false;
    document.getElementById('start-sync-btn').disabled = true;
    document.getElementById('clean-test-btn').disabled = true;
    document.getElementById('stop-sync-btn').style.display = 'inline-block';
    document.getElementById('stop-sync-btn').disabled = false;
    document.getElementById('stop-sync-btn').textContent = 'Durdur';
    document.getElementById('sync-progress-container').style.display = 'block';
    updateProgressBar(0, 'Başlatılıyor...');
    
    const logContainer = document.getElementById('sync-log');
    logContainer.innerHTML = ''; // Önceki logları temizle
    addLog('🚀 Senkronizasyon V2 başlatılıyor...', 'info');

    const apiHeaders = {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Url': config.shopifyUrl,
        'X-Shopify-Access-Token': config.shopifyAdminToken,
    };

    try {
        // 1. Initiate Sync: Get all products from XML
        addLog('🔄 XML verisi alınıyor ve ürün listesi hazırlanıyor...', 'info');
        const initiateResponse = await fetch('/.netlify/functions/api/sync/initiate', {
            method: 'POST',
            headers: apiHeaders
        });

        if (!initiateResponse.ok) {
            throw new Error(`Başlatma hatası: ${initiateResponse.statusText}`);
        }

        const initiateData = await initiateResponse.json();
        if (!initiateData.success) {
            throw new Error(initiateData.message || 'Ürün listesi alınamadı.');
        }

        const allProducts = initiateData.products;
        const totalProducts = initiateData.totalProducts;
        addLog(`✅ ${totalProducts} ürün bulundu. Batch işlemleri başlıyor.`, 'success');

        // 2. Process in Batches
        const BATCH_SIZE = 10; // Netlify timeout'larını önlemek için küçük tutalım
        let processedCount = 0;
        let totalCreated = 0;
        let totalUpdated = 0;
        let totalErrors = 0;

        for (let i = 0; i < totalProducts; i += BATCH_SIZE) {
            if (stopSync) {
                addLog('� Senkronizasyon kullanıcı tarafından durduruldu.', 'warn');
                break;
            }

            const batch = allProducts.slice(i, i + BATCH_SIZE);
            const batchNumber = (i / BATCH_SIZE) + 1;
            addLog(`📦 Batch #${batchNumber} işleniyor (${batch.length} ürün)...`, 'info');

            try {
                const batchResponse = await fetch('/.netlify/functions/api/sync/batch', {
                    method: 'POST',
                    headers: apiHeaders,
                    body: JSON.stringify({ productsToProcess: batch })
                });

                if (!batchResponse.ok) {
                    throw new Error(`Batch #${batchNumber} hatası: ${batchResponse.statusText}`);
                }

                const batchResult = await batchResponse.json();
                if (batchResult.success) {
                    totalCreated += batchResult.created;
                    totalUpdated += batchResult.updated;
                    totalErrors += batchResult.errors;
                    addLog(`👍 Batch #${batchNumber} tamamlandı: ${batchResult.created} oluşturuldu, ${batchResult.updated} güncellendi, ${batchResult.errors} hata.`, 'success');
                } else {
                    totalErrors += batch.length;
                    addLog(`👎 Batch #${batchNumber} işlenemedi: ${batchResult.message}`, 'error');
                }

            } catch (batchError) {
                totalErrors += batch.length;
                addLog(`💥 Batch #${batchNumber} sırasında kritik hata: ${batchError.message}`, 'error');
            }
            
            processedCount += batch.length;
            const progress = Math.round((processedCount / totalProducts) * 100);
            updateProgressBar(progress, `${processedCount} / ${totalProducts}`);
        }

        // 3. Finalize Sync
        addLog('🏁 Senkronizasyon tamamlandı!', 'info');
        addLog('--- ÖZET ---', 'info');
        addLog(`➕ Toplam Oluşturulan: ${totalCreated}`, 'success');
        addLog(`📝 Toplam Güncellenen: ${totalUpdated}`, 'warn');
        addLog(`❌ Toplam Hata: ${totalErrors}`, 'error');
        updateDashboard();

    } catch (error) {
        addLog(`❌ Senkronizasyon sırasında kritik bir hata oluştu: ${error.message}`, 'error');
        console.error('Sync V2 Error:', error);
    } finally {
        // UI'ı sıfırla
        isSyncing = false;
        stopSync = false;
        document.getElementById('start-sync-btn').disabled = false;
        document.getElementById('clean-test-btn').disabled = false;
        document.getElementById('stop-sync-btn').style.display = 'none';
        // Progress bar'ı 5 saniye sonra gizle
        setTimeout(() => {
            document.getElementById('sync-progress-container').style.display = 'none';
        }, 5000);
    }
}

function updateProgressBar(percentage, text) {
    const progressBar = document.getElementById('sync-progress-bar');
    const progressText = document.getElementById('sync-progress-text');
    
    percentage = Math.max(0, Math.min(100, percentage)); // 0-100 arasında kalmasını sağla
    
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = text || `${percentage}%`;
}

// --- ESKİ FONKSİYONLARI GÜNCELLE ---

function setupEventListeners() {
    // ... (diğer event listener'lar)
    
    // Sync Page
    document.getElementById('start-sync-btn').addEventListener('click', handleStartSync);
    document.getElementById('stop-sync-btn').addEventListener('click', handleStopSync); // Yeni
    document.getElementById('clean-test-btn').addEventListener('click', handleCleanTestProducts);

    // ... (diğer event listener'lar)
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
    fetch('/.netlify/functions/api/google/auth-url', {
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
        const response = await fetch('/.netlify/functions/api/google/create-sheet', { method: 'POST' });
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
    
    if (config.shopifyUrl) apiHeaders['X-Shopify-Shop-Url'] = config.shopifyUrl;
    if (config.shopifyAdminToken) apiHeaders['X-Shopify-Access-Token'] = config.shopifyAdminToken;

    try {
        const response = await fetch(`/.netlify/functions/api/shopify/search?q=${encodeURIComponent(query)}`, {
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

async function handleCleanTestProducts() {
    const btn = document.getElementById('clean-test-btn');
    const config = window.configService.getConfig();
    
    if (!config.shopifyUrl || !config.shopifyAdminToken) {
        addLog('Shopify ayarları eksik! Lütfen önce ayarları yapın.', 'error');
        return;
    }
    
    // Onay iste
    if (!confirm('Test ürünlerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Temizleniyor...';
    
    addLog('Test ürünleri temizleniyor...', 'info');
    
    try {
        // 15 saniye timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch('/.netlify/functions/api/sync/clean', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Shop-Url': config.shopifyUrl,
                'X-Shopify-Access-Token': config.shopifyAdminToken
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Response kontrolü
        if (!response.ok) {
            if (response.status === 504) {
                addLog('⏱️ İşlem zaman aşımına uğradı, tekrar deneyin', 'warning');
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // JSON parse kontrolü
        let result;
        try {
            const responseText = await response.text();
            if (!responseText.trim()) {
                addLog('⚠️ Boş yanıt alındı, işlem devam ediyor olabilir', 'warning');
                return;
            }
            result = JSON.parse(responseText);
        } catch (parseError) {
            addLog('⚠️ Yanıt formatı hatalı, işlem devam ediyor olabilir', 'warning');
            console.error('Parse error:', parseError);
            return;
        }
        
        if (result.success) {
            addLog(`✅ ${result.message}`, 'success');
            if (result.deletedProducts && result.deletedProducts.length > 0) {
                result.deletedProducts.forEach(product => {
                    addLog(`  • ${product.title} (ID: ${product.id})`, 'info');
                });
            }
            
            if (result.remainingCount > 0) {
                addLog(`🔄 ${result.remainingCount} ürün kaldı, tekrar "Temizle" butonuna basın`, 'warning');
            }
            
            updateDashboard(); // Dashboard'u güncelle
        } else {
            addLog(`❌ Temizleme hatası: ${result.message}`, 'error');
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            addLog('⏱️ İşlem zaman aşımına uğradı (15 saniye)', 'warning');
            addLog('💡 Çok fazla ürün var, tekrar deneyin', 'info');
        } else {
            addLog(`❌ Bağlantı hatası: ${error.message}`, 'error');
        }
        console.error('Clean error:', error);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Test Ürünlerini Temizle';
    }
}
