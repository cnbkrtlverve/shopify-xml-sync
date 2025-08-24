document.addEventListener('DOMContentLoaded', () => {
    const xmlStatusIndicator = document.querySelector('#xml-status .indicator');
    const shopifyStatusIndicator = document.querySelector('#shopify-status .indicator');
    const syncButton = document.getElementById('sync-button');
    const logs = document.getElementById('logs');

    function setStatus(element, isSuccess, text) {
        element.classList.remove('pending', 'success', 'error');
        element.classList.add(isSuccess ? 'success' : 'error');
        element.textContent = text;
    }

    function addLog(message) {
        logs.textContent += `[${new Date().toLocaleTimeString()}] ${message}\n`;
        logs.scrollTop = logs.scrollHeight;
    }

    async function checkConnections() {
        addLog('Bağlantılar kontrol ediliyor...');
        try {
            const xmlRes = await fetch('/api/status/xml');
            const xmlData = await xmlRes.json();
            setStatus(xmlStatusIndicator, xmlData.success, xmlData.message);
        } catch (error) {
            setStatus(xmlStatusIndicator, false, 'Sunucu Hatası');
        }

        try {
            const shopifyRes = await fetch('/api/status/shopify');
            const shopifyData = await shopifyRes.json();
            setStatus(shopifyStatusIndicator, shopifyData.success, shopifyData.message);
        } catch (error) {
            setStatus(shopifyStatusIndicator, false, 'Sunucu Hatası');
        }
    }

    syncButton.addEventListener('click', async () => {
        syncButton.disabled = true;
        syncButton.textContent = 'Senkronize Ediliyor...';
        addLog('Senkronizasyon başlatıldı. Lütfen bekleyin...');
        
        try {
            const response = await fetch('/api/sync', { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                addLog(`BAŞARILI: ${result.message}`);
            } else {
                addLog(`HATA: ${result.message}`);
            }
        } catch (error) {
            addLog('Sunucu ile iletişim kurulamadı.');
        } finally {
            syncButton.disabled = false;
            syncButton.textContent = 'Senkronizasyonu Başlat';
        }
    });

    checkConnections();
});