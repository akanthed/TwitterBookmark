// ================================
// Bookmark Manager Application
// With Automatic Tweet Extraction
// Uses Twitter oEmbed API via CORS Proxy
// ================================

const STORAGE_KEY = 'bookmark_manager_data';

// CORS Proxies to try (in order of preference)
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
];

// App State
let bookmarks = [];
let currentFilter = 'all';
let currentSort = 'newest';
let searchQuery = '';
let selectedBookmarks = new Set();
let pendingDeleteId = null;
let pendingBulkDelete = false;
let pendingTweetUrl = null;
let pendingTweetUsername = null;
let isLoading = false;
let quoteInterval = null;

// Inspirational quotes about knowledge, learning, and bookmarking
const INSPIRATIONAL_QUOTES = [
    { quote: "Knowledge is power.", author: "Francis Bacon" },
    { quote: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
    { quote: "A room without books is like a body without a soul.", author: "Marcus Tullius Cicero" },
    { quote: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
    { quote: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
    { quote: "Today a reader, tomorrow a leader.", author: "Margaret Fuller" },
    { quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
    { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
    { quote: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
    { quote: "Education is not preparation for life; education is life itself.", author: "John Dewey" },
    { quote: "In learning you will teach, and in teaching you will learn.", author: "Phil Collins" },
    { quote: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin" },
    { quote: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
    { quote: "A bookmark is a reminder of where you've been and where you're going.", author: "Unknown" },
    { quote: "Save today what you'll need tomorrow.", author: "Unknown" }
];

// DOM Elements
const elements = {
    bookmarkInput: document.getElementById('bookmark-input'),
    addBookmarkForm: document.getElementById('add-bookmark-form'),
    addBookmarkBtn: document.getElementById('add-bookmark-btn'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    sortSelect: document.getElementById('sort-select'),
    filterButtons: document.querySelectorAll('.filter-btn'),
    bookmarksGrid: document.getElementById('bookmarks-grid'),
    emptyState: document.getElementById('empty-state'),
    loadingState: document.getElementById('loading-state'),
    bookmarkCount: document.getElementById('bookmark-count'),
    exportBtn: document.getElementById('export-btn'),
    importInput: document.getElementById('import-input'),
    bulkDeleteBtn: document.getElementById('bulk-delete-btn'),
    selectedCount: document.getElementById('selected-count'),
    deleteModal: document.getElementById('delete-modal'),
    deleteModalMessage: document.getElementById('delete-modal-message'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    helpBtn: document.getElementById('help-btn'),
    helpModal: document.getElementById('help-modal'),
    closeHelpBtn: document.getElementById('close-help-btn'),
    toastContainer: document.getElementById('toast-container'),
    // Fetch Loading Overlay Elements
    fetchLoadingOverlay: document.getElementById('fetch-loading-overlay'),
    loadingQuote: document.getElementById('loading-quote'),
    loadingAuthor: document.getElementById('loading-author'),
    fetchProgress: document.getElementById('fetch-progress'),
    loadingTip: document.querySelector('.fetch-loading-tip'),
    // Tweet Modal Elements
    tweetModal: document.getElementById('tweet-modal'),
    closeTweetModalBtn: document.getElementById('close-tweet-modal-btn'),
    cancelTweetBtn: document.getElementById('cancel-tweet-btn'),
    tweetForm: document.getElementById('tweet-form'),
    tweetTextInput: document.getElementById('tweet-text-input'),
    tweetAuthorInput: document.getElementById('tweet-author-input'),
    tweetDateInput: document.getElementById('tweet-date-input'),
    tweetTypeInput: document.getElementById('tweet-type-input'),
    tweetUrlInput: document.getElementById('tweet-url-input'),
    tweetUsernameInput: document.getElementById('tweet-username-input'),
    previewAvatar: document.getElementById('preview-avatar'),
    previewInitial: document.getElementById('preview-initial'),
    previewName: document.getElementById('preview-name'),
    previewUsername: document.getElementById('preview-username'),
    previewContent: document.getElementById('preview-content')
};

// ================================
// Utility Functions
// ================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setButtonLoading(loading) {
    isLoading = loading;
    if (elements.addBookmarkBtn) {
        if (loading) {
            elements.addBookmarkBtn.disabled = true;
            elements.addBookmarkBtn.innerHTML = `
                <span class="spinner-small"></span>
                <span>Fetching tweet...</span>
            `;
        } else {
            elements.addBookmarkBtn.disabled = false;
            elements.addBookmarkBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Add Bookmark</span>
            `;
        }
    }
}

// ================================
// Fetch Loading Overlay
// ================================

const LOADING_TIPS = [
    "Connecting to Twitter...",
    "Fetching tweet content...",
    "Extracting author info...",
    "Processing tweet data...",
    "Almost there..."
];

function getRandomQuote() {
    return INSPIRATIONAL_QUOTES[Math.floor(Math.random() * INSPIRATIONAL_QUOTES.length)];
}

function updateLoadingQuote() {
    const { quote, author } = getRandomQuote();
    if (elements.loadingQuote && elements.loadingAuthor) {
        // Fade out
        elements.loadingQuote.style.animation = 'none';
        elements.loadingQuote.offsetHeight; // Trigger reflow
        elements.loadingQuote.style.animation = 'quoteIn 0.5s ease forwards';

        elements.loadingQuote.textContent = `"${quote}"`;
        elements.loadingAuthor.textContent = `— ${author}`;
    }
}

function showFetchLoadingOverlay() {
    if (elements.fetchLoadingOverlay) {
        // Reset progress bar
        if (elements.fetchProgress) {
            elements.fetchProgress.style.animation = 'none';
            elements.fetchProgress.offsetHeight;
            elements.fetchProgress.style.animation = 'progressShimmer 1.5s ease-in-out infinite, progressGrow 8s ease-out forwards';
        }

        // Set initial quote
        updateLoadingQuote();

        // Start rotating quotes every 3 seconds
        quoteInterval = setInterval(updateLoadingQuote, 3000);

        // Update loading tips
        let tipIndex = 0;
        if (elements.loadingTip) {
            elements.loadingTip.textContent = LOADING_TIPS[0];
            const tipInterval = setInterval(() => {
                tipIndex = (tipIndex + 1) % LOADING_TIPS.length;
                elements.loadingTip.textContent = LOADING_TIPS[tipIndex];
            }, 1500);

            // Store the interval for cleanup
            elements.fetchLoadingOverlay.dataset.tipInterval = tipInterval;
        }

        elements.fetchLoadingOverlay.classList.remove('hidden');
    }
}

function hideFetchLoadingOverlay() {
    if (elements.fetchLoadingOverlay) {
        elements.fetchLoadingOverlay.classList.add('hidden');

        // Clear quote rotation interval
        if (quoteInterval) {
            clearInterval(quoteInterval);
            quoteInterval = null;
        }

        // Clear tip interval
        if (elements.fetchLoadingOverlay.dataset.tipInterval) {
            clearInterval(parseInt(elements.fetchLoadingOverlay.dataset.tipInterval));
        }
    }
}

// ================================
// Twitter/X URL Parsing
// ================================

function isTwitterUrl(text) {
    const pattern = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/\d+/i;
    return pattern.test(text);
}

function parseTwitterUrl(url) {
    const pattern = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/i;
    const match = url.match(pattern);
    if (match) {
        // Normalize URL to https://twitter.com format for oEmbed
        const normalizedUrl = `https://twitter.com/${match[1]}/status/${match[2]}`;
        return {
            username: match[1],
            tweetId: match[2],
            url: normalizedUrl,
            originalUrl: url.startsWith('http') ? url : 'https://' + url
        };
    }
    return null;
}

function detectContentType(content, url = '') {
    const lowerContent = (content || '').toLowerCase();
    const lowerUrl = (url || '').toLowerCase();

    // Check for thread indicators
    if (lowerContent.includes('🧵') || lowerContent.match(/\b1\/\d+\b/) || lowerContent.includes('thread')) {
        return 'thread';
    }
    // Check URL for media types
    if (lowerUrl.includes('/photo/') || lowerContent.includes('[image]') || lowerContent.includes('pic.twitter')) {
        return 'image';
    }
    if (lowerUrl.includes('/video/') || lowerContent.includes('[video]')) {
        return 'video';
    }
    // Check for external links
    if (lowerContent.match(/https?:\/\/(?!twitter\.com|x\.com|t\.co)[^\s]+/)) {
        return 'link';
    }
    return 'text';
}

function getAvatarColor(username) {
    const colors = [
        'linear-gradient(135deg, #1D9BF0, #0A66C2)',
        'linear-gradient(135deg, #F91880, #C41E56)',
        'linear-gradient(135deg, #7856FF, #5E35B1)',
        'linear-gradient(135deg, #00BA7C, #00796B)',
        'linear-gradient(135deg, #FF7A00, #E65100)',
        'linear-gradient(135deg, #FFD400, #F9A825)',
    ];
    let hash = 0;
    for (let i = 0; i < (username || '').length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

// ================================
// Twitter oEmbed API Functions
// ================================

async function fetchTweetOEmbed(tweetUrl) {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`;

    // Try each CORS proxy until one works
    for (const proxy of CORS_PROXIES) {
        try {
            const response = await fetch(proxy + encodeURIComponent(oembedUrl), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            }
        } catch (e) {
            console.log(`Proxy ${proxy} failed:`, e.message);
            continue;
        }
    }

    // All proxies failed
    throw new Error('Could not fetch tweet data');
}

function parseOEmbedHtml(html) {
    // Create a temporary element to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Extract text content (removing links and formatting)
    const paragraphs = temp.querySelectorAll('p');
    let tweetText = '';
    paragraphs.forEach(p => {
        tweetText += p.textContent + '\n';
    });

    // Clean up the text
    tweetText = tweetText.trim();

    // Remove the "— Author (@username) Date" line at the end
    const authorLinePattern = /\n?—\s*[^(]+\(@\w+\)\s*[\w\s,]+$/;
    tweetText = tweetText.replace(authorLinePattern, '').trim();

    // Remove t.co links (Twitter's URL shortener) - they're not useful to display
    tweetText = tweetText.replace(/https?:\/\/t\.co\/\w+/gi, '').trim();

    // Remove pic.twitter.com links
    tweetText = tweetText.replace(/pic\.twitter\.com\/\w+/gi, '').trim();

    // Clean up multiple spaces and newlines
    tweetText = tweetText.replace(/\n{3,}/g, '\n\n');
    tweetText = tweetText.replace(/  +/g, ' ');
    tweetText = tweetText.trim();

    return tweetText;
}

function extractAuthorFromOEmbed(data) {
    // author_name contains "Display Name (@username)"
    const authorMatch = data.author_name?.match(/^(.+?)\s*\(@(\w+)\)$/);
    if (authorMatch) {
        return {
            displayName: authorMatch[1].trim(),
            username: authorMatch[2]
        };
    }
    // Fallback
    return {
        displayName: data.author_name || 'Unknown',
        username: data.author_url?.split('/').pop() || 'unknown'
    };
}

// ================================
// Storage Functions
// ================================

function loadBookmarks() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            bookmarks = JSON.parse(data);
            // Migrate old format bookmarks
            bookmarks = bookmarks.map(b => ({
                ...b,
                tweetText: b.tweetText || b.content || '',
                displayName: b.displayName || b.author || 'Unknown',
                username: b.username || '',
                tweetDate: b.tweetDate || b.dateAdded,
                tweetUrl: b.tweetUrl || b.url || ''
            }));
        }
    } catch (e) {
        console.error('Error loading bookmarks:', e);
        bookmarks = [];
    }
}

function saveBookmarks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    } catch (e) {
        console.error('Error saving bookmarks:', e);
        showToast('Error saving bookmarks', 'error');
    }
}

// ================================
// Toast Notifications
// ================================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================================
// Tweet Modal Functions (Fallback)
// ================================

function showTweetModal(url, parsed, prefillData = null) {
    pendingTweetUrl = url;
    pendingTweetUsername = parsed.username;

    // Update preview
    const initial = parsed.username.charAt(0).toUpperCase();
    elements.previewInitial.textContent = initial;
    elements.previewAvatar.style.background = getAvatarColor(parsed.username);
    elements.previewName.textContent = prefillData?.displayName || parsed.username;
    elements.previewUsername.textContent = '@' + parsed.username;
    elements.previewContent.textContent = prefillData?.tweetText || 'Enter tweet content below...';

    // Set hidden values
    elements.tweetUrlInput.value = parsed.originalUrl || parsed.url;
    elements.tweetUsernameInput.value = parsed.username;

    // Set defaults or prefilled data
    elements.tweetAuthorInput.value = prefillData?.displayName || '';
    elements.tweetTextInput.value = prefillData?.tweetText || '';
    elements.tweetDateInput.value = new Date().toISOString().split('T')[0];
    elements.tweetTypeInput.value = 'auto';

    // Show modal
    elements.tweetModal.classList.remove('hidden');
    elements.tweetTextInput.focus();
}

function hideTweetModal() {
    elements.tweetModal.classList.add('hidden');
    pendingTweetUrl = null;
    pendingTweetUsername = null;
    elements.tweetForm.reset();
}

function updatePreview() {
    const text = elements.tweetTextInput.value || 'Enter tweet content below...';
    const name = elements.tweetAuthorInput.value || pendingTweetUsername || 'Unknown';

    elements.previewContent.textContent = text.length > 150 ? text.substring(0, 150) + '...' : text;
    elements.previewName.textContent = name;
}

// ================================
// Bookmark CRUD Operations
// ================================

async function handleAddBookmark(input) {
    const trimmedInput = input.trim();

    if (!trimmedInput) {
        showToast('Please paste a tweet URL', 'error');
        return;
    }

    // Check if it's a Twitter/X URL
    if (!isTwitterUrl(trimmedInput)) {
        showToast('Please paste a valid Twitter/X URL', 'error');
        return;
    }

    const parsed = parseTwitterUrl(trimmedInput);
    if (!parsed) {
        showToast('Could not parse the tweet URL', 'error');
        return;
    }

    // Show beautiful loading overlay with quotes
    setButtonLoading(true);
    showFetchLoadingOverlay();

    try {
        // Try to fetch tweet data via oEmbed API
        const oembedData = await fetchTweetOEmbed(parsed.url);

        if (oembedData && oembedData.html) {
            // Successfully fetched! Parse and create bookmark automatically
            const tweetText = parseOEmbedHtml(oembedData.html);
            const author = extractAuthorFromOEmbed(oembedData);

            hideFetchLoadingOverlay();
            setButtonLoading(false);

            createBookmark({
                tweetText: tweetText,
                displayName: author.displayName,
                username: author.username,
                tweetUrl: parsed.originalUrl || parsed.url,
                tweetDate: new Date().toISOString(),
                type: 'auto'
            });

            return;
        }

        throw new Error('Invalid oEmbed response');

    } catch (error) {
        console.log('oEmbed fetch failed:', error.message);
        hideFetchLoadingOverlay();
        setButtonLoading(false);

        // Fallback to manual entry modal
        showToast('Could not auto-fetch tweet. Please enter details manually.', 'info');
        showTweetModal(trimmedInput, parsed);
    }
}

function createBookmark(data) {
    const bookmark = {
        id: generateId(),
        tweetText: data.tweetText.trim(),
        displayName: data.displayName || data.username || 'Unknown',
        username: data.username,
        tweetUrl: data.tweetUrl,
        tweetDate: data.tweetDate || new Date().toISOString(),
        dateAdded: new Date().toISOString(),
        type: data.type === 'auto' ? detectContentType(data.tweetText, data.tweetUrl) : data.type,
        tags: []
    };

    bookmarks.unshift(bookmark);
    saveBookmarks();
    renderBookmarks();
    updateBookmarkCount();
    showToast('Tweet bookmarked successfully!', 'success');
    return bookmark;
}

function deleteBookmark(id) {
    const index = bookmarks.findIndex(b => b.id === id);
    if (index !== -1) {
        const card = document.querySelector(`[data-id="${id}"]`);
        if (card) {
            card.classList.add('removing');
            setTimeout(() => {
                bookmarks.splice(index, 1);
                selectedBookmarks.delete(id);
                saveBookmarks();
                renderBookmarks();
                updateBookmarkCount();
                updateBulkDeleteButton();
            }, 300);
        } else {
            bookmarks.splice(index, 1);
            selectedBookmarks.delete(id);
            saveBookmarks();
            renderBookmarks();
            updateBookmarkCount();
            updateBulkDeleteButton();
        }
        showToast('Bookmark deleted', 'success');
    }
}

function bulkDeleteBookmarks() {
    const idsToDelete = Array.from(selectedBookmarks);
    idsToDelete.forEach(id => {
        const index = bookmarks.findIndex(b => b.id === id);
        if (index !== -1) {
            bookmarks.splice(index, 1);
        }
    });
    selectedBookmarks.clear();
    saveBookmarks();
    renderBookmarks();
    updateBookmarkCount();
    updateBulkDeleteButton();
    showToast(`${idsToDelete.length} bookmarks deleted`, 'success');
}

function addTagToBookmark(id, tag) {
    const bookmark = bookmarks.find(b => b.id === id);
    if (bookmark && tag.trim() && !bookmark.tags.includes(tag.trim())) {
        bookmark.tags.push(tag.trim());
        saveBookmarks();
        renderBookmarks();
        showToast('Tag added', 'success');
    }
}

function removeTagFromBookmark(id, tag) {
    const bookmark = bookmarks.find(b => b.id === id);
    if (bookmark) {
        bookmark.tags = bookmark.tags.filter(t => t !== tag);
        saveBookmarks();
        renderBookmarks();
    }
}

// ================================
// Filter, Sort & Search
// ================================

function getFilteredBookmarks() {
    let filtered = [...bookmarks];

    if (currentFilter !== 'all') {
        filtered = filtered.filter(b => b.type === currentFilter);
    }

    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(b =>
            (b.tweetText || '').toLowerCase().includes(query) ||
            (b.displayName || '').toLowerCase().includes(query) ||
            (b.username || '').toLowerCase().includes(query) ||
            (b.tags || []).some(t => t.toLowerCase().includes(query))
        );
    }

    switch (currentSort) {
        case 'oldest':
            filtered.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
            break;
        case 'newest':
            filtered.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
            break;
        case 'az':
            filtered.sort((a, b) => (a.tweetText || '').localeCompare(b.tweetText || ''));
            break;
        case 'za':
            filtered.sort((a, b) => (b.tweetText || '').localeCompare(a.tweetText || ''));
            break;
    }

    return filtered;
}

// ================================
// Rendering
// ================================

function createTweetCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'tweet-card';
    card.dataset.id = bookmark.id;

    const isChecked = selectedBookmarks.has(bookmark.id);
    const initial = (bookmark.username || bookmark.displayName || 'U').charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(bookmark.username || bookmark.displayName);

    // Format the tweet text with line breaks preserved
    const formattedText = escapeHtml(bookmark.tweetText || '').replace(/\n/g, '<br>');

    card.innerHTML = `
        <div class="tweet-card-header">
            <div class="tweet-card-checkbox">
                <input type="checkbox" ${isChecked ? 'checked' : ''} aria-label="Select bookmark">
            </div>
            <div class="tweet-avatar" style="background: ${avatarColor}">
                <span>${initial}</span>
            </div>
            <div class="tweet-author-info">
                <div class="tweet-display-name">${escapeHtml(bookmark.displayName || bookmark.username || 'Unknown')}</div>
                <div>
                    <span class="tweet-username">@${escapeHtml(bookmark.username || 'unknown')}</span>
                    <span class="tweet-date">${formatDate(bookmark.tweetDate || bookmark.dateAdded)}</span>
                </div>
            </div>
        </div>
        <div class="tweet-card-content">
            <div class="tweet-text">${formattedText}</div>
        </div>
        <div class="tweet-card-footer">
            <div class="tweet-card-tags">
                <span class="tag tag-${bookmark.type}">${bookmark.type}</span>
                ${(bookmark.tags || []).map(tag => `
                    <span class="tag tag-custom">
                        ${escapeHtml(tag)}
                        <span class="tag-remove" data-tag="${escapeHtml(tag)}">&times;</span>
                    </span>
                `).join('')}
                <button class="add-tag-btn" title="Add tag">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add Tag
                </button>
            </div>
            <div class="tweet-card-actions">
                <div class="tweet-card-actions-left">
                    <span class="tweet-date" style="font-size: 0.75rem; color: #8899a6;">
                        Added ${formatDateTime(bookmark.dateAdded)}
                    </span>
                </div>
                <div class="tweet-card-actions-right">
                    ${bookmark.tweetUrl ? `
                        <a href="${escapeHtml(bookmark.tweetUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-link btn-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            View on X
                        </a>
                    ` : ''}
                    <button class="btn btn-ghost btn-sm delete-btn" title="Delete bookmark">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Event listeners
    const checkbox = card.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            selectedBookmarks.add(bookmark.id);
        } else {
            selectedBookmarks.delete(bookmark.id);
        }
        updateBulkDeleteButton();
    });

    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => showDeleteModal(bookmark.id));

    const addTagBtn = card.querySelector('.add-tag-btn');
    addTagBtn.addEventListener('click', () => showTagInput(card, bookmark.id));

    card.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTagFromBookmark(bookmark.id, btn.dataset.tag);
        });
    });

    return card;
}

function showTagInput(card, bookmarkId) {
    const tagsDiv = card.querySelector('.tweet-card-tags');
    const addTagBtn = card.querySelector('.add-tag-btn');

    if (card.querySelector('.tag-input')) return;

    addTagBtn.style.display = 'none';

    const wrapper = document.createElement('span');
    wrapper.innerHTML = `<input type="text" class="tag-input" placeholder="Tag..." maxlength="20">`;
    tagsDiv.insertBefore(wrapper, addTagBtn);

    const input = wrapper.querySelector('.tag-input');
    input.focus();

    const handleSubmit = () => {
        const tag = input.value.trim();
        if (tag) {
            addTagToBookmark(bookmarkId, tag);
        } else {
            wrapper.remove();
            addTagBtn.style.display = '';
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            wrapper.remove();
            addTagBtn.style.display = '';
        }
    });

    input.addEventListener('blur', handleSubmit);
}

function renderBookmarks() {
    const filtered = getFilteredBookmarks();

    elements.bookmarksGrid.innerHTML = '';
    elements.emptyState.classList.toggle('hidden', filtered.length > 0 || bookmarks.length === 0);
    elements.loadingState.classList.add('hidden');

    if (bookmarks.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }

    if (filtered.length === 0 && searchQuery) {
        elements.bookmarksGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <h3>No results found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }

    filtered.forEach(bookmark => {
        elements.bookmarksGrid.appendChild(createTweetCard(bookmark));
    });
}

function updateBookmarkCount() {
    elements.bookmarkCount.textContent = bookmarks.length;
}

function updateBulkDeleteButton() {
    const count = selectedBookmarks.size;
    elements.selectedCount.textContent = count;
    elements.bulkDeleteBtn.classList.toggle('hidden', count === 0);
}

// ================================
// Modal Functions
// ================================

function showDeleteModal(id, bulk = false) {
    pendingDeleteId = id;
    pendingBulkDelete = bulk;

    if (bulk) {
        elements.deleteModalMessage.textContent = `Delete ${selectedBookmarks.size} selected bookmarks? This action cannot be undone.`;
    } else {
        elements.deleteModalMessage.textContent = 'This action cannot be undone.';
    }

    elements.deleteModal.classList.remove('hidden');
}

function hideDeleteModal() {
    elements.deleteModal.classList.add('hidden');
    pendingDeleteId = null;
    pendingBulkDelete = false;
}

function confirmDelete() {
    if (pendingBulkDelete) {
        bulkDeleteBookmarks();
    } else if (pendingDeleteId) {
        deleteBookmark(pendingDeleteId);
    }
    hideDeleteModal();
}

function showHelpModal() {
    elements.helpModal.classList.remove('hidden');
}

function hideHelpModal() {
    elements.helpModal.classList.add('hidden');
}

// ================================
// Import/Export
// ================================

function exportBookmarks() {
    if (bookmarks.length === 0) {
        showToast('No bookmarks to export', 'info');
        return;
    }

    const data = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `tweet_bookmarks_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Bookmarks exported successfully!', 'success');
}

function importBookmarks(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);

            if (!Array.isArray(imported)) {
                throw new Error('Invalid format');
            }

            let importedCount = 0;
            imported.forEach(item => {
                if ((item.tweetText || item.content) && item.id) {
                    if (!bookmarks.find(b => b.id === item.id)) {
                        bookmarks.push({
                            id: item.id || generateId(),
                            tweetText: item.tweetText || item.content || '',
                            displayName: item.displayName || item.author || 'Unknown',
                            username: item.username || '',
                            tweetUrl: item.tweetUrl || item.url || '',
                            tweetDate: item.tweetDate || item.dateAdded || new Date().toISOString(),
                            dateAdded: item.dateAdded || new Date().toISOString(),
                            type: item.type || 'text',
                            tags: Array.isArray(item.tags) ? item.tags : []
                        });
                        importedCount++;
                    }
                }
            });

            saveBookmarks();
            renderBookmarks();
            updateBookmarkCount();
            showToast(`Imported ${importedCount} bookmarks!`, 'success');
        } catch (err) {
            console.error('Import error:', err);
            showToast('Error importing file. Please check the format.', 'error');
        }
    };

    reader.onerror = () => {
        showToast('Error reading file', 'error');
    };

    reader.readAsText(file);
}

// ================================
// Event Listeners
// ================================

function initEventListeners() {
    // Add bookmark form
    elements.addBookmarkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isLoading) return;
        await handleAddBookmark(elements.bookmarkInput.value);
        elements.bookmarkInput.value = '';
    });

    // Tweet modal form
    elements.tweetForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const tweetText = elements.tweetTextInput.value.trim();
        if (!tweetText) {
            showToast('Please enter the tweet content', 'error');
            return;
        }

        createBookmark({
            tweetText: tweetText,
            displayName: elements.tweetAuthorInput.value.trim() || pendingTweetUsername,
            username: pendingTweetUsername,
            tweetUrl: elements.tweetUrlInput.value,
            tweetDate: elements.tweetDateInput.value ? new Date(elements.tweetDateInput.value).toISOString() : new Date().toISOString(),
            type: elements.tweetTypeInput.value
        });

        hideTweetModal();
    });

    elements.tweetTextInput.addEventListener('input', updatePreview);
    elements.tweetAuthorInput.addEventListener('input', updatePreview);
    elements.closeTweetModalBtn.addEventListener('click', hideTweetModal);
    elements.cancelTweetBtn.addEventListener('click', hideTweetModal);
    elements.tweetModal.querySelector('.modal-backdrop').addEventListener('click', hideTweetModal);

    // Search
    elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        elements.clearSearchBtn.classList.toggle('hidden', !searchQuery);
        renderBookmarks();
    });

    elements.clearSearchBtn.addEventListener('click', () => {
        searchQuery = '';
        elements.searchInput.value = '';
        elements.clearSearchBtn.classList.add('hidden');
        renderBookmarks();
    });

    // Sort
    elements.sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderBookmarks();
    });

    // Filter buttons
    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderBookmarks();
        });
    });

    // Export
    elements.exportBtn.addEventListener('click', exportBookmarks);

    // Import
    elements.importInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            importBookmarks(e.target.files[0]);
            e.target.value = '';
        }
    });

    // Bulk delete
    elements.bulkDeleteBtn.addEventListener('click', () => showDeleteModal(null, true));

    // Delete modal
    elements.cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    elements.confirmDeleteBtn.addEventListener('click', confirmDelete);
    elements.deleteModal.querySelector('.modal-backdrop').addEventListener('click', hideDeleteModal);

    // Help modal
    elements.helpBtn.addEventListener('click', showHelpModal);
    elements.closeHelpBtn.addEventListener('click', hideHelpModal);
    elements.helpModal.querySelector('.modal-backdrop').addEventListener('click', hideHelpModal);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            if (e.key === 'Escape') {
                e.target.blur();
                if (searchQuery) {
                    searchQuery = '';
                    elements.searchInput.value = '';
                    elements.clearSearchBtn.classList.add('hidden');
                    renderBookmarks();
                }
            }
            return;
        }

        switch (e.key) {
            case '/':
                e.preventDefault();
                elements.searchInput.focus();
                break;
            case 'Escape':
                hideDeleteModal();
                hideHelpModal();
                hideTweetModal();
                break;
            case 'n':
            case 'N':
                e.preventDefault();
                elements.bookmarkInput.focus();
                break;
        }
    });
}

// ================================
// Initialize App
// ================================

// Sample bookmark for first-time users
const SAMPLE_BOOKMARK = {
    tweetText: "The best way to learn programming is to build projects. Start with something simple, then gradually increase complexity. 🚀\n\nHere's my advice for beginners:\n1. Pick one language\n2. Build something daily\n3. Read other people's code\n4. Don't fear mistakes\n\nYou've got this! 💪",
    displayName: "Tech Tips",
    username: "techtips",
    tweetUrl: "https://x.com/techtips/status/1234567890123456789",
    tweetDate: new Date().toISOString(),
    type: "thread"
};

function addSampleBookmark() {
    // Only add if no bookmarks exist
    if (bookmarks.length === 0) {
        createBookmark(SAMPLE_BOOKMARK);
        showToast('Sample bookmark added! Try adding your own tweets now.', 'success');
    }
}

function init() {
    // Load bookmarks from localStorage (instant)
    loadBookmarks();

    // Render immediately - no artificial delay needed
    renderBookmarks();
    updateBookmarkCount();
    initEventListeners();

    // Add event listener for sample tweet button
    const sampleBtn = document.getElementById('try-sample-btn');
    if (sampleBtn) {
        sampleBtn.addEventListener('click', addSampleBookmark);
    }
}

document.addEventListener('DOMContentLoaded', init);

// Export for testing
window.BookmarkManager = {
    addBookmark: handleAddBookmark,
    createBookmark,
    deleteBookmark,
    bulkDeleteBookmarks,
    addTagToBookmark,
    removeTagFromBookmark,
    getBookmarks: () => bookmarks,
    setBookmarks: (data) => { bookmarks = data; saveBookmarks(); renderBookmarks(); updateBookmarkCount(); },
    clearAll: () => { bookmarks = []; selectedBookmarks.clear(); saveBookmarks(); renderBookmarks(); updateBookmarkCount(); updateBulkDeleteButton(); },
    getFilteredBookmarks,
    exportBookmarks,
    importBookmarks,
    showToast,
    getCurrentFilter: () => currentFilter,
    setFilter: (filter) => { currentFilter = filter; renderBookmarks(); },
    setSort: (sort) => { currentSort = sort; renderBookmarks(); },
    setSearch: (query) => { searchQuery = query; renderBookmarks(); },
    getSelectedCount: () => selectedBookmarks.size,
    selectBookmark: (id) => { selectedBookmarks.add(id); updateBulkDeleteButton(); },
    deselectAll: () => { selectedBookmarks.clear(); updateBulkDeleteButton(); },
    refresh: renderBookmarks,
    isTwitterUrl,
    parseTwitterUrl,
    detectContentType,
    fetchTweetOEmbed
};
