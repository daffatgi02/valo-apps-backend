class ValorantAPITester {
    constructor() {
        this.apiUrl = 'http://localhost:3000/api';
        this.token = localStorage.getItem('valo_token');
        this.initializeElements();
        this.bindEvents();
        this.checkAuthStatus();
    }

    initializeElements() {
        // Config elements
        this.apiUrlInput = document.getElementById('apiUrl');
        
        // Auth elements
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.loginBtn = document.getElementById('loginBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.authStatus = document.getElementById('authStatus');
        this.authMessage = document.getElementById('authMessage');
        this.userInfo = document.getElementById('userInfo');
        this.userProfile = document.getElementById('userProfile');
        
        // API testing elements
        this.getDailyStoreBtn = document.getElementById('getDailyStore');
        this.getStoreHistoryBtn = document.getElementById('getStoreHistory');
        this.getFavoritesBtn = document.getElementById('getFavorites');
        this.getAllSkinsBtn = document.getElementById('getAllSkins');
        this.getAllBundlesBtn = document.getElementById('getAllBundles');
        this.healthCheckBtn = document.getElementById('healthCheck');
        
        // Favorites elements
        this.skinIdInput = document.getElementById('skinIdInput');
        this.addFavoriteBtn = document.getElementById('addFavorite');
        this.removeFavoriteBtn = document.getElementById('removeFavorite');
        
        // Response elements
        this.responseArea = document.getElementById('responseArea');
        this.clearResponseBtn = document.getElementById('clearResponse');
        this.copyResponseBtn = document.getElementById('copyResponse');
        
        // Store elements
        this.storeSection = document.getElementById('storeSection');
        this.storeInfo = document.getElementById('storeInfo');
        this.storeItems = document.getElementById('storeItems');
        
        // Loading
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    bindEvents() {
        // Config
        this.apiUrlInput.addEventListener('change', (e) => {
            this.apiUrl = e.target.value;
        });

        // Auth events
        this.loginBtn.addEventListener('click', () => this.login());
        this.logoutBtn.addEventListener('click', () => this.logout());
        this.refreshBtn.addEventListener('click', () => this.refreshSession());
        
        // API testing events
        this.getDailyStoreBtn.addEventListener('click', () => this.getDailyStore());
        this.getStoreHistoryBtn.addEventListener('click', () => this.getStoreHistory());
        this.getFavoritesBtn.addEventListener('click', () => this.getFavorites());
        this.getAllSkinsBtn.addEventListener('click', () => this.getAllSkins());
        this.getAllBundlesBtn.addEventListener('click', () => this.getAllBundles());
        this.healthCheckBtn.addEventListener('click', () => this.healthCheck());
        
        // Favorites events
        this.addFavoriteBtn.addEventListener('click', () => this.addFavorite());
        this.removeFavoriteBtn.addEventListener('click', () => this.removeFavorite());
        
        // Response events
        this.clearResponseBtn.addEventListener('click', () => this.clearResponse());
        this.copyResponseBtn.addEventListener('click', () => this.copyResponse());
        
        // Enter key for login
        this.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
    }

    showLoading(show = true) {
        this.loadingOverlay.classList.toggle('show', show);
    }

    updateResponse(data, success = true) {
        const timestamp = new Date().toLocaleString();
        const formattedData = JSON.stringify(data, null, 2);
        this.responseArea.textContent = `[${timestamp}]\n${formattedData}`;
        
        // Scroll to response
        this.responseArea.scrollIntoView({ behavior: 'smooth' });
    }

    updateAuthStatus(isAuthenticated, message, userData = null) {
        const indicator = this.authStatus.querySelector('.status-indicator');
        indicator.className = `status-indicator ${isAuthenticated ? 'online' : 'offline'}`;
        indicator.textContent = isAuthenticated ? 'Online' : 'Offline';
        this.authMessage.textContent = message;
        
        // Update buttons
        this.loginBtn.disabled = isAuthenticated;
        this.logoutBtn.disabled = !isAuthenticated;
        this.refreshBtn.disabled = !isAuthenticated;
        this.getDailyStoreBtn.disabled = !isAuthenticated;
        this.getStoreHistoryBtn.disabled = !isAuthenticated;
        this.getFavoritesBtn.disabled = !isAuthenticated;
        this.addFavoriteBtn.disabled = !isAuthenticated;
        this.removeFavoriteBtn.disabled = !isAuthenticated;
        
        // Update user info
        if (userData) {
            this.userInfo.style.display = 'block';
            this.userProfile.textContent = JSON.stringify(userData, null, 2);
        } else {
            this.userInfo.style.display = 'none';
        }
    }

    async makeRequest(endpoint, options = {}) {
        try {
            const url = `${this.apiUrl}${endpoint}`;
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                },
                ...options
            };

            console.log(`Making request to: ${url}`);
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('Request error:', error);
            throw error;
        }
    }

    async login() {
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();
        
        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }

        this.showLoading(true);
        
        try {
            const data = await this.makeRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            
            if (data.success) {
                this.token = data.data.token;
                localStorage.setItem('valo_token', this.token);
                this.updateAuthStatus(true, `Logged in as ${data.data.user.username}`, data.data.user);
                this.updateResponse(data);
                
                // Clear password
                this.passwordInput.value = '';
            }
        } catch (error) {
            this.updateAuthStatus(false, `Login failed: ${error.message}`);
            this.updateResponse({ error: error.message }, false);
        } finally {
            this.showLoading(false);
        }
    }

    async logout() {
        this.showLoading(true);
        
        try {
            await this.makeRequest('/auth/logout', { method: 'POST' });
            
            this.token = null;
            localStorage.removeItem('valo_token');
            this.updateAuthStatus(false, 'Logged out successfully');
            this.updateResponse({ message: 'Logged out successfully' });
            this.storeSection.style.display = 'none';
        } catch (error) {
            this.updateResponse({ error: error.message }, false);
        } finally {
            this.showLoading(false);
        }
    }

    async refreshSession() {
        this.showLoading(true);
        
        try {
            const data = await this.makeRequest('/auth/refresh', { method: 'POST' });
            this.updateResponse(data);
            
            if (data.success) {
                this.updateAuthStatus(true, 'Session refreshed successfully');
            }
        } catch (error) {
            this.updateAuthStatus(false, 'Session expired, please login again');
            this.updateResponse({ error: error.message }, false);
            this.token = null;
            localStorage.removeItem('valo_token');
        } finally {
            this.showLoading(false);
        }
    }

    async checkAuthStatus() {
        if (!this.token) {
            this.updateAuthStatus(false, 'Not authenticated');
            return;
        }

        try {
            const data = await this.makeRequest('/auth/me');
            if (data.success) {
                this.updateAuthStatus(true, `Logged in as ${data.data.username}`, data.data);
            }
        } catch (error) {
            this.updateAuthStatus(false, 'Session expired');
            this.token = null;
            localStorage.removeItem('valo_token');
        }
    }

    async getDailyStore() {
        this.showLoading(true);
        
        try {
            const data = await this.makeRequest('/store/daily');
            this.updateResponse(data);
            
            if (data.success) {
                this.displayStore(data.data);
            }
        } catch (error) {
            this.updateResponse({ error: error.message }, false);
        } finally {
            this.showLoading(false);
        }
    }

    async getStoreHistory() {
        this.showLoading(true);
        
        try {
            const data = await this.makeRequest('/store/history?days=7');
            this.updateResponse(data);
        } catch (error) {
            this.updateResponse({ error: error.message }, false);
        } finally {
            this.showLoading(false);
        }
    }

    async getFavorites() {
        this.showLoading(true);
        
        try {
            const data = await this.makeRequest('/store/favorites');
            this.updateResponse(data);
        } catch (error) {
            this.updateResponse({ error: error.message }, false);
        } finally {
            this.showLoading(false);
        }
    }

    async addFavorite() {
        const skinId = this.skinIdInput.value.trim();
        if (!skinId) {
            alert('Please enter a skin ID');
            return;
        }

        this.showLoading(true);
        
        try {
            const data = await this.makeRequest(`/store/favorites/${skinId}`, {
                method: 'POST'
            });
            this.updateResponse(data);
        } catch (error) {
            this.updateResponse({ error: error.message }, false);
        } finally {
            this.showLoading(false);
        }
    }

    async removeFavorite() {
        const skinId = this.skinIdInput.value.trim();
        if (!skinId) {
            alert('Please enter a skin ID');
            return;
        }

        this.showLoading(true);
        
        try {
            const data = await this.makeRequest(`/store/favorites/${skinId}`, {
                method: 'DELETE'
            });
            this.updateResponse(data);
        } catch (error) {
            this.updateResponse({ error: error.message }, false);
        } finally {
            this.showLoading(false);
        }
    }

    async getAllSkins() {
        this.showLoading(true);
        
        try {
            const data = await this.makeRequest('/game-data/skins');
            this.updateResponse(data);
        } catch (error) {
            this.updateResponse({ error: error.message }, false);
        } finally {
            this.showLoading(false);
        }
    }

    async getAllBundles() {
        this.showLoading(true);
        
        try {
            const data = await this.makeRequest('/game-data/bundles');
            this.updateResponse(data);
        } catch (error) {
            this.updateResponse({ error: error.message }, false);
        } finally {
            this.showLoading(false);
        }
    }

    async healthCheck() {
        this.showLoading(true);
        
        try {
            const data = await this.makeRequest('/health');
            this.updateResponse(data);
        } catch (error) {
            this.updateResponse({ error: error.message }, false);
        } finally {
            this.showLoading(false);
        }
    }

    displayStore(storeData) {
        this.storeSection.style.display = 'block';
        
        // Store info
        this.storeInfo.innerHTML = `
            <h4>Store Information</h4>
            <p><strong>Refresh Time:</strong> ${new Date(storeData.refreshTime).toLocaleString()}</p>
            <p><strong>Expires:</strong> ${new Date(storeData.expires).toLocaleString()}</p>
            <p><strong>Items Count:</strong> ${storeData.store.skins.length}</p>
        `;
        
        // Store items
        this.storeItems.innerHTML = '';
        
        if (storeData.store.skins.length === 0) {
            this.storeItems.innerHTML = '<p>No skins in store</p>';
            return;
        }
        
        storeData.store.skins.forEach(skin => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'store-item';
            
            itemDiv.innerHTML = `
                <img src="${skin.displayIcon || 'https://via.placeholder.com/200x150?text=No+Image'}" 
                     alt="${skin.displayName || 'Unknown Skin'}" 
                     onerror="this.src='https://via.placeholder.com/200x150?text=No+Image'">
                <h4>${skin.displayName || 'Unknown Skin'}</h4>
                <p><strong>ID:</strong> ${skin.id}</p>
                ${skin.bundle ? `
                    <div class="bundle-info">
                        <strong>Bundle:</strong> ${skin.bundle.displayName}<br>
                        ${skin.bundle.description || ''}
                    </div>
                ` : ''}
                <button class="btn btn-sm btn-warning" onclick="app.addSkinToFavorite('${skin.id}')">
                    Add to Favorites
                </button>
            `;
            
            this.storeItems.appendChild(itemDiv);
        });
    }

    addSkinToFavorite(skinId) {
        this.skinIdInput.value = skinId;
        this.addFavorite();
    }

    clearResponse() {
        this.responseArea.textContent = 'No response yet...';
    }

    copyResponse() {
        navigator.clipboard.writeText(this.responseArea.textContent).then(() => {
            alert('Response copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ValorantAPITester();
});