// ThreadFlow - Gmail Conversation Organizer
// Based on analysis of Gmail's DOM structure and debugging findings

(function () {
    console.log('ThreadFlow content script loaded');

    // Initialize immediately
    initializeThreadFlow();

    function initializeThreadFlow() {
        console.log('Initializing ThreadFlow...');

        // Initial scan for show/hide content buttons
        processExistingButtons();

        // Listen for dynamically added content
        setupMutationObserver();
    }

    function setupMutationObserver() {
        // Create an observer to watch for DOM changes
        const observer = new MutationObserver(function (mutations) {
            let shouldCheck = false;

            // Check if any significant changes occurred
            mutations.forEach(function (mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    shouldCheck = true;
                }
            });

            // Only scan for buttons if necessary
            if (shouldCheck) {
                setTimeout(processExistingButtons, 100);
            }
        });

        // Start observing the document
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('Mutation observer set up for ThreadFlow');
    }

    function processExistingButtons() {
        // Different patterns Gmail uses for show/hide content buttons
        const selectors = [
            // Show content buttons
            'div[role="button"][aria-label="Show trimmed content"]:not([data-threadflow-processed])',
            'div.ajR:not([data-threadflow-processed])',
            'div[data-tooltip="Show trimmed content"]:not([data-threadflow-processed])',

            // Hide content buttons (after expansion)
            'div[role="button"][aria-label="Hide expanded content"]:not([data-threadflow-processed])',
            'div[aria-expanded="true"][data-tooltip="Hide expanded content"]:not([data-threadflow-processed])'
        ];

        let buttonsFound = 0;

        // Process each selector type
        selectors.forEach(function (selector) {
            const buttons = document.querySelectorAll(selector);
            buttonsFound += buttons.length;

            buttons.forEach(function (button) {
                // Mark as processed
                button.setAttribute('data-threadflow-processed', 'true');

                // Add visual indicator
                button.classList.add('threadflow-enhanced');

                // Get the state of the button
                const isExpandButton = (button.getAttribute('aria-label') === 'Show trimmed content' ||
                    button.classList.contains('ajR'));

                if (isExpandButton) {
                    // For "Show trimmed content" buttons
                    button.addEventListener('click', handleExpandButtonClick);
                } else {
                    // For "Hide expanded content" buttons
                    button.addEventListener('click', handleCollapseButtonClick);

                    // The content is already expanded, so we should format it
                    formatAlreadyExpandedContent(button);
                }
            });
        });

        if (buttonsFound > 0) {
            console.log('Found and processed', buttonsFound, 'buttons');
        }
    }

    function formatAlreadyExpandedContent(button) {
        console.log('Formatting already expanded content');

        // Find what content is already expanded
        const messageContainer = findContainingMessageFromButton(button);
        if (!messageContainer) {
            console.log('Could not find message container for expanded content');
            return;
        }

        // Find the quoted/expanded content in this message
        const expandedContent = findExpandedContentInMessage(messageContainer);
        if (!expandedContent) {
            console.log('No expanded content found in this message');
            return;
        }

        // Apply ThreadFlow formatting
        applyThreadFlowFormatting(expandedContent, messageContainer);
    }

    function handleExpandButtonClick(event) {
        console.log('Expand button clicked');

        // Store the clicked button for reference
        const button = event.currentTarget;

        // Gmail needs time to expand the content
        setTimeout(function () {
            // Find the message container
            const messageContainer = findContainingMessageFromButton(button);
            if (!messageContainer) {
                console.log('Could not find containing message');
                return;
            }

            // Find the expanded content
            const expandedContent = findExpandedContentInMessage(messageContainer);
            if (!expandedContent) {
                console.log('No expanded content found');
                return;
            }

            // Apply ThreadFlow formatting
            applyThreadFlowFormatting(expandedContent, messageContainer);
        }, 300);
    }

    function handleCollapseButtonClick(event) {
        console.log('Collapse button clicked - content will be hidden by Gmail');
        // We don't need to do anything special here
        // Gmail will collapse the content
    }

    function findContainingMessageFromButton(button) {
        console.log('Finding message container from button');

        // Try multiple approaches
        // 1. Standard Gmail message container classes
        let container = button.closest('.h7, .gs, .adn');

        if (container) {
            console.log('Found container via standard classes');
            return container;
        }

        // 2. Look for ancestor with email content
        container = button.closest('div[role="listitem"]');
        if (container) {
            console.log('Found container via listitem role');
            return container;
        }

        // 3. Walk up the DOM looking for Gmail structures that might be message containers
        let current = button.parentElement;
        let depth = 0;
        const MAX_DEPTH = 10; // Don't go too far up

        while (current && depth < MAX_DEPTH) {
            // Look for elements that might contain quoted content
            if (current.querySelector('.gmail_quote') ||
                current.querySelector('blockquote') ||
                current.querySelector('div[data-thread-perm-id]')) {
                console.log('Found container via content search');
                return current;
            }

            current = current.parentElement;
            depth++;
        }

        console.log('Could not find message container');
        return null;
    }

    function findExpandedContentInMessage(messageContainer) {
        console.log('Looking for expanded content in message');

        // Try different selectors for expanded content
        const selectors = [
            '.adL',                // Common Gmail expanded content container
            '.gmail_quote',        // Gmail quote format
            'blockquote',          // Standard HTML quote
            '.gmail_extra',        // Sometimes used for expanded parts
            'div[dir="ltr"]'       // Gmail sometimes uses this for quoted parts
        ];

        // Try each selector
        for (const selector of selectors) {
            const elements = messageContainer.querySelectorAll(selector);

            if (elements.length > 0) {
                // If multiple matches, take the one that seems most like quoted content
                for (const element of elements) {
                    // Skip if already processed
                    if (element.getAttribute('data-threadflow-formatted') === 'true') {
                        continue;
                    }

                    // Check if this has quoted content indicators
                    if (element.textContent.includes('wrote:') ||
                        element.textContent.includes('From:') ||
                        element.innerHTML.includes('gmail_quote') ||
                        element.querySelector('blockquote')) {
                        console.log('Found expanded content via', selector);
                        return element;
                    }
                }

                // If no clear quoted content found, use the first match
                if (elements[0].getAttribute('data-threadflow-formatted') !== 'true') {
                    console.log('Using first match for', selector);
                    return elements[0];
                }
            }
        }

        // Fallback: look for any element with quoted content indicators
        const allElements = messageContainer.querySelectorAll('*');
        for (const element of allElements) {
            // Skip tiny elements, already processed elements, and buttons
            if (element.textContent.length < 50 ||
                element.getAttribute('data-threadflow-formatted') === 'true' ||
                element.getAttribute('role') === 'button') {
                continue;
            }

            // Check if this has quoted content indicators
            if (element.textContent.includes('wrote:') ||
                element.textContent.includes('From:') ||
                element.innerHTML.includes('gmail_quote') ||
                element.querySelector('blockquote')) {
                console.log('Found expanded content via content indicators');
                return element;
            }
        }

        console.log('No expanded content found');
        return null;
    }

    function applyThreadFlowFormatting(element, messageContainer) {
        console.log('Applying ThreadFlow formatting to', element);

        // Skip if already formatted
        if (element.getAttribute('data-threadflow-formatted') === 'true') {
            console.log('Element already formatted');
            return;
        }

        // Mark as formatted
        element.setAttribute('data-threadflow-formatted', 'true');

        // Store original content
        const originalHTML = element.innerHTML;
        console.log('Original content length:', originalHTML.length);

        // Try to extract conversation structure
        const messages = extractConversationStructure(element);

        if (messages.length > 0) {
            // We successfully extracted conversation structure
            console.log('Extracted', messages.length, 'messages');

            // Create ThreadFlow container
            const container = document.createElement('div');
            container.className = 'threadflow-container';

            // Create conversation view
            const conversation = document.createElement('div');
            conversation.className = 'threadflow-conversation';

            // Add each message in reverse order (newest first)
            messages.reverse().forEach(function (message) {
                // Create message element
                const messageEl = document.createElement('div');
                messageEl.className = 'threadflow-message';

                // Message header
                const headerEl = document.createElement('div');
                headerEl.className = 'threadflow-header';

                // Sender info
                const senderEl = document.createElement('div');
                senderEl.className = 'threadflow-sender';
                senderEl.textContent = message.sender || 'Unknown Sender';

                // Timestamp
                const timeEl = document.createElement('div');
                timeEl.className = 'threadflow-timestamp';
                timeEl.textContent = message.timestamp || '';

                // Assemble header
                headerEl.appendChild(senderEl);
                headerEl.appendChild(timeEl);

                // Message content
                const contentEl = document.createElement('div');
                contentEl.className = 'threadflow-content';
                contentEl.innerHTML = message.content;

                // Assemble message
                messageEl.appendChild(headerEl);
                messageEl.appendChild(contentEl);
                conversation.appendChild(messageEl);
            });

            // Create hidden original content container
            const originalContainer = document.createElement('div');
            originalContainer.className = 'threadflow-original';
            originalContainer.innerHTML = originalHTML;
            originalContainer.style.display = 'none';

            // Create toggle button
            const toggleButton = document.createElement('button');
            toggleButton.className = 'threadflow-toggle';
            toggleButton.textContent = 'Switch to Original View';

            // Set up toggle functionality
            toggleButton.addEventListener('click', function () {
                if (conversation.style.display === 'none') {
                    // Switch to ThreadFlow view
                    conversation.style.display = '';
                    originalContainer.style.display = 'none';
                    toggleButton.textContent = 'Switch to Original View';
                } else {
                    // Switch to original view
                    conversation.style.display = 'none';
                    originalContainer.style.display = '';
                    toggleButton.textContent = 'Switch to ThreadFlow View';
                }
            });

            // Assemble ThreadFlow container
            container.appendChild(conversation);
            container.appendChild(originalContainer);
            container.appendChild(toggleButton);

            // Replace original content
            element.innerHTML = '';
            element.appendChild(container);

            console.log('ThreadFlow formatting applied successfully');
        } else {
            // Fallback: simple formatting
            applySimpleFormatting(element, originalHTML);
        }
    }

    function extractConversationStructure(element) {
        console.log('Extracting conversation structure');
        const messages = [];

        // Clone to avoid modifying while we parse
        const clone = element.cloneNode(true);

        // Method 1: Look for blockquotes
        const blockquotes = clone.querySelectorAll('blockquote');
        console.log('Found', blockquotes.length, 'blockquotes');

        if (blockquotes.length > 0) {
            // Process each blockquote as a message
            blockquotes.forEach(function (blockquote) {
                // Try to find associated header for this quote
                let headerText = '';
                let headerElement = null;
                let sender = 'Unknown';
                let timestamp = '';

                // Look for header before this blockquote
                let sibling = blockquote.previousElementSibling;
                while (sibling) {
                    if (sibling.textContent.match(/wrote:|On .+:|From:|Date:/i)) {
                        headerElement = sibling;
                        headerText = sibling.textContent.trim();
                        break;
                    }
                    sibling = sibling.previousElementSibling;
                }

                // If no header found, try parent's siblings
                if (!headerText && blockquote.parentElement) {
                    sibling = blockquote.parentElement.previousElementSibling;
                    while (sibling) {
                        if (sibling.textContent.match(/wrote:|On .+:|From:|Date:/i)) {
                            headerElement = sibling;
                            headerText = sibling.textContent.trim();
                            break;
                        }
                        sibling = sibling.previousElementSibling;
                    }
                }

                // Parse the header for sender/timestamp
                if (headerText) {
                    // Pattern: "On [date], [sender] wrote:"
                    let match = headerText.match(/On (.+?),? (.+?)(?:\s+<.+?>)? wrote:/i);
                    if (match) {
                        timestamp = match[1].trim();
                        sender = match[2].trim();
                    } else {
                        // Pattern: "From: [sender] Date: [date]"
                        match = headerText.match(/From:\s*(.+?)(?:\s+<.+?>)?(?:\s+Date:\s*(.+?))?/i);
                        if (match) {
                            sender = match[1].trim();
                            timestamp = match[2] ? match[2].trim() : '';
                        }
                    }
                }

                // Add to messages
                messages.push({
                    sender: sender,
                    timestamp: timestamp,
                    content: blockquote.innerHTML
                });
            });

            return messages;
        }

        // Method 2: Parse based on email headers patterns in the text
        // Pattern 1: On [date], [sender] wrote:
        // Pattern 2: From: [sender] Date: [date]

        const content = clone.innerHTML;

        // Prepare patterns
        const patterns = [
            {
                regex: /On (.+?),? (.+?)(?:\s+<.+?>)? wrote:/g,
                extract: (match) => ({ timestamp: match[1].trim(), sender: match[2].trim() })
            },
            {
                regex: /From:\s*(.+?)(?:\s+<.+?>)?(?:\s+Date:\s*(.+?))?(?:\s+Subject:.+?)?(?:\s+To:.+?)?$/gm,
                extract: (match) => ({ sender: match[1].trim(), timestamp: match[2] ? match[2].trim() : '' })
            }
        ];

        // First, mark all detected headers with a special marker
        let markedContent = content;
        let markers = [];

        patterns.forEach(function (pattern) {
            // Reset the regex state
            pattern.regex.lastIndex = 0;

            // Find all matches
            let match;
            while ((match = pattern.regex.exec(content)) !== null) {
                const marker = `###QUOTE_MARKER_${markers.length}###`;
                markers.push({
                    marker: marker,
                    match: match,
                    position: match.index,
                    pattern: pattern
                });

                // Replace the match with our marker (but keep the original text for later)
                markedContent = markedContent.substring(0, match.index) +
                    marker +
                    markedContent.substring(match.index + match[0].length);

                // Since we modified the string, reset regex
                pattern.regex.lastIndex = 0;
            }
        });

        // Sort markers by position in the original content
        markers.sort((a, b) => a.position - b.position);

        // Split content by markers
        const parts = markedContent.split(/###QUOTE_MARKER_\d+###/);
        console.log('Split content into', parts.length, 'parts');

        // Skip the first part (it's before any quotes)
        if (parts.length > 1) {
            for (let i = 1; i < parts.length; i++) {
                const markerInfo = markers[i - 1];
                const { extract, match } = markerInfo.pattern;
                const { sender, timestamp } = extract(match);

                // The content is everything after this header until the next marker
                const content = parts[i];

                messages.push({
                    sender: sender,
                    timestamp: timestamp,
                    content: content
                });
            }
        }

        return messages;
    }

    function applySimpleFormatting(element, originalHTML) {
        console.log('Applying simple formatting');

        // Create basic container
        const container = document.createElement('div');
        container.className = 'threadflow-container threadflow-simple';

        // Create formatted content container
        const formattedContent = document.createElement('div');
        formattedContent.className = 'threadflow-simple-content';
        formattedContent.innerHTML = originalHTML;

        // Apply base formatting to improve readability
        const blockquotes = formattedContent.querySelectorAll('blockquote');
        blockquotes.forEach(function (quote) {
            quote.classList.add('threadflow-simple-quote');

            // Find nested quotes and reduce their indentation
            const nestedQuotes = quote.querySelectorAll('blockquote');
            nestedQuotes.forEach(function (nested) {
                nested.classList.add('threadflow-nested-quote');
            });
        });

        // Store original HTML
        const originalContent = document.createElement('div');
        originalContent.className = 'threadflow-original';
        originalContent.innerHTML = originalHTML;
        originalContent.style.display = 'none';

        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.className = 'threadflow-toggle';
        toggleButton.textContent = 'Switch to Original View';

        // Set up toggle functionality
        toggleButton.addEventListener('click', function () {
            if (formattedContent.style.display === 'none') {
                // Switch to formatted view
                formattedContent.style.display = '';
                originalContent.style.display = 'none';
                toggleButton.textContent = 'Switch to Original View';
            } else {
                // Switch to original view
                formattedContent.style.display = 'none';
                originalContent.style.display = '';
                toggleButton.textContent = 'Switch to ThreadFlow View';
            }
        });

        // Assemble container
        container.appendChild(formattedContent);
        container.appendChild(originalContent);
        container.appendChild(toggleButton);

        // Replace content
        element.innerHTML = '';
        element.appendChild(container);

        console.log('Simple formatting applied successfully');
    }
})();