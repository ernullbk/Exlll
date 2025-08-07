document.addEventListener('deviceready', function() {
    document.getElementById('fetchBtn').addEventListener('click', handleSubmit);
});

const states = {
    default: {
        text: 'ارسال',
        bgColor: '#007bff',
        textColor: 'white'
    },
    loading: {
        text: 'در حال بارگذاری...',
        bgColor: '#ffc107',
        textColor: 'black'
    },
    success: {
        text: 'انجام شد!',
        bgColor: '#28a745',
        textColor: 'white'
    },
    errorDomain: {
        text: 'ابتدا وبسایت اسنپ فود را باز کنید',
        bgColor: '#dc3545',
        textColor: 'white'
    },
    errorNetwork: {
        text: 'اتصال اینترنت را بررسی کنید',
        bgColor: '#dc3545',
        textColor: 'white'
    },
    errorApi: {
        text: 'لینک وارد شده نادرست است',
        bgColor: '#dc3545',
        textColor: 'white'
    },
    empty: {
        text: 'لطفا لینک را وارد کنید',
        bgColor: '#6c757d',
        textColor: 'white'
    }
};

async function handleSubmit() {
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const button = document.getElementById('fetchBtn');
    const statusDiv = document.getElementById('status');
    
    // Validate input
    if (!apiUrl) {
        updateButtonState(button, states.empty);
        setTimeout(() => updateButtonState(button, states.default), 2000);
        return;
    }
    
    // Set loading state
    updateButtonState(button, states.loading);
    button.disabled = true;
    
    try {
        // Fetch data from API
        const response = await fetchData(apiUrl);
        
        // Determine which domain to handle
        if (response.url.includes('m.snappfood.ir')) {
            await handleMoblieDomain(response.data, response.url);
        } else if (response.url.includes('food.snapp.ir')) {
            await handleFoodDomain(response.data, response.url);
        } else {
            throw new Error('domain_error');
        }
        
        // Success
        updateButtonState(button, states.success);
        setTimeout(() => {
            navigateTo('browser-page');
            button.disabled = false;
            updateButtonState(button, states.default);
        }, 1500);
    } catch (error) {
        console.error('Error:', error);
        button.disabled = false;
        
        let state;
        switch (error.message) {
            case 'domain_error':
                state = states.errorDomain;
                break;
            case 'network_error':
                state = states.errorNetwork;
                break;
            case 'api_error':
            default:
                state = states.errorApi;
        }
        
        updateButtonState(button, state);
        setTimeout(() => updateButtonState(button, states.default), 3000);
    }
}

function updateButtonState(button, state) {
    button.textContent = state.text;
    button.style.backgroundColor = state.bgColor;
    button.style.color = state.textColor;
}

async function fetchData(apiUrl) {
    const cleanedApiUrl = apiUrl.replace('/view/raw/', '/view/');
    
    try {
        const response = await fetch(cleanedApiUrl);
        if (!response.ok) throw new Error('api_error');
        
        const data = await response.json();
        if (!data?.JWT || typeof data.JWT !== 'string') {
            throw new Error('api_error');
        }
        
        return { data, url: cleanedApiUrl };
    } catch (error) {
        if (error.message === 'Failed to fetch') {
            throw new Error('network_error');
        }
        throw error;
    }
}

async function handleMoblieDomain(data, url) {
    const jwtData = JSON.parse(data.JWT);
    const targetUrl = 'https://m.snappfood.ir';
    
    // Open InAppBrowser
    window.browserRef = cordova.InAppBrowser.open(targetUrl, '_blank', 'location=yes,clearcache=yes,clearsessioncache=yes');
    
    // Inject cookies
    window.browserRef.addEventListener('loadstop', function() {
        const cookieScript = `
            document.cookie = 'jwt-access_token=${jwtData.access_token}; path=/; domain=.snappfood.ir';
            document.cookie = 'jwt-token_type=${jwtData.token_type}; path=/; domain=.snappfood.ir';
            document.cookie = 'jwt-refresh_token=${jwtData.refresh_token}; path=/; domain=.snappfood.ir';
            document.cookie = 'jwt-expires_in=${jwtData.expires_in}; path=/; domain=.snappfood.ir';
            document.cookie = 'UserMembership=0; path=/; domain=.snappfood.ir';
            window.location.reload();
        `;
        
        window.browserRef.executeScript({ code: cookieScript });
    });
}

async function handleFoodDomain(data, url) {
    const targetUrl = 'https://food.snapp.ir';
    
    // Open InAppBrowser
    window.browserRef = cordova.InAppBrowser.open(targetUrl, '_blank', 'location=yes,clearcache=yes,clearsessioncache=yes');
    
    // Inject localStorage data
    window.browserRef.addEventListener('loadstop', function() {
        const localStorageScript = `
            localStorage.removeItem('state');
            localStorage.removeItem('user-info');
            localStorage.setItem('JWT', '${data.JWT}');
            window.location.reload();
        `;
        
        window.browserRef.executeScript({ code: localStorageScript });
    });
}
