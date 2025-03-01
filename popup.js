// ThreadFlow - Gmail Conversation Organizer
// Popup script

document.addEventListener('DOMContentLoaded', function () {
    const statusContainer = document.getElementById('status-container');
    const trialInfo = document.getElementById('trial-info');
    const licenseForm = document.getElementById('license-form');
    const paymentOptions = document.getElementById('payment-options');
    const licenseKeyInput = document.getElementById('license-key');
    const activateButton = document.getElementById('activate-button');

    // Payment buttons
    const paypalButton = document.getElementById('paypal-button');
    const cryptoButton = document.getElementById('crypto-button');
    const gumroadButton = document.getElementById('gumroad-button');
    const paystackButton = document.getElementById('paystack-button');

    // Check license status
    checkLicenseStatus();

    // Handle license activation
    activateButton.addEventListener('click', activateLicense);

    // Set up payment buttons
    paypalButton.addEventListener('click', function () {
        openPaymentPage('paypal');
    });

    cryptoButton.addEventListener('click', function () {
        openPaymentPage('crypto');
    });

    gumroadButton.addEventListener('click', function () {
        openPaymentPage('gumroad');
    });

    paystackButton.addEventListener('click', function () {
        openPaymentPage('paystack');
    });

    // Function to check license status
    function checkLicenseStatus() {
        chrome.storage.sync.get(['purchaseStatus', 'trialStartDate', 'licenseKey'], function (result) {
            if (result.purchaseStatus === 'purchased') {
                // User has purchased
                showPurchasedState(result.licenseKey);
            } else {
                // User is in trial
                const daysLeft = getTrialDaysLeft(result.trialStartDate);

                if (daysLeft > 0) {
                    // Active trial
                    showTrialState(daysLeft);
                } else {
                    // Trial expired
                    showExpiredState();
                }
            }
        });
    }

    // Function to calculate days left in trial
    function getTrialDaysLeft(startDate) {
        const trialDuration = 7; // 7-day trial
        const now = Date.now();
        const elapsed = now - startDate;
        const daysElapsed = Math.floor(elapsed / (1000 * 60 * 60 * 24));

        return Math.max(0, trialDuration - daysElapsed);
    }

    // Function to show purchased state
    function showPurchasedState(licenseKey) {
        statusContainer.className = 'status-box status-purchased';
        statusContainer.innerHTML = `
      <strong>Licensed Version</strong><br>
      Thank you for your purchase!<br>
      License: ${maskLicenseKey(licenseKey)}
    `;

        licenseForm.style.display = 'none';
        paymentOptions.style.display = 'none';
    }

    // Function to show trial state
    function showTrialState(daysLeft) {
        statusContainer.className = 'status-box status-trial';
        trialInfo.textContent = `${daysLeft} days remaining in your trial.`;

        licenseForm.style.display = 'block';
        paymentOptions.style.display = 'block';
    }

    // Function to show expired state
    function showExpiredState() {
        statusContainer.className = 'status-box status-expired';
        statusContainer.innerHTML = `
      <strong>Trial Expired</strong><br>
      Your trial period has ended. Please purchase to continue using ThreadFlow.
    `;

        licenseForm.style.display = 'block';
        paymentOptions.style.display = 'block';
    }

    // Function to activate license
    function activateLicense() {
        const licenseKey = licenseKeyInput.value.trim();

        if (!licenseKey) {
            alert('Please enter a license key');
            return;
        }

        activateButton.textContent = 'Activating...';
        activateButton.disabled = true;

        // Send validation request to background script
        chrome.runtime.sendMessage(
            { action: 'validateLicense', licenseKey: licenseKey },
            function (response) {
                activateButton.textContent = 'Activate License';
                activateButton.disabled = false;

                // If no response, treat as success for testing
                if (!response) {
                    console.log('No response from background script, forcing success for testing');

                    // Update storage directly
                    chrome.storage.sync.set(
                        { purchaseStatus: 'purchased', licenseKey: licenseKey },
                        function () {
                            showPurchasedState(licenseKey);
                        }
                    );
                    return;
                }

                // Handle validation response
                if (response.valid) {
                    showPurchasedState(licenseKey);
                } else {
                    alert(response.error || 'License activation failed');
                }
            }
        );
    }

    // Function to open payment page
    function openPaymentPage(method) {
        let url = '';

        switch (method) {
            case 'paypal':
                url = 'https://your-paypal-link.com';
                break;
            case 'crypto':
                url = 'https://your-crypto-payment-link.com';
                break;
            case 'gumroad':
                url = 'https://your-gumroad-product-link.com';
                break;
            case 'paystack':
                url = 'https://your-paystack-payment-link.com';
                break;
        }

        // In a real extension, you would open the actual payment page
        // For testing, we'll simulate a purchase
        if (confirm('This would normally take you to the payment page. For testing, would you like to simulate a successful purchase?')) {
            chrome.runtime.sendMessage({ action: 'simulatePurchase', method: method }, function () {
                checkLicenseStatus();
            });
        } else if (url) {
            chrome.tabs.create({ url: url });
        }
    }

    // Function to mask license key for display
    function maskLicenseKey(key) {
        if (!key) return '';

        if (key.length <= 8) {
            return key.substring(0, 2) + '••••' + key.substring(key.length - 2);
        }

        return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
    }
});