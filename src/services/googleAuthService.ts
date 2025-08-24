import { google } from 'googleapis';
import { updateEnvFile } from '../utils/envHelper';

// DÜZELTME: Google ayarlarının varlığını en başta kontrol et.
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error("Google kimlik bilgileri (.env dosyasında GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI) eksik. Lütfen kontrol edin.");
}

// oAuth2Client'ı diğer dosyalarda kullanabilmek için export ediyoruz.
export const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);

export function getGoogleAuthUrl(): string {
    const scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
    ];

    return oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: scopes,
    });
}

export async function getGoogleTokens(code: string): Promise<void> {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    if (tokens.refresh_token) {
        await updateEnvFile('GOOGLE_REFRESH_TOKEN', tokens.refresh_token);
    }
}

export function getAuthenticatedClient() {
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (!refreshToken) {
        return null;
    }
    oAuth2Client.setCredentials({
        refresh_token: refreshToken,
    });
    return oAuth2Client;
}

// YENİ: Kullanıcının kimliğinin doğrulanıp doğrulanmadığını basitçe kontrol eden fonksiyon
export function isGoogleAuthenticated(): boolean {
    // Eğer refresh token .env dosyasında varsa, kullanıcı doğrulanmış kabul edilir.
    return !!process.env.GOOGLE_REFRESH_TOKEN;
}