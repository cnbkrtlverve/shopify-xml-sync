// auth.js - Kimlik doğrulama sistemi
class Auth {
    constructor() {
        this.isLoggedIn = false;
        this.credentials = {
            username: 'admin',
            password: 'vervegrand2024'
        };
        this.checkLoginStatus();
    }
    
    checkLoginStatus() {
        const loginStatus = sessionStorage.getItem('isLoggedIn');
        this.isLoggedIn = loginStatus === 'true';
        this.updateUI();
    }
    
    login(username, password) {
        if (username === this.credentials.username && password === this.credentials.password) {
            this.isLoggedIn = true;
            sessionStorage.setItem('isLoggedIn', 'true');
            this.updateUI();
            return true;
        }
        return false;
    }
    
    logout() {
        this.isLoggedIn = false;
        sessionStorage.removeItem('isLoggedIn');
        this.updateUI();
    }
    
    updateUI() {
        const loginScreen = document.getElementById('login-screen');
        const mainPanel = document.getElementById('main-panel');
        
        if (this.isLoggedIn) {
            loginScreen.style.display = 'none';
            mainPanel.style.display = 'block';
        } else {
            loginScreen.style.display = 'flex';
            mainPanel.style.display = 'none';
        }
    }
}

// Global auth instance
window.auth = new Auth();
