/**
 * SnappFood Auth Mobile Application
 * Cordova-based mobile app for authenticating with SnappFood using JWT links
 */

class SnappFoodAuth {
    constructor() {
        this.currentBrowser = null;
        this.isProcessing = false;
        this.init();
    }

    init() {
        document.addEventListener('deviceready', () => {
            console.log('Device is ready');
            this.setupEventListeners();
            this.hideLoadingScreen();
        }, false);

        // Fallback for web testing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.hideLoadingScreen();
            });
        } else {
            this.setupEventListeners();
            this.hideLoadingScreen();
        }
    }

    setupEventListeners() {
        // Main page buttons
        document.getElementById('submitBtn').addEventListener('click', () => this.handleSubmit());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearForm());
        
        // Browser page buttons
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshBrowser());
        
        // Form input
        document.getElementById('apiUrl').addEventListener('input', () => this.clearStatus());
        
        // Handle back button
        document.addEventListener('backbutton', () => this.handleBackButton(), false);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 300);
            }, 1000);
        }
    }

    async handleSubmit() {
        if (this.isProcessing) return;

        const apiUrl = document.getElementById('apiUrl').value.trim();
        const submitBtn = document.getElementById('submitBtn');

        // Validate input
        if (!apiUrl) {
            this.showStatus('لطفا لینک را وارد کنید', 'warning');
            return;
        }

        if (!this.isValidUrl(apiUrl)) {
            this.showStatus('لینک وارد شده معتبر نیست', 'error');
            return;
        }

        this.isProcessing = true;
        this.setButtonState(submitBtn, 'loading');
        this.showStatus('در حال پردازش...', 'info');

        try {
            // Check network connectivity
            if (!this.isNetworkAvailable()) {
                throw new Error('network_error');
            }

            // Fetch JWT data
            const jwtData = await this.fetchJWTData(apiUrl);
            
            // Determine the target domain and handle authentication
            await this.handleAuthentication(jwtData);
            
            this.setButtonState(submitBtn, 'success');
            this.showStatus('با موفقیت وارد شدید!', 'success');
            
        } catch (error) {
            console.error('Authentication error:', error);
            this.handleError(error, submitBtn);
        } finally {
            this.isProcessing = false;
            setTimeout(() => {
                this.setButtonState(submitBtn, 'default');
            }, 3000);
        }
    }

    async fetchJWTData(apiUrl) {
        try {
            // Clean the API URL
            const cleanedUrl = apiUrl.replace('/view/raw/', '/view/');
            
            const response = await fetch(cleanedUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                timeout: 15000
            });

            if (!response.ok) {
                throw new Error('api_error');
            }

            const data = await response.json();
            
            if (!data?.JWT || typeof data.JWT !== 'string') {
                throw new Error('api_error');
            }

            return data;
            
        } catch (error) {
            if (error.name === 'TypeError' || error.message === 'Failed to fetch') {
                throw new Error('network_error');
            }
            throw new Error('api_error');
        }
    }

    async handleAuthentication(jwtData) {
        // Determine which Snappfood domain to use based on JWT structure
        let targetUrl;
        
        try {
            // Try to parse JWT to determine the appropriate domain
            const parsedJWT = JSON.parse(jwtData.JWT);
            if (parsedJWT.access_token) {
                targetUrl = 'https://m.snappfood.ir';
                await this.authenticateWithCookies(jwtData.JWT, targetUrl);
            } else {
                targetUrl = 'https://food.snapp.ir';
                await this.authenticateWithLocalStorage(jwtData.JWT, targetUrl);
            }
        } catch (parseError) {
            // If parsing fails, assume it's for food.snapp.ir
            targetUrl = 'https://food.snapp.ir';
            await this.authenticateWithLocalStorage(jwtData.JWT, targetUrl);
        }
    }

    async authenticateWithCookies(jwtString, targetUrl) {
        const jwtData = JSON.parse(jwtString);
        
        // Open the browser and inject cookies
        const browser = cordova.InAppBrowser.open(targetUrl, '_blank', 'location=no,zoom=no,
