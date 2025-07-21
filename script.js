// script.js

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
let currentToken = localStorage.getItem('valorant_token');
let activeAccounts = JSON.parse(localStorage.getItem('active_accounts') || '{}');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkServerHealth();
    loadCurrentSession();
    loadActiveAccounts();
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        if (currentToken) {
            getAllSessions();
        }
    }, 30000);
});

// Utility Functions
function showLoading(show = true) {
    document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
}

function showAlert(message, type = 'info') {
    const alertArea = document.getElementById('alertArea');
    const alertClass = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    }[type];
    
    const alertHtml = `
        <div class="${alertClass} text-white p-4 rounded-lg mb-4 flex items-center justify-between">
            <div class="flex items-center">
                <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} mr-2"></i>
                ${message}
            </div>
            <button onclick="this.parentElement.remove()" class="text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    alertArea.insertAdjacentHTML('beforeend', alertHtml);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        const alerts = alertArea.children;
        if (alerts.length > 0) {
            alerts[alerts.length - 1].remove();
        }
    }, 5000);
}

function displayResponse(data, endpoint = '') {
    const responseArea = document.getElementById('responseArea');
    const timestamp = new Date().toLocaleTimeString();
    
    const responseHtml = `
        <div class="mb-4 ${data.success ? 'success-border' : 'error-border'} pl-4">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-gray-400">[${timestamp}] ${endpoint}</span>
                <span class="text-xs px-2 py-1 rounded ${data.success ? 'bg-green-600' : 'bg-red-600'}">
                    ${data.success ? 'SUCCESS' : 'ERROR'}
                </span>
            </div>
            <pre class="text-sm overflow-x-auto">${JSON.stringify(data, null, 2)}</pre>
        </div>
    `;
    
    responseArea.innerHTML = responseHtml + responseArea.innerHTML;
}

function clearResponse() {
    document.getElementById('responseArea').innerHTML = '<div class="text-gray-500">API responses will appear here...</div>';
}

async function makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(currentToken && { 'Authorization': `Bearer ${currentToken}` })
        },
        ...options
    };
    
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        displayResponse(data, `${options.method || 'GET'} ${endpoint}`);
        
        if (!response.ok && response.status === 401) {
            showAlert('Session expired. Please login again.', 'warning');
            clearAuth();
        }
        
        return { success: response.ok, data, status: response.status };
    } catch (error) {
        const errorData = { 
            success: false, 
            message: 'Network error: ' + error.message,
            error: error.toString()
        };
        displayResponse(errorData, `${options.method || 'GET'} ${endpoint}`);
        return { success: false, data: errorData };
    }
}

// Server Health Check
async function checkServerHealth() {
    const statusElement = document.getElementById('serverStatus');
    const serverInfoElement = document.getElementById('serverInfo');
    
    try {
        statusElement.innerHTML = '<i class="fas fa-circle-notch loading"></i> Checking...';
        statusElement.className = 'px-3 py-1 bg-yellow-500 text-xs rounded-full';
        
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`);
        const health = await response.json();
        
        if (health.success) {
            statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Online';
            statusElement.className = 'px-3 py-1 bg-green-500 text-xs rounded-full';
            
            serverInfoElement.innerHTML = `
                <div class="text-green-400">Status: ${health.status}</div>
                <div class="text-gray-300">Uptime: ${health.uptime}</div>
                <div class="text-gray-300">Memory: ${health.memory.used}/${health.memory.total}</div>
                <div class="text-gray-300">Environment: ${health.environment}</div>
            `;
        } else {
            throw new Error('Server returned error');
        }
        
        // Also check root endpoint for API info
        const rootResponse = await fetch(API_BASE_URL.replace('/api', ''));
        const rootData = await rootResponse.json();
        
        if (rootData.success) {
            displayResponse(rootData, 'GET /');
        }
        
    } catch (error) {
        statusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Offline';
        statusElement.className = 'px-3 py-1 bg-red-500 text-xs rounded-full';
        
        serverInfoElement.innerHTML = `
            <div class="text-red-400">Status: Offline</div>
            <div class="text-gray-400">Error: ${error.message}</div>
        `;
        
        showAlert('Server is offline or unreachable', 'error');
    }
}

// Authentication Functions
async function generateAuthUrl() {
    showLoading();
    
    const result = await makeRequest('/auth/generate-url');
    
    if (result.success && result.data.data?.authUrl) {
        const authUrl = result.data.data.authUrl;
        
        document.getElementById('authUrl').value = authUrl;
        document.getElementById('authUrlSection').classList.remove('hidden');
        
        showAlert('Auth URL generated! Copy and open in WebView for testing.', 'success');
    } else {
        showAlert('Failed to generate auth URL', 'error');
    }
    
    showLoading(false);
}

function copyAuthUrl() {
    const authUrlInput = document.getElementById('authUrl');
    authUrlInput.select();
    navigator.clipboard.writeText(authUrlInput.value);
    showAlert('Auth URL copied to clipboard!', 'success');
}

function simulateCallback() {
    // Simulate a successful OAuth callback with dummy tokens
    const dummyCallback = `https://playvalorant.com/opt_in#access_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkdW1teS11c2VyLWlkIiwiYWNjdCI6eyJnYW1lX25hbWUiOiJUZXN0VXNlciIsInRhZ19saW5lIjoiVEVTVCIsInJlZ2lvbiI6ImFwIn0sImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxNjQwOTk4ODAwfQ.dummy-signature&id_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkdW1teS11c2VyLWlkIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDA5OTg4MDB9.dummy-signature&token_type=Bearer`;
    
    document.getElementById('callbackUrl').value = dummyCallback;
    showAlert('Dummy callback URL generated for testing', 'info');
}

async function processCallback() {
    const callbackUrl = document.getElementById('callbackUrl').value.trim();
    
    if (!callbackUrl) {
        showAlert('Please enter a callback URL', 'warning');
        return;
    }
    
    showLoading();
    
    const result = await makeRequest('/auth/callback', {
        method: 'POST',
        body: JSON.stringify({ callbackUrl })
    });
    
    if (result.success && result.data.data?.token) {
        currentToken = result.data.data.token;
        localStorage.setItem('valorant_token', currentToken);
        
        const userData = result.data.data.user;
        activeAccounts[userData.id] = {
            username: userData.username,
            gameName: userData.gameName,
            tagLine: userData.tagLine,
            region: userData.region,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('active_accounts', JSON.stringify(activeAccounts));
        
        loadCurrentSession();
        loadActiveAccounts();
        
        showAlert(`Successfully logged in as ${userData.username}!`, 'success');
    } else {
        showAlert('Failed to process callback: ' + (result.data.message || 'Unknown error'), 'error');
    }
    
    showLoading(false);
}

function clearAuth() {
    currentToken = null;
    localStorage.removeItem('valorant_token');
    document.getElementById('callbackUrl').value = '';
    document.getElementById('authUrlSection').classList.add('hidden');
    loadCurrentSession();
    showAlert('Authentication cleared', 'info');
}

// API Functions
async function getProfile() {
    if (!currentToken) {
        showAlert('Please login first', 'warning');
        return;
    }
    
    showLoading();
    const result = await makeRequest('/auth/profile');
    
    if (result.success) {
        loadCurrentSession(result.data.data);
        showAlert('Profile loaded successfully', 'success');
    }
    
    showLoading(false);
}

async function refreshData() {
    if (!currentToken) {
        showAlert('Please login first', 'warning');
        return;
    }
    
    showLoading();
    const result = await makeRequest('/auth/refresh', { method: 'POST' });
    
    if (result.success) {
        showAlert('Data refreshed successfully', 'success');
        getProfile(); // Reload profile with fresh data
    }
    
    showLoading(false);
}

async function getAllSessions() {
    if (!currentToken) {
        showAlert('Please login first', 'warning');
        return;
    }
    
    const result = await makeRequest('/auth/sessions');
    
    if (result.success) {
        const sessions = result.data.data.sessions;
        loadActiveAccounts(sessions);
        showAlert(`Found ${Object.keys(sessions).length} active sessions`, 'success');
    }
}

async function switchAccount(targetUserId) {
    if (!currentToken) {
        showAlert('Please login first', 'warning');
        return;
    }
    
    showLoading();
    
    const result = await makeRequest('/auth/switch', {
        method: 'POST',
        body: JSON.stringify({ targetUserId })
    });
    
    if (result.success && result.data.data?.token) {
        currentToken = result.data.data.token;
        localStorage.setItem('valorant_token', currentToken);
        
        loadCurrentSession();
        showAlert(`Switched to ${result.data.data.user.username}`, 'success');
    } else {
        showAlert('Failed to switch account: ' + (result.data.message || 'Unknown error'), 'error');
    }
    
    showLoading(false);
}

async function logout() {
    if (!currentToken) {
        showAlert('No active session to logout', 'warning');
        return;
    }
    
    showLoading();
    
    const result = await makeRequest('/auth/logout', { method: 'POST' });
    
    if (result.success) {
        clearAuth();
        showAlert('Logged out successfully', 'success');
    } else {
        showAlert('Logout failed: ' + (result.data.message || 'Unknown error'), 'error');
    }
    
    showLoading(false);
}

// UI Update Functions
function loadCurrentSession(sessionData = null) {
    const sessionElement = document.getElementById('currentSession');
    
    if (!currentToken) {
        sessionElement.innerHTML = '<div class="text-gray-400">No active session</div>';
        return;
    }
    
    if (sessionData) {
        sessionElement.innerHTML = `
            <div class="space-y-2">
                <div class="flex items-center">
                    <i class="fas fa-user text-green-400 mr-2"></i>
                    <span class="font-medium">${sessionData.username}</span>
                </div>
                <div class="text-xs text-gray-400">
                    <div>Region: ${sessionData.region}</div>
                    <div>ID: ${sessionData.id}</div>
                </div>
                ${sessionData.balance ? `
                    <div class="mt-3 p-2 glass rounded">
                        <div class="text-xs font-medium mb-1">Balance:</div>
                        <div class="grid grid-cols-3 gap-1 text-xs">
                            <div class="text-center">
                                <div class="text-yellow-400">${sessionData.balance.valorantPoints}</div>
                                <div class="text-gray-500">VP</div>
                            </div>
                            <div class="text-center">
                                <div class="text-green-400">${sessionData.balance.radianitePoints}</div>
                                <div class="text-gray-500">RP</div>
                            </div>
                            <div class="text-center">
                                <div class="text-blue-400">${sessionData.balance.kingdomCredits}</div>
                                <div class="text-gray-500">KC</div>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    } else {
        sessionElement.innerHTML = `
            <div class="text-yellow-400">
                <i class="fas fa-key mr-2"></i>
                Token active - Click "Get Profile" to load data
            </div>
        `;
    }
}

function loadActiveAccounts(sessionsData = null) {
    const accountsElement = document.getElementById('activeAccounts');
    const accounts = sessionsData || activeAccounts;
    
    if (!accounts || Object.keys(accounts).length === 0) {
        accountsElement.innerHTML = '<div class="text-sm text-gray-400">No accounts loaded</div>';
        return;
    }
    
    const accountsHtml = Object.entries(accounts).map(([userId, account]) => `
        <div class="account-card glass p-3 rounded-lg cursor-pointer hover:bg-white hover:bg-opacity-10" 
             onclick="switchAccount('${userId}')">
            <div class="flex items-center justify-between">
                <div>
                    <div class="font-medium text-sm">${account.username || account.gameName + '#' + account.tagLine}</div>
                    <div class="text-xs text-gray-400">${account.region || 'Unknown region'}</div>
                </div>
                <i class="fas fa-arrow-right text-gray-400"></i>
            </div>
            ${account.lastActivity ? `
                <div class="text-xs text-gray-500 mt-1">
                    Last: ${new Date(account.lastActivity).toLocaleTimeString()}
                </div>
            ` : ''}
        </div>
    `).join('');
    
    accountsElement.innerHTML = accountsHtml;
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        if (document.getElementById('callbackUrl').value) {
            processCallback();
        }
    }
    
    if (e.key === 'Escape') {
        showLoading(false);
    }
});