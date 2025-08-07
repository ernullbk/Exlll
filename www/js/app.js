document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Cordova is ready!');
    
    // Initialize page navigation
    document.getElementById('backBtn').addEventListener('click', function() {
        navigateTo('auth-page');
        closeInAppBrowser();
    });
}

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function closeInAppBrowser() {
    if (window.browserRef) {
        window.browserRef.close();
        window.browserRef = null;
    }
}
