import dotenv from 'dotenv';
// DÜZELTME: .env dosyasını okuma komutu, diğer her şeyden önce, en başa taşındı.
dotenv.config();

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { createSyncRouter } from './routes/syncRoutes';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let latestSummary = "Henüz bir senkronizasyon tamamlanmadı.";

// Logları ve özetleri tüm bağlı istemcilere gönder
const broadcastLog = (message: string, level: 'info' | 'success' | 'error' | 'warn') => {
    console.log(`[${level.toUpperCase()}] ${message}`);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'log', message, level }));
        }
    });
};

const onSyncComplete = (summary: string) => {
    latestSummary = summary;
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'sync_complete', message: summary }));
        }
    });
};

// Statik dosyalar için (index.html, css vb.)
app.use(express.static(path.join(__dirname, '..', 'public')));

// API rotaları
app.use('/api', createSyncRouter(broadcastLog, onSyncComplete));

// Ana sayfayı sun
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});