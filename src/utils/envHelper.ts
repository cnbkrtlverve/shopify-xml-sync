import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .env dosyasının yolu projenin kök dizinidir.
const envPath = path.resolve(process.cwd(), '.env');

export async function updateEnvFile(key: string, value: string): Promise<void> {
    try {
        let envFileContent = '';
        try {
            // Dosya varsa oku
            envFileContent = await fs.readFile(envPath, 'utf8');
        } catch (error: any) {
            // Dosya yoksa, hata atma, boş içerikle devam et
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        const envConfig = dotenv.parse(envFileContent);
        envConfig[key] = value;

        const newEnvFileContent = Object.entries(envConfig)
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        await fs.writeFile(envPath, newEnvFileContent);

        // process.env'i de anında güncelle
        process.env[key] = value;

    } catch (error) {
        console.error(`.env dosyası güncellenirken hata oluştu:`, error);
        throw new Error('.env dosyası güncellenemedi.');
    }
}