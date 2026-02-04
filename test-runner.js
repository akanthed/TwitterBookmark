// ================================
// Test Runner for Bookmark Manager
// Updated for Rich Tweet Cards
// ================================

const STORAGE_KEY = 'bookmark_manager_data';

// ================================
// Mini Bookmark Manager for Testing
// ================================

class BookmarkManagerTest {
    constructor() {
        this.bookmarks = [];
        this.selectedBookmarks = new Set();
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.searchQuery = '';
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    isTwitterUrl(text) {
        const pattern = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/\d+/i;
        return pattern.test(text);
    }

    parseTwitterUrl(url) {
        const pattern = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/i;
        const match = url.match(pattern);
        if (match) {
            return { username: match[1], tweetId: match[2], url: url };
        }
        return null;
    }

    detectContentType(content, url = '') {
        const lower = (content || '').toLowerCase();
        const lowerUrl = (url || '').toLowerCase();
        if (lower.includes('🧵') || lower.match(/\b1\/\d+\b/) || lower.includes('thread')) return 'thread';
        if (lowerUrl.includes('/photo/') || lower.includes('[image]')) return 'image';
        if (lowerUrl.includes('/video/') || lower.includes('[video]')) return 'video';
        if (lower.match(/https?:\/\/(?!twitter\.com|x\.com)[^\s]+/)) return 'link';
        return 'text';
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            this.bookmarks = data ? JSON.parse(data) : [];
        } catch (e) {
            this.bookmarks = [];
        }
    }

    saveToStorage() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bookmarks));
    }

    clearStorage() {
        localStorage.removeItem(STORAGE_KEY);
        this.bookmarks = [];
        this.selectedBookmarks.clear();
    }

    // Create a bookmark with all required fields
    addBookmark(data) {
        // Support both object and string input for testing
        if (typeof data === 'string') {
            // Simple string input - create basic bookmark
            data = {
                tweetText: data,
                displayName: 'Test User',
                username: 'testuser',
                tweetUrl: '',
                tweetDate: new Date().toISOString()
            };
        }

        const bookmark = {
            id: this.generateId(),
            tweetText: data.tweetText || '',
            displayName: data.displayName || data.username || 'Unknown',
            username: data.username || 'unknown',
            tweetUrl: data.tweetUrl || '',
            tweetDate: data.tweetDate || new Date().toISOString(),
            dateAdded: new Date().toISOString(),
            type: data.type || this.detectContentType(data.tweetText, data.tweetUrl),
            tags: []
        };
        this.bookmarks.unshift(bookmark);
        this.saveToStorage();
        return bookmark;
    }

    deleteBookmark(id) {
        const index = this.bookmarks.findIndex(b => b.id === id);
        if (index !== -1) {
            this.bookmarks.splice(index, 1);
            this.selectedBookmarks.delete(id);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    bulkDelete() {
        const ids = Array.from(this.selectedBookmarks);
        ids.forEach(id => {
            const index = this.bookmarks.findIndex(b => b.id === id);
            if (index !== -1) this.bookmarks.splice(index, 1);
        });
        const count = ids.length;
        this.selectedBookmarks.clear();
        this.saveToStorage();
        return count;
    }

    addTag(id, tag) {
        const bookmark = this.bookmarks.find(b => b.id === id);
        if (bookmark && tag.trim() && !bookmark.tags.includes(tag.trim())) {
            bookmark.tags.push(tag.trim());
            this.saveToStorage();
            return true;
        }
        return false;
    }

    removeTag(id, tag) {
        const bookmark = this.bookmarks.find(b => b.id === id);
        if (bookmark) {
            bookmark.tags = bookmark.tags.filter(t => t !== tag);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    selectBookmark(id) {
        this.selectedBookmarks.add(id);
    }

    deselectAll() {
        this.selectedBookmarks.clear();
    }

    setFilter(filter) {
        this.currentFilter = filter;
    }

    setSort(sort) {
        this.currentSort = sort;
    }

    setSearch(query) {
        this.searchQuery = query;
    }

    getFilteredBookmarks() {
        let filtered = [...this.bookmarks];

        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(b => b.type === this.currentFilter);
        }

        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(b =>
                (b.tweetText || '').toLowerCase().includes(query) ||
                (b.displayName || '').toLowerCase().includes(query) ||
                (b.username || '').toLowerCase().includes(query) ||
                (b.tags || []).some(t => t.toLowerCase().includes(query))
            );
        }

        switch (this.currentSort) {
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

    exportData() {
        return JSON.stringify(this.bookmarks, null, 2);
    }

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!Array.isArray(data)) throw new Error('Invalid format');

            let count = 0;
            data.forEach(item => {
                if ((item.tweetText || item.content) && item.id) {
                    if (!this.bookmarks.find(b => b.id === item.id)) {
                        this.bookmarks.push({
                            id: item.id,
                            tweetText: item.tweetText || item.content || '',
                            displayName: item.displayName || item.author || 'Unknown',
                            username: item.username || 'unknown',
                            tweetUrl: item.tweetUrl || '',
                            tweetDate: item.tweetDate || item.dateAdded || new Date().toISOString(),
                            dateAdded: item.dateAdded || new Date().toISOString(),
                            type: item.type || 'text',
                            tags: Array.isArray(item.tags) ? item.tags : []
                        });
                        count++;
                    }
                }
            });
            this.saveToStorage();
            return count;
        } catch (e) {
            throw new Error('Import failed: ' + e.message);
        }
    }

    getBookmarks() {
        return this.bookmarks;
    }

    getSelectedCount() {
        return this.selectedBookmarks.size;
    }

    isEmpty() {
        return this.bookmarks.length === 0;
    }

    // Text cleanup function - mirrors the app's parseOEmbedHtml cleanup logic
    cleanTweetText(text) {
        let cleaned = text;
        // Remove t.co links
        cleaned = cleaned.replace(/https?:\/\/t\.co\/\w+/gi, '').trim();
        // Remove pic.twitter.com links
        cleaned = cleaned.replace(/pic\.twitter\.com\/\w+/gi, '').trim();
        // Clean up multiple spaces and newlines
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        cleaned = cleaned.replace(/  +/g, ' ');
        cleaned = cleaned.trim();
        return cleaned;
    }
}

// ================================
// Test Suite State
// ================================

let manager = new BookmarkManagerTest();
let testResults = [];
let isRunning = false;

// DOM Elements
const elements = {
    testList: document.getElementById('test-list'),
    consoleOutput: document.getElementById('console-output'),
    runAllBtn: document.getElementById('run-all-btn'),
    resetBtn: document.getElementById('reset-btn'),
    clearConsoleBtn: document.getElementById('clear-console-btn'),
    totalTests: document.getElementById('total-tests'),
    passedTests: document.getElementById('passed-tests'),
    failedTests: document.getElementById('failed-tests'),
    passRate: document.getElementById('pass-rate')
};

// ================================
// Test Definitions
// ================================

const tests = [
    { id: 1, name: 'Add Bookmark', description: 'Create a tweet bookmark with all required fields', run: testAddBookmark },
    { id: 2, name: 'Search Functionality', description: 'Add 3 bookmarks, search and verify filtering', run: testSearchFunctionality },
    { id: 3, name: 'Tag System', description: 'Add bookmark, add custom tags, verify they appear', run: testTagSystem },
    { id: 4, name: 'Filter by Content Type', description: 'Add different types, verify filter works', run: testFilterByContentType },
    { id: 5, name: 'Delete Bookmark', description: 'Add then delete, verify removal', run: testDeleteBookmark },
    { id: 6, name: 'Export/Import', description: 'Export, clear, import, verify restoration', run: testExportImport },
    { id: 7, name: 'LocalStorage Persistence', description: 'Add bookmark, reload, verify persistence', run: testLocalStoragePersistence },
    { id: 8, name: 'Bulk Delete', description: 'Add 5, select 3, bulk delete, verify 2 remain', run: testBulkDelete },
    { id: 9, name: 'Sort Functionality', description: 'Test sort by newest/oldest/alphabetical', run: testSortFunctionality },
    { id: 10, name: 'Twitter URL Parsing', description: 'Test Twitter/X URL detection and parsing', run: testTwitterUrlParsing },
    { id: 11, name: 'Text Cleanup', description: 'Test t.co and pic.twitter.com link removal', run: testTextCleanup }
];

// ================================
// Console & UI Helpers
// ================================

function log(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.innerHTML = `<span class="console-time">[${time}]</span>${escapeHtml(message)}`;
    elements.consoleOutput.appendChild(line);
    elements.consoleOutput.scrollTop = elements.consoleOutput.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function clearConsole() {
    elements.consoleOutput.innerHTML = '';
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function renderTestCards() {
    elements.testList.innerHTML = '';
    tests.forEach((test, index) => {
        const result = testResults[index];
        const status = result ? result.status : 'pending';
        const card = document.createElement('div');
        card.className = 'test-card';
        card.id = `test-${test.id}`;
        card.innerHTML = `
            <div class="test-status ${status}">${getStatusIcon(status)}</div>
            <div class="test-info">
                <div class="test-name">${test.id}. ${test.name}</div>
                <div class="test-description">${test.description}</div>
                ${result && result.time ? `<div class="test-time">Completed in ${result.time}ms</div>` : ''}
            </div>
            <div class="test-actions">
                <button class="btn btn-secondary btn-sm run-single-btn" data-id="${index}" ${isRunning ? 'disabled' : ''}>Run Test</button>
            </div>
        `;
        elements.testList.appendChild(card);
    });

    document.querySelectorAll('.run-single-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = parseInt(e.target.dataset.id);
            await runSingleTest(index);
        });
    });
}

function getStatusIcon(status) {
    const icons = {
        pending: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>',
        running: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
        pass: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
        fail: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
    };
    return icons[status] || icons.pending;
}

function updateTestCard(index, status, time = null) {
    testResults[index] = { status, time };
    renderTestCards();
    updateSummary();
}

function updateSummary() {
    const passed = testResults.filter(r => r && r.status === 'pass').length;
    const failed = testResults.filter(r => r && r.status === 'fail').length;
    const total = tests.length;
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;

    elements.totalTests.textContent = total;
    elements.passedTests.textContent = passed;
    elements.failedTests.textContent = failed;
    elements.passRate.textContent = `${rate}%`;
}

// ================================
// Test Runner
// ================================

async function runSingleTest(index) {
    if (isRunning) return;
    isRunning = true;
    elements.runAllBtn.disabled = true;

    const test = tests[index];
    log(`Starting test: ${test.name}`, 'info');
    updateTestCard(index, 'running');

    const startTime = performance.now();

    try {
        manager = new BookmarkManagerTest();
        manager.clearStorage();
        await delay(50);

        await test.run();

        const endTime = performance.now();
        const time = Math.round(endTime - startTime);
        updateTestCard(index, 'pass', time);
        log(`✓ PASS: ${test.name} (${time}ms)`, 'success');
    } catch (error) {
        const endTime = performance.now();
        const time = Math.round(endTime - startTime);
        updateTestCard(index, 'fail', time);
        log(`✗ FAIL: ${test.name} - ${error.message}`, 'error');
    }

    isRunning = false;
    elements.runAllBtn.disabled = false;
}

async function runAllTests() {
    if (isRunning) return;
    isRunning = true;
    elements.runAllBtn.disabled = true;

    clearConsole();
    log('═══════════════════════════════════════════', 'info');
    log('Starting Test Suite...', 'info');
    log('═══════════════════════════════════════════', 'info');

    testResults = [];
    renderTestCards();

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        log(`\n[Test ${test.id}/${tests.length}] ${test.name}`, 'info');
        updateTestCard(i, 'running');

        const startTime = performance.now();

        try {
            manager = new BookmarkManagerTest();
            manager.clearStorage();
            await delay(50);

            await test.run();

            const endTime = performance.now();
            const time = Math.round(endTime - startTime);
            updateTestCard(i, 'pass', time);
            log(`✓ PASS (${time}ms)`, 'success');
        } catch (error) {
            const endTime = performance.now();
            const time = Math.round(endTime - startTime);
            updateTestCard(i, 'fail', time);
            log(`✗ FAIL: ${error.message}`, 'error');
        }

        await delay(100);
    }

    const passed = testResults.filter(r => r && r.status === 'pass').length;
    const failed = testResults.filter(r => r && r.status === 'fail').length;

    log('\n═══════════════════════════════════════════', 'info');
    log(`Test Suite Complete: ${passed} passed, ${failed} failed`, passed === tests.length ? 'success' : 'warn');
    log('═══════════════════════════════════════════', 'info');

    isRunning = false;
    elements.runAllBtn.disabled = false;
}

function resetTests() {
    testResults = [];
    clearConsole();
    manager = new BookmarkManagerTest();
    manager.clearStorage();
    renderTestCards();
    updateSummary();
    log('Tests reset. Storage cleared.', 'info');
}

// ================================
// Test Implementations
// ================================

async function testAddBookmark() {
    log('  Creating bookmark with tweet data...', 'info');

    const bookmark = manager.addBookmark({
        tweetText: 'This is a test tweet about JavaScript and coding',
        displayName: 'Test User',
        username: 'testuser',
        tweetUrl: 'https://x.com/testuser/status/1234567890',
        tweetDate: '2025-01-15T10:30:00Z'
    });

    if (!bookmark) throw new Error('Bookmark was not created');

    log(`  Bookmark ID: ${bookmark.id}`, 'info');
    log(`  Tweet Text: ${bookmark.tweetText.substring(0, 50)}...`, 'info');
    log(`  Display Name: ${bookmark.displayName}`, 'info');
    log(`  Username: @${bookmark.username}`, 'info');
    log(`  Type: ${bookmark.type}`, 'info');

    const bookmarks = manager.getBookmarks();
    if (bookmarks.length !== 1) throw new Error(`Expected 1 bookmark, got ${bookmarks.length}`);
    if (!bookmark.tweetText) throw new Error('Bookmark missing tweetText');
    if (!bookmark.displayName) throw new Error('Bookmark missing displayName');
    if (!bookmark.username) throw new Error('Bookmark missing username');
    if (!bookmark.tweetUrl) throw new Error('Bookmark missing tweetUrl');
    if (bookmark.username !== 'testuser') throw new Error(`Expected username testuser, got ${bookmark.username}`);

    log('  ✓ All fields populated correctly', 'success');
}

async function testSearchFunctionality() {
    log('  Adding 3 bookmarks with unique content...', 'info');
    manager.addBookmark({ tweetText: 'JavaScript tutorial for beginners', username: 'jsdev', displayName: 'JS Developer' });
    manager.addBookmark({ tweetText: 'Python machine learning guide', username: 'pyml', displayName: 'Python ML' });
    manager.addBookmark({ tweetText: 'React component patterns', username: 'reactguru', displayName: 'React Guru' });

    if (manager.getBookmarks().length !== 3) throw new Error('Failed to create 3 bookmarks');

    log('  Searching for "JavaScript"...', 'info');
    manager.setSearch('JavaScript');
    let filtered = manager.getFilteredBookmarks();
    if (filtered.length !== 1) throw new Error(`JavaScript search: expected 1, got ${filtered.length}`);
    log('  ✓ JavaScript search returned 1 result', 'success');

    log('  Searching for username "pyml"...', 'info');
    manager.setSearch('pyml');
    filtered = manager.getFilteredBookmarks();
    if (filtered.length !== 1) throw new Error(`Username search: expected 1, got ${filtered.length}`);
    log('  ✓ Username search works', 'success');

    log('  Searching for display name "React Guru"...', 'info');
    manager.setSearch('React Guru');
    filtered = manager.getFilteredBookmarks();
    if (filtered.length !== 1) throw new Error(`Display name search: expected 1, got ${filtered.length}`);
    log('  ✓ Display name search works', 'success');

    manager.setSearch('');
}

async function testTagSystem() {
    log('  Adding bookmark...', 'info');
    const bookmark = manager.addBookmark({ tweetText: 'Test bookmark for tag testing', username: 'tagger' });

    log('  Adding custom tags...', 'info');
    manager.addTag(bookmark.id, 'important');
    manager.addTag(bookmark.id, 'work');

    const updated = manager.getBookmarks().find(b => b.id === bookmark.id);
    if (!updated.tags || updated.tags.length !== 2) throw new Error(`Expected 2 tags, got ${updated.tags?.length || 0}`);
    if (!updated.tags.includes('important')) throw new Error('Tag "important" not found');
    if (!updated.tags.includes('work')) throw new Error('Tag "work" not found');

    log(`  ✓ Tags added: ${updated.tags.join(', ')}`, 'success');

    log('  Testing tag search...', 'info');
    manager.setSearch('important');
    const filtered = manager.getFilteredBookmarks();
    if (filtered.length !== 1) throw new Error('Tag search failed');
    log('  ✓ Tag search works', 'success');

    manager.setSearch('');
}

async function testFilterByContentType() {
    log('  Adding bookmarks of different types...', 'info');
    manager.addBookmark({ tweetText: 'This is a thread 🧵 about coding 1/5', username: 'threadmaker' });
    manager.addBookmark({ tweetText: 'Check this out', username: 'photouser', tweetUrl: 'https://x.com/user/status/123/photo/1' });
    manager.addBookmark({ tweetText: 'Watch this', username: 'videouser', tweetUrl: 'https://x.com/user/status/123/video/1' });
    manager.addBookmark({ tweetText: 'Just plain text here', username: 'textuser' });

    if (manager.getBookmarks().length !== 4) throw new Error('Failed to create 4 bookmarks');

    log('  Testing thread filter...', 'info');
    manager.setFilter('thread');
    let filtered = manager.getFilteredBookmarks();
    if (filtered.length !== 1 || filtered[0].type !== 'thread') throw new Error('Thread filter failed');
    log('  ✓ Thread filter works', 'success');

    log('  Testing image filter...', 'info');
    manager.setFilter('image');
    filtered = manager.getFilteredBookmarks();
    if (filtered.length !== 1 || filtered[0].type !== 'image') throw new Error('Image filter failed');
    log('  ✓ Image filter works', 'success');

    log('  Testing video filter...', 'info');
    manager.setFilter('video');
    filtered = manager.getFilteredBookmarks();
    if (filtered.length !== 1 || filtered[0].type !== 'video') throw new Error('Video filter failed');
    log('  ✓ Video filter works', 'success');

    log('  Testing all filter...', 'info');
    manager.setFilter('all');
    filtered = manager.getFilteredBookmarks();
    if (filtered.length !== 4) throw new Error('All filter failed');
    log('  ✓ All filter shows all bookmarks', 'success');
}

async function testDeleteBookmark() {
    log('  Adding bookmark...', 'info');
    const bookmark = manager.addBookmark({ tweetText: 'Bookmark to be deleted', username: 'deleteme' });
    const bookmarkId = bookmark.id;
    log(`  Bookmark created with ID: ${bookmarkId}`, 'info');

    log('  Deleting bookmark...', 'info');
    const result = manager.deleteBookmark(bookmarkId);
    if (!result) throw new Error('Delete returned false');

    if (manager.getBookmarks().length !== 0) throw new Error('Bookmark still in list');
    log('  ✓ Bookmark removed from list', 'success');

    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (parsed.length !== 0) throw new Error('Bookmark still in localStorage');
    log('  ✓ Bookmark removed from localStorage', 'success');
}

async function testExportImport() {
    log('  Adding 2 bookmarks...', 'info');
    manager.addBookmark({ tweetText: 'First tweet for export test', username: 'user1', displayName: 'User One' });
    manager.addBookmark({ tweetText: 'Second tweet for export test', username: 'user2', displayName: 'User Two' });

    if (manager.getBookmarks().length !== 2) throw new Error('Failed to create 2 bookmarks');
    log('  ✓ Created 2 bookmarks', 'success');

    log('  Exporting data...', 'info');
    const exportData = manager.exportData();
    log('  ✓ Export data captured', 'success');

    log('  Clearing all bookmarks...', 'info');
    manager.clearStorage();
    if (manager.getBookmarks().length !== 0) throw new Error('Bookmarks not cleared');
    log('  ✓ All bookmarks cleared', 'success');

    log('  Importing bookmarks...', 'info');
    const count = manager.importData(exportData);
    if (count !== 2) throw new Error(`Expected 2 imported, got ${count}`);
    if (manager.getBookmarks().length !== 2) throw new Error('Import did not restore bookmarks');

    // Verify data integrity
    const imported = manager.getBookmarks();
    if (!imported.find(b => b.username === 'user1')) throw new Error('User1 not imported');
    if (!imported.find(b => b.username === 'user2')) throw new Error('User2 not imported');
    log('  ✓ Both bookmarks restored successfully', 'success');
}

async function testLocalStoragePersistence() {
    log('  Adding bookmark...', 'info');
    const testContent = 'Persistence test tweet ' + Date.now();
    manager.addBookmark({ tweetText: testContent, username: 'persistent' });

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) throw new Error('Nothing saved to localStorage');
    log('  ✓ Bookmark saved to localStorage', 'success');

    log('  Simulating page reload (new manager instance)...', 'info');
    const newManager = new BookmarkManagerTest();
    newManager.loadFromStorage();

    if (newManager.getBookmarks().length !== 1) throw new Error('Bookmark not persisted');
    if (!newManager.getBookmarks()[0].tweetText.includes('Persistence test')) throw new Error('Content changed');
    log('  ✓ Bookmark persisted after reload', 'success');
}

async function testBulkDelete() {
    log('  Adding 5 bookmarks...', 'info');
    const ids = [];
    for (let i = 1; i <= 5; i++) {
        const b = manager.addBookmark({ tweetText: `Bulk delete test tweet ${i}`, username: `user${i}` });
        ids.push(b.id);
    }

    if (manager.getBookmarks().length !== 5) throw new Error('Failed to create 5 bookmarks');
    log('  ✓ Created 5 bookmarks', 'success');

    log('  Selecting 3 bookmarks...', 'info');
    manager.selectBookmark(ids[0]);
    manager.selectBookmark(ids[1]);
    manager.selectBookmark(ids[2]);

    if (manager.getSelectedCount() !== 3) throw new Error('Selection failed');
    log('  ✓ 3 bookmarks selected', 'success');

    log('  Performing bulk delete...', 'info');
    const deleted = manager.bulkDelete();
    if (deleted !== 3) throw new Error(`Expected 3 deleted, got ${deleted}`);

    const remaining = manager.getBookmarks().length;
    if (remaining !== 2) throw new Error(`Expected 2 remaining, got ${remaining}`);
    log('  ✓ 2 bookmarks remain after bulk delete', 'success');
}

async function testSortFunctionality() {
    log('  Adding bookmarks with specific dates...', 'info');

    manager.bookmarks = [
        { id: 'sort-1', tweetText: 'AAA First alphabetically', displayName: 'User A', username: 'usera', tweetUrl: '', tweetDate: '2024-01-01T00:00:00Z', dateAdded: '2024-01-01T00:00:00Z', type: 'text', tags: [] },
        { id: 'sort-2', tweetText: 'ZZZ Last alphabetically', displayName: 'User Z', username: 'userz', tweetUrl: '', tweetDate: '2024-01-03T00:00:00Z', dateAdded: '2024-01-03T00:00:00Z', type: 'text', tags: [] },
        { id: 'sort-3', tweetText: 'MMM Middle alphabetically', displayName: 'User M', username: 'userm', tweetUrl: '', tweetDate: '2024-01-02T00:00:00Z', dateAdded: '2024-01-02T00:00:00Z', type: 'text', tags: [] }
    ];
    manager.saveToStorage();

    log('  Testing sort by newest...', 'info');
    manager.setSort('newest');
    let filtered = manager.getFilteredBookmarks();
    if (filtered[0].tweetText !== 'ZZZ Last alphabetically') throw new Error('Newest sort failed');
    log('  ✓ Newest sort works (ZZZ first)', 'success');

    log('  Testing sort by oldest...', 'info');
    manager.setSort('oldest');
    filtered = manager.getFilteredBookmarks();
    if (filtered[0].tweetText !== 'AAA First alphabetically') throw new Error('Oldest sort failed');
    log('  ✓ Oldest sort works (AAA first)', 'success');

    log('  Testing sort A-Z...', 'info');
    manager.setSort('az');
    filtered = manager.getFilteredBookmarks();
    if (filtered[0].tweetText !== 'AAA First alphabetically') throw new Error('A-Z sort failed');
    log('  ✓ A-Z sort works', 'success');

    log('  Testing sort Z-A...', 'info');
    manager.setSort('za');
    filtered = manager.getFilteredBookmarks();
    if (filtered[0].tweetText !== 'ZZZ Last alphabetically') throw new Error('Z-A sort failed');
    log('  ✓ Z-A sort works', 'success');
}

async function testTwitterUrlParsing() {
    log('  Testing Twitter URL detection...', 'info');

    const validUrls = [
        'https://twitter.com/elonmusk/status/1234567890',
        'https://x.com/user/status/9876543210',
        'http://twitter.com/test/status/111222333',
        'twitter.com/username/status/444555666'
    ];

    const invalidUrls = [
        'https://google.com',
        'just some text',
        'https://twitter.com/username',
        'https://x.com/status/123'
    ];

    for (const url of validUrls) {
        if (!manager.isTwitterUrl(url)) {
            throw new Error(`Should detect as Twitter URL: ${url}`);
        }
    }
    log('  ✓ Valid Twitter URLs detected', 'success');

    for (const url of invalidUrls) {
        if (manager.isTwitterUrl(url)) {
            throw new Error(`Should NOT detect as Twitter URL: ${url}`);
        }
    }
    log('  ✓ Invalid URLs correctly rejected', 'success');

    log('  Testing URL parsing...', 'info');
    const parsed = manager.parseTwitterUrl('https://x.com/elonmusk/status/1234567890');
    if (!parsed) throw new Error('Failed to parse Twitter URL');
    if (parsed.username !== 'elonmusk') throw new Error(`Wrong username: ${parsed.username}`);
    if (parsed.tweetId !== '1234567890') throw new Error(`Wrong tweet ID: ${parsed.tweetId}`);
    log(`  ✓ Parsed: @${parsed.username}, ID: ${parsed.tweetId}`, 'success');

    log('  Testing content type detection...', 'info');
    if (manager.detectContentType('This is a thread 🧵') !== 'thread') throw new Error('Thread detection failed');
    if (manager.detectContentType('Check this', 'https://x.com/u/s/123/photo/1') !== 'image') throw new Error('Image detection failed');
    if (manager.detectContentType('Watch', 'https://x.com/u/s/123/video/1') !== 'video') throw new Error('Video detection failed');
    if (manager.detectContentType('Just text here') !== 'text') throw new Error('Text detection failed');
    log('  ✓ Content type detection works', 'success');
}

async function testTextCleanup() {
    log('  Testing t.co link removal...', 'info');

    // Test t.co removal
    const textWithTco = 'This is a great tweet https://t.co/abc123XYZ check it out';
    const cleanedTco = manager.cleanTweetText(textWithTco);
    if (cleanedTco.includes('t.co')) throw new Error('t.co link was not removed');
    if (!cleanedTco.includes('This is a great tweet')) throw new Error('Original text was lost');
    log(`  ✓ Removed t.co: "${cleanedTco}"`, 'success');

    log('  Testing pic.twitter.com removal...', 'info');
    const textWithPic = 'Check out this image pic.twitter.com/XYZ789abc';
    const cleanedPic = manager.cleanTweetText(textWithPic);
    if (cleanedPic.includes('pic.twitter.com')) throw new Error('pic.twitter.com link was not removed');
    if (!cleanedPic.includes('Check out this image')) throw new Error('Original text was lost');
    log(`  ✓ Removed pic.twitter.com: "${cleanedPic}"`, 'success');

    log('  Testing multiple links removal...', 'info');
    const textWithMultiple = 'Tweet text https://t.co/link1 more text https://t.co/link2 pic.twitter.com/img1';
    const cleanedMultiple = manager.cleanTweetText(textWithMultiple);
    if (cleanedMultiple.includes('t.co') || cleanedMultiple.includes('pic.twitter.com')) {
        throw new Error('Not all links were removed');
    }
    log(`  ✓ Multiple links removed: "${cleanedMultiple}"`, 'success');

    log('  Testing whitespace cleanup...', 'info');
    const textWithSpaces = 'Tweet   with    extra   spaces';
    const cleanedSpaces = manager.cleanTweetText(textWithSpaces);
    if (cleanedSpaces.includes('  ')) throw new Error('Extra spaces not cleaned');
    log(`  ✓ Whitespace cleaned: "${cleanedSpaces}"`, 'success');

    log('  Testing real-world tweet text...', 'info');
    const realTweet = 'a lot of people are asking me what this means. I do not know hope that helps https://t.co/3XJYdStgdJ';
    const cleanedReal = manager.cleanTweetText(realTweet);
    const expected = 'a lot of people are asking me what this means. I do not know hope that helps';
    if (cleanedReal !== expected) {
        throw new Error(`Expected "${expected}" but got "${cleanedReal}"`);
    }
    log(`  ✓ Real tweet cleaned correctly`, 'success');
}

// ================================
// Event Listeners
// ================================

elements.runAllBtn.addEventListener('click', runAllTests);
elements.resetBtn.addEventListener('click', resetTests);
elements.clearConsoleBtn.addEventListener('click', clearConsole);

// ================================
// Initialize
// ================================

document.addEventListener('DOMContentLoaded', async () => {
    renderTestCards();
    updateSummary();
    log('Test Suite initialized. Click "Run All Tests" to begin.', 'info');

    await delay(1000);
    log('Auto-starting tests...', 'info');
    runAllTests();
});
