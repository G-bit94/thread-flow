// ThreadFlow - Gmail Conversation Organizer
// Background script

// Initialize extension settings on install
chrome.runtime.onInstalled.addListener(function () {
    // Set default settings
    chrome.storage.sync.set({
        purchaseStatus: 'trial',
        trialStartDate: Date.now(),
        licenseKey: '',
        preferences: {
            showLicenseBadge: true,
            autoEnhanceAll: false
        }
    }, function () {
        console.log('ThreadFlow installed - defaults set');
    });

    // Set initial icon state (active)
    chrome.action.setIcon({
        path: {
            '16': 'icons/icon16.png',
            '32': 'icons/icon32.png',
            '48': 'icons/icon48.png',
            '128': 'icons/icon128.png'
        }
    });
});

// Handle license validation
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log('Message received:', message);

    if (message.action === 'validateLicense') {
        // For testing: always validate as successful
        const licenseKey = message.licenseKey;

        console.log('License validation requested for:', licenseKey);

        // In a real extension, you would call your backend API here
        // For testing, we'll just validate any non-empty key
        const isValid = licenseKey && licenseKey.length > 0;

        if (isValid) {
            // Update storage with purchase status
            chrome.storage.sync.set({
                purchaseStatus: 'purchased',
                licenseKey: licenseKey
            }, function () {
                console.log('License activated successfully');
                sendResponse({ valid: true });
            });
        } else {
            console.log('License validation failed');
            sendResponse({ valid: false, error: 'Invalid license key' });
        }

        return true; // Keep the message channel open for async response
    }
});

// Listen for tab updates to enable extension on Gmail
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    // Only proceed if the tab is fully loaded and is Gmail
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('mail.google.com')) {
        console.log('Gmail tab detected:', tabId);

        // Show the extension's page action icon
        chrome.action.enable(tabId);
    }
});

// Function to handle payment processing (in real extension, would redirect to payment processor)
function processPayment(method) {
    console.log('Payment requested via:', method);

    // In a real extension, this would redirect to an appropriate payment page
    // For testing, we'll simulate a successful payment

    // Generate a fake license key
    const licenseKey = 'TF-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    // Update storage
    chrome.storage.sync.set({
        purchaseStatus: 'purchased',
        licenseKey: licenseKey
    }, function () {
        console.log('Test purchase completed with license:', licenseKey);
    });
}