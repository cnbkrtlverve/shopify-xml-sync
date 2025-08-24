// auth.js - Kullanıcı kimlik doğrulama
class AuthService {
    constructor() {
        // Demo purposes: hardcoded credentials
        this.credentials = {
            'admin': '1234'
        };
        this.sessionKey = 'isLoggedIn';
    }

    login(username, password) {
        if (this.credentials[username] && this.credentials[username] === password) {
            sessionStorage.setItem(this.sessionKey, 'true');
            return true;
        }
        return false;
    }

    logout() {
        sessionStorage.removeItem(this.sessionKey);
    }

    isLoggedIn() {
        return sessionStorage.getItem(this.sessionKey) === 'true';
    }
}
