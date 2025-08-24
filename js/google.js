// google.js - Google API işlemleri
class GoogleService {
    constructor() {
        this.clientId = '745770441738-oh1p9qijqtmgpfrslbmdop4im1dbfttp.apps.googleusercontent.com';
        this.apiKey = 'AIzaSyBYl3ILRqZ8lA7Z5H7ILRqZ8lA7Z5H7ILR'; // Google API Key gerekli
        this.discoveryDocs = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
        this.scopes = 'https://www.googleapis.com/auth/spreadsheets';
        this.isSignedIn = false;
    }
    
    async initializeGapi() {
        return new Promise((resolve, reject) => {
            if (typeof gapi === 'undefined') {
                // Google API script'ini yükle
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = () => {
                    gapi.load('auth2:client', () => {
                        gapi.client.init({
                            apiKey: this.apiKey,
                            clientId: this.clientId,
                            discoveryDocs: this.discoveryDocs,
                            scope: this.scopes
                        }).then(() => {
                            const authInstance = gapi.auth2.getAuthInstance();
                            this.isSignedIn = authInstance.isSignedIn.get();
                            resolve();
                        }).catch(reject);
                    });
                };
                script.onerror = reject;
                document.head.appendChild(script);
            } else {
                resolve();
            }
        });
    }
    
    async signIn() {
        try {
            await this.initializeGapi();
            const authInstance = gapi.auth2.getAuthInstance();
            await authInstance.signIn();
            this.isSignedIn = true;
            return true;
        } catch (error) {
            console.error('Google Sign-in failed:', error);
            return false;
        }
    }
    
    async signOut() {
        try {
            const authInstance = gapi.auth2.getAuthInstance();
            await authInstance.signOut();
            this.isSignedIn = false;
            return true;
        } catch (error) {
            console.error('Google Sign-out failed:', error);
            return false;
        }
    }
    
    async createSpreadsheet(title, data) {
        try {
            if (!this.isSignedIn) {
                throw new Error('Google hesabına giriş yapılmamış');
            }
            
            // Spreadsheet oluştur
            const response = await gapi.client.sheets.spreadsheets.create({
                properties: {
                    title: title
                }
            });
            
            const spreadsheetId = response.result.spreadsheetId;
            
            // Veri ekle
            if (data && data.length > 0) {
                await gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: 'Sheet1!A1',
                    valueInputOption: 'USER_ENTERED',
                    values: data
                });
            }
            
            return {
                id: spreadsheetId,
                url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
            };
        } catch (error) {
            console.error('Spreadsheet creation failed:', error);
            throw error;
        }
    }
    
    async updateSpreadsheet(spreadsheetId, range, values) {
        try {
            if (!this.isSignedIn) {
                throw new Error('Google hesabına giriş yapılmamış');
            }
            
            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                values: values
            });
            
            return true;
        } catch (error) {
            console.error('Spreadsheet update failed:', error);
            throw error;
        }
    }
    
    async getSpreadsheetData(spreadsheetId, range) {
        try {
            if (!this.isSignedIn) {
                throw new Error('Google hesabına giriş yapılmamış');
            }
            
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: range
            });
            
            return response.result.values || [];
        } catch (error) {
            console.error('Spreadsheet data fetch failed:', error);
            throw error;
        }
    }
}

// Global Google service instance
window.googleService = new GoogleService();
