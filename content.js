// ThreadFlow - Gmail Conversation Organizer
// Simplified version that focuses on enhancing trimmed content

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

            // Create controls at the top
            const controlsBar = document.createElement('div');
            controlsBar.className = 'threadflow-controls';

            // Toggle View type (Thread/Chat)
            const viewToggle = document.createElement('button');
            viewToggle.className = 'threadflow-view-toggle';
            viewToggle.textContent = 'Chat View';
            viewToggle.setAttribute('data-view', 'thread');

            // Toggle Sort Order
            const sortToggle = document.createElement('button');
            sortToggle.className = 'threadflow-sort-toggle';
            sortToggle.textContent = 'Oldest First';
            sortToggle.setAttribute('data-sort', 'newest');

            // Original View Toggle
            const originalToggle = document.createElement('button');
            originalToggle.className = 'threadflow-toggle threadflow-original-toggle';
            originalToggle.textContent = 'Switch to Original View';

            // Add buttons to controls
            controlsBar.appendChild(viewToggle);
            controlsBar.appendChild(sortToggle);
            controlsBar.appendChild(originalToggle);

            // Create conversation views
            // 1. Thread view (default)
            const threadView = document.createElement('div');
            threadView.className = 'threadflow-conversation threadflow-thread-view';

            // 2. Chat view (hidden initially)
            const chatView = document.createElement('div');
            chatView.className = 'threadflow-conversation threadflow-chat-view';
            chatView.style.display = 'none';

            // 3. Original content (hidden)
            const originalView = document.createElement('div');
            originalView.className = 'threadflow-original';
            originalView.innerHTML = originalHTML;
            originalView.style.display = 'none';

            // Populate the thread view
            let chronologicalMessages = [...messages];

            // Populate thread view (newest first by default)
            populateThreadView(threadView, chronologicalMessages.reverse());

            // Populate chat view (newest first by default)
            populateChatView(chatView, chronologicalMessages);

            // Set up view toggle functionality
            viewToggle.addEventListener('click', function () {
                const currentView = this.getAttribute('data-view');

                if (currentView === 'thread') {
                    // Switch to chat view
                    threadView.style.display = 'none';
                    chatView.style.display = 'block';
                    originalView.style.display = 'none';
                    this.setAttribute('data-view', 'chat');
                    this.textContent = 'Thread View';
                    originalToggle.textContent = 'Switch to Original View';
                } else {
                    // Switch to thread view
                    threadView.style.display = 'block';
                    chatView.style.display = 'none';
                    originalView.style.display = 'none';
                    this.setAttribute('data-view', 'thread');
                    this.textContent = 'Chat View';
                    originalToggle.textContent = 'Switch to Original View';
                }
            });

            // Set up sort toggle functionality
            sortToggle.addEventListener('click', function () {
                const currentSort = this.getAttribute('data-sort');
                let newMessages = [...chronologicalMessages]; // Clone the array

                if (currentSort === 'newest') {
                    // Switch to oldest first
                    this.setAttribute('data-sort', 'oldest');
                    this.textContent = 'Newest First';
                    // Messages are already in chronological order
                } else {
                    // Switch to newest first
                    this.setAttribute('data-sort', 'newest');
                    this.textContent = 'Oldest First';
                    // Reverse to show newest first
                    newMessages.reverse();
                }

                // Update both views
                threadView.innerHTML = '';
                chatView.innerHTML = '';
                populateThreadView(threadView, newMessages);
                populateChatView(chatView, newMessages);
            });

            // Set up original toggle functionality
            originalToggle.addEventListener('click', function () {
                // Get currently active view
                const activeView = viewToggle.getAttribute('data-view');

                if (originalView.style.display === 'none') {
                    // Switch to original view
                    threadView.style.display = 'none';
                    chatView.style.display = 'none';
                    originalView.style.display = 'block';
                    this.textContent = activeView === 'thread' ? 'Switch to Thread View' : 'Switch to Chat View';
                } else {
                    // Switch back to active view
                    if (activeView === 'thread') {
                        threadView.style.display = 'block';
                        chatView.style.display = 'none';
                    } else {
                        threadView.style.display = 'none';
                        chatView.style.display = 'block';
                    }
                    originalView.style.display = 'none';
                    this.textContent = 'Switch to Original View';
                }
            });

            // Assemble ThreadFlow container
            container.appendChild(controlsBar);
            container.appendChild(threadView);
            container.appendChild(chatView);
            container.appendChild(originalView);

            // Replace original content
            element.innerHTML = '';
            element.appendChild(container);

            console.log('ThreadFlow formatting applied successfully');
        } else {
            // Fallback: simple formatting
            applySimpleFormatting(element, originalHTML);
        }
    }

    function populateThreadView(container, messages) {
        // Add each message to thread view
        messages.forEach(function (message) {
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
            container.appendChild(messageEl);
        });
    }

    // Improved function to extract only the newest content from a message
    function extractNewestContent(htmlContent) {
        if (!htmlContent || htmlContent.trim() === '') return htmlContent;

        // Create a temporary element to work with the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // STEP 1: Remove blockquotes and gmail_quote sections completely
        // These are clearly nested content
        const quoteSelectors = [
            'blockquote',
            '.gmail_quote',
            '.adL'
        ];

        for (const selector of quoteSelectors) {
            const quotes = tempDiv.querySelectorAll(selector);
            for (const quote of quotes) {
                if (quote.parentNode) {
                    quote.parentNode.removeChild(quote);
                }
            }
        }

        // STEP 2: Identify but don't remove paragraphs yet
        // First collect all paragraphs that look like headers
        const paragraphs = tempDiv.querySelectorAll('p, div');
        const headerParagraphs = [];

        for (const p of paragraphs) {
            const text = p.textContent.trim();

            // Check if this paragraph is a quote header (but don't remove it yet)
            if ((text.match(/^On .+? wrote:/) ||
                text.match(/^On .+?, .+? at .+? .+? <.+?@.+?> wrote:/) ||
                text.match(/^From: .+? <.+?@.+?>/) ||
                text.includes('Sender notified by Mailtrack')) &&
                text.length < 200) { // Length check to avoid matching actual content

                headerParagraphs.push(p);
            }
        }

        // STEP 3: Check if removing headers would leave anything
        if (headerParagraphs.length > 0) {
            // Count how many text nodes we'd have left if we removed all headers
            let remainingTextNodes = 0;
            const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
            while (walker.nextNode()) {
                let skip = false;
                for (const headerP of headerParagraphs) {
                    if (headerP.contains(walker.currentNode)) {
                        skip = true;
                        break;
                    }
                }
                if (!skip && walker.currentNode.textContent.trim()) {
                    remainingTextNodes++;
                }
            }

            // Only remove headers if we'd have some content left
            if (remainingTextNodes > 0) {
                for (const headerP of headerParagraphs) {
                    if (headerP.parentNode) {
                        headerP.parentNode.removeChild(headerP);
                    }
                }
            }
        }

        // STEP 4: Clean up specific patterns that might not be in paragraphs
        let html = tempDiv.innerHTML;

        // Only perform replacements if the message has more than just these patterns
        // This ensures we don't end up with empty messages
        const patterns = [
            /On [A-Za-z]{3}, [A-Za-z]{3} \d{1,2}, \d{4} at \d{1,2}:\d{2} [AP]M .+? wrote:/g,
            /On [A-Za-z]{3}, [A-Za-z]{3} \d{1,2}, \d{4} at \d{1,2}:\d{2} [AP]M/g,
            /Sender notified by Mailtrack/g
        ];

        // Check if removing all patterns would leave us with content
        let testHtml = html;
        for (const pattern of patterns) {
            testHtml = testHtml.replace(pattern, '');
        }

        // Only apply replacements if we'd have content left
        if (testHtml.trim() !== '') {
            for (const pattern of patterns) {
                html = html.replace(pattern, '');
            }
        }

        // STEP 5: Clean up any single-line emails that only contain a date
        // This handles the empty messages with just a timestamp in your screenshot
        if (html.trim().match(/^[A-Za-z]{3} \d{1,2}, \d{4} at \d{1,2}:\d{2} [AP]M$/)) {
            // This is just a timestamp, check if we should remove it
            if (tempDiv.textContent.trim().length < 30) {
                html = ''; // Clear it as it's just metadata
            }
        }

        // STEP 6: Clean up Mailtrack images
        html = html.replace(/<img[^>]*Mailtrack[^>]*>/g, '');

        // STEP 7: Clean up multiple breaks that might have been left
        html = html.replace(/<br>\s*<br>\s*<br>/g, '<br><br>');

        // Return the cleaned HTML, but if it's empty, return original to be safe
        return html.trim() || htmlContent;
    }

    // For chat bubbles, use a more dynamic approach that doesn't rely on hardcoded names
    function populateChatView(container, messages) {
        // Create a messages container for the chat view
        const messagesContainer = document.createElement('div');
        messagesContainer.className = 'threadflow-chat-messages';

        // Analyze the conversation to identify message directions
        const messageFlow = analyzeMessageFlow(messages);

        // Add each message as a chat bubble
        messages.forEach(function (message, index) {
            // Skip empty messages
            if (!message.content || message.content.trim() === '') return;

            // Extract clean content
            const cleanContent = extractNewestContent(message.content);

            // Skip this message if after cleaning, there's nothing left to show
            if (!cleanContent || cleanContent.trim() === '') {
                console.log('Skipping empty message after cleaning');
                return;
            }

            // Create bubble container
            const bubbleContainer = document.createElement('div');
            bubbleContainer.className = 'threadflow-chat-bubble-container';

            // Use the message flow analysis to determine direction
            const isRight = messageFlow[index] === 'right';

            // Set the alignment based on flow analysis
            bubbleContainer.classList.add(isRight ? 'threadflow-chat-right' : 'threadflow-chat-left');

            // Create sender label
            const senderLabel = document.createElement('div');
            senderLabel.className = 'threadflow-chat-sender';
            senderLabel.textContent = message.sender || 'Unknown Sender';

            // Create bubble
            const bubble = document.createElement('div');
            bubble.className = 'threadflow-chat-bubble';

            // Message content
            const contentEl = document.createElement('div');
            contentEl.className = 'threadflow-chat-content';
            contentEl.innerHTML = cleanContent;

            // Don't show empty bubbles
            if (contentEl.textContent.trim() === '') {
                console.log('Skipping message with empty text content');
                return;
            }

            // Timestamp - only show if we have a timestamp
            if (message.timestamp && message.timestamp.trim()) {
                const timeEl = document.createElement('div');
                timeEl.className = 'threadflow-chat-time';
                timeEl.textContent = message.timestamp;
                bubble.appendChild(timeEl);
            }

            // Store the message direction for debugging
            bubble.setAttribute('data-direction', isRight ? 'right' : 'left');

            // Assemble bubble - content first, then time
            bubble.insertBefore(contentEl, bubble.firstChild);

            // Assemble container
            bubbleContainer.appendChild(senderLabel);
            bubbleContainer.appendChild(bubble);
            messagesContainer.appendChild(bubbleContainer);
        });

        container.appendChild(messagesContainer);
    }

    // Analyze message flow to determine left/right alignment
    function analyzeMessageFlow(messages) {
        // Create a mapping of unique senders to count their messages
        const senderCounts = {};
        const uniqueSenders = new Set();

        // First pass: Count messages per sender and collect unique senders
        messages.forEach(message => {
            const sender = message.sender || 'Unknown';
            senderCounts[sender] = (senderCounts[sender] || 0) + 1;
            uniqueSenders.add(sender);
        });

        // If we have exactly two senders, we can use alternating pattern
        // This works well for most email conversations
        const senders = Array.from(uniqueSenders);

        if (senders.length === 2) {
            // Identify the main sender (the one with more messages)
            const [sender1, sender2] = senders;
            const mainSender = senderCounts[sender1] >= senderCounts[sender2] ? sender1 : sender2;

            // Map each message to left/right - SWAPPED DIRECTION!
            // Now main sender (typically sender) is on LEFT, other person (recipient) is on RIGHT
            return messages.map(message => {
                // REVERSED: Now the main sender gets 'left', other gets 'right'
                return (message.sender === mainSender) ? 'left' : 'right';
            });
        } else {
            // For conversations with more participants or unknown structure,
            // we'll use a basic alternating pattern but with reversed direction
            return messages.map((message, index) => {
                // REVERSED: First message now on right, then alternate
                return (index % 2 === 0) ? 'right' : 'left';
            });
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

        // Create control bar
        const controlsBar = document.createElement('div');
        controlsBar.className = 'threadflow-controls';

        // Original View Toggle
        const originalToggle = document.createElement('button');
        originalToggle.className = 'threadflow-toggle threadflow-original-toggle';
        originalToggle.textContent = 'Switch to Original View';

        // Add button to controls
        controlsBar.appendChild(originalToggle);

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

        // Set up toggle functionality
        originalToggle.addEventListener('click', function () {
            if (formattedContent.style.display === 'none') {
                // Switch to formatted view
                formattedContent.style.display = '';
                originalContent.style.display = 'none';
                this.textContent = 'Switch to Original View';
            } else {
                // Switch to original view
                formattedContent.style.display = 'none';
                originalContent.style.display = '';
                this.textContent = 'Switch to ThreadFlow View';
            }
        });

        // Assemble container
        container.appendChild(controlsBar);
        container.appendChild(formattedContent);
        container.appendChild(originalContent);

        // Replace content
        element.innerHTML = '';
        element.appendChild(container);

        console.log('Simple formatting applied successfully');
    }
})();