import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// .env dosyasının yolunu projenin kök dizininde bul
const envPath = path.resolve(process.cwd(), '.env');

export async function updateEnvFile(key: string, value: string): Promise<void> {
    try {
        // .env dosyasını oku, yoksa boş bir string ile başla
        let envFileContent = '';
        try {
            envFileContent = await fs.readFile(envPath, 'utf-8');
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                throw error; // Dosya yok hatası dışındaki hataları fırlat
            }
        }

        const envConfig = dotenv.parse(envFileContent);
        envConfig[key] = value;

        const newEnvFileContent = Object.entries(envConfig)
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        await fs.writeFile(envPath, newEnvFileContent);
        
        // process.env'i de güncelle ki uygulama yeniden başlamadan yeni değer kullanılabilsin
        process.env[key] = value;

    } catch (error) {
        console.error(`.env dosyası güncellenirken hata oluştu:`, error);
        throw new Error('.env dosyası güncellenemedi.');
    }
}
