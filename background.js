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
            '16': 'icons/favicon-16x16.png',
            '32': 'icons/favicon-32x32.png',
            '192': 'icons/android-chrome-192x192.png'
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

// Add this function to your content.js file to handle the full conversation view

function initializeFullConversationView() {
    console.log('Initializing ThreadFlow full conversation view');

    // Look for Gmail's main conversation container
    // Gmail uses various selectors for the main thread container
    const selectors = [
        'div[role="main"] div[role="list"]', // Common Gmail thread container
        'div.aZp.az5', // Another possible container
        'div[jsaction*="appendMessageToThread"]', // Container with thread-specific action
        'table.Bs.nH.iY', // Legacy table layout
        'div.nH.ar4.z' // Another common container
    ];

    // Try each selector
    let container = null;
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            container = elements[0];
            console.log('Found Gmail thread container via', selector);
            break;
        }
    }

    if (!container) {
        console.log('Could not find Gmail thread container');
        return;
    }

    // Check if we've already processed this container
    if (container.hasAttribute('data-threadflow-processed')) {
        console.log('Container already processed');
        return;
    }

    // Mark container as processed
    container.setAttribute('data-threadflow-processed', 'true');

    // Extract all messages
    const messages = extractFullConversationMessages(container);
    if (!messages || messages.length === 0) {
        console.log('No messages found in conversation');
        return;
    }

    console.log('Extracted', messages.length, 'messages from conversation');

    // Create ThreadFlow controls for the full conversation
    addThreadFlowControlsToConversation(container, messages);
}

function extractFullConversationMessages(container) {
    // Look for individual message containers
    const messageElements = container.querySelectorAll('div[role="listitem"], .h7, .gs, .adn');

    if (messageElements.length === 0) {
        console.log('No message elements found');
        return [];
    }

    const messages = [];

    messageElements.forEach(function (element) {
        // Skip already processed elements
        if (element.hasAttribute('data-threadflow-message-processed')) {
            return;
        }

        // Mark as processed
        element.setAttribute('data-threadflow-message-processed', 'true');

        // Extract message data
        const messageData = extractMessageData(element);
        if (messageData) {
            messages.push(messageData);
        }
    });

    return messages;
}

function extractMessageData(messageElement) {
    // Extract message sender
    let sender = 'Unknown Sender';
    const senderElements = messageElement.querySelectorAll('.gD, .go, .agh, div[email]');
    if (senderElements.length > 0) {
        sender = senderElements[0].textContent.trim();
    }

    // Extract timestamp
    let timestamp = '';
    const timestampElements = messageElement.querySelectorAll('.g3, .adx, .apm');
    if (timestampElements.length > 0) {
        timestamp = timestampElements[0].textContent.trim();
    }

    // Extract content
    let content = '';
    const contentElements = messageElement.querySelectorAll('.a3s, .ii, .a7u, .Ak.akQ');
    if (contentElements.length > 0) {
        content = contentElements[0].innerHTML;
    }

    if (!content) {
        console.log('No content found for message');
        return null;
    }

    return {
        sender: sender,
        timestamp: timestamp,
        content: content,
        element: messageElement // Keep reference to original element
    };
}

function addThreadFlowControlsToConversation(container, messages) {
    // Create main ThreadFlow container
    const threadFlowContainer = document.createElement('div');
    threadFlowContainer.className = 'threadflow-full-container';

    // Create controls bar
    const controlsBar = document.createElement('div');
    controlsBar.className = 'threadflow-controls';

    // View toggle (Thread/Chat)
    const viewToggle = document.createElement('button');
    viewToggle.className = 'threadflow-view-toggle';
    viewToggle.textContent = 'Chat View';
    viewToggle.setAttribute('data-view', 'thread');

    // Sort toggle
    const sortToggle = document.createElement('button');
    sortToggle.className = 'threadflow-sort-toggle';
    sortToggle.textContent = 'Oldest First';
    sortToggle.setAttribute('data-sort', 'newest');

    // Original view toggle
    const originalToggle = document.createElement('button');
    originalToggle.className = 'threadflow-original-toggle';
    originalToggle.textContent = 'Original View';

    // Add buttons to controls
    controlsBar.appendChild(viewToggle);
    controlsBar.appendChild(sortToggle);
    controlsBar.appendChild(originalToggle);

    // Create views containers
    const threadView = document.createElement('div');
    threadView.className = 'threadflow-conversation threadflow-thread-view';

    const chatView = document.createElement('div');
    chatView.className = 'threadflow-conversation threadflow-chat-view';
    chatView.style.display = 'none';

    // Create chronological message array (clone)
    let chronologicalMessages = [...messages];

    // Default to newest first
    chronologicalMessages.reverse();

    // Populate views
    populateThreadView(threadView, chronologicalMessages);
    populateChatView(chatView, chronologicalMessages);

    // Set up view toggle functionality
    viewToggle.addEventListener('click', function () {
        const currentView = this.getAttribute('data-view');

        if (currentView === 'thread') {
            // Switch to chat view
            threadView.style.display = 'none';
            chatView.style.display = 'block';
            this.setAttribute('data-view', 'chat');
            this.textContent = 'Thread View';
        } else {
            // Switch to thread view
            threadView.style.display = 'block';
            chatView.style.display = 'none';
            this.setAttribute('data-view', 'thread');
            this.textContent = 'Chat View';
        }
    });

    // Set up sort toggle functionality
    sortToggle.addEventListener('click', function () {
        const currentSort = this.getAttribute('data-sort');
        let messagesToShow = [...chronologicalMessages]; // Clone

        if (currentSort === 'newest') {
            // Switch to oldest first
            this.setAttribute('data-sort', 'oldest');
            this.textContent = 'Newest First';
            // Reverse to show oldest first
            messagesToShow.reverse();
        } else {
            // Switch to newest first
            this.setAttribute('data-sort', 'newest');
            this.textContent = 'Oldest First';
            // Already in newest-first order
        }

        // Update both views
        threadView.innerHTML = '';
        chatView.innerHTML = '';
        populateThreadView(threadView, messagesToShow);
        populateChatView(chatView, messagesToShow);
    });

    // Original view toggle functionality
    let originalDisplayStates = [];

    originalToggle.addEventListener('click', function () {
        const isShowingOriginal = this.getAttribute('data-showing-original') === 'true';

        if (isShowingOriginal) {
            // Switch back to ThreadFlow view
            threadFlowContainer.style.display = 'block';

            // Restore original elements' display state
            messages.forEach((message, index) => {
                if (message.element) {
                    message.element.style.display = originalDisplayStates[index] || '';
                }
            });

            this.setAttribute('data-showing-original', 'false');
            this.textContent = 'Original View';

            // Show current active view
            if (viewToggle.getAttribute('data-view') === 'thread') {
                threadView.style.display = 'block';
                chatView.style.display = 'none';
            } else {
                threadView.style.display = 'none';
                chatView.style.display = 'block';
            }
        } else {
            // Switch to original Gmail view
            // First, store original display states
            originalDisplayStates = messages.map(message =>
                message.element ? message.element.style.display : '');

            // Hide ThreadFlow views
            threadView.style.display = 'none';
            chatView.style.display = 'none';

            // Show original elements
            messages.forEach(message => {
                if (message.element) {
                    message.element.style.display = '';
                }
            });

            this.setAttribute('data-showing-original', 'true');
            this.textContent = 'ThreadFlow View';
        }
    });

    // Assemble and insert ThreadFlow container
    threadFlowContainer.appendChild(controlsBar);
    threadFlowContainer.appendChild(threadView);
    threadFlowContainer.appendChild(chatView);

    // Insert the ThreadFlow container before the first message
    if (messages.length > 0 && messages[0].element && messages[0].element.parentNode) {
        messages[0].element.parentNode.insertBefore(threadFlowContainer, messages[0].element);

        // Initially hide all original message elements
        messages.forEach(message => {
            if (message.element) {
                originalDisplayStates.push(message.element.style.display);
                message.element.style.display = 'none';
            }
        });
    } else {
        // Fallback: append to container
        container.appendChild(threadFlowContainer);
    }
}

// Call this function in your initialization
function enhanceContentScript() {
    // Add event listener for page load and navigation
    window.addEventListener('load', initializeFullConversationView);

    // Also try to initialize on history changes (Gmail uses History API)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(initializeFullConversationView, 500);
        }
    }).observe(document, { subtree: true, childList: true });

    // Do an initial check
    setTimeout(initializeFullConversationView, 1000);
}

// Call to enhance the content script functionality
enhanceContentScript();