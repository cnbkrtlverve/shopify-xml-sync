import serverless from 'serverless-http';
import app from '../../dist/server.js'; // Derlenmiş sunucu dosyasını doğru yoldan import et

// Express app'ini serverless bir fonksiyona çevir
export const handler = serverless(app);
