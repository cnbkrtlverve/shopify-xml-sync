import serverless from 'serverless-http';
import app from './dist/server'; // Derlenmiş sunucu dosyasını import et

// Express app'ini serverless bir fonksiyona çevir
export const handler = serverless(app);
