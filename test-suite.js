// ================================
// Test Suite for Bookmark Manager
// ================================

const STORAGE_KEY = 'bookmark_manager_data';

// Test State
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
    passRate: document.getElementById('pass-rate'),
    testFrame: document.getElementById('test-frame')
};

// Test Definitions
const tests = [
    {
        id: 1,
        name: 'Add Bookmark',
        description: 'Input a sample tweet URL, verify bookmark appears with all fields populated',
        run: testAddBookmark
    },
    {
        id: 2,
        name: 'Search Functionality',
        description: 'Add 3 bookmarks with unique keywords, search and verify filtering',
        run: testSearchFunctionality
    },
    {
        id: 3,
        name: 'Tag System',
        description: 'Add a bookmark, add 2 custom tags, verify tags appear on card',
        run: testTagSystem
    },
    {
        id: 4,
        name: 'Filter by Content Type',
        description: 'Add bookmarks of different types, verify filter buttons work correctly',
        run: testFilterByContentType
    },
    {
        id: 5,
        name: 'Delete Bookmark',
        description: 'Add a bookmark, delete it, verify removal from list and localStorage',
        run: testDeleteBookmark
    },
    {
        id: 6,
        name: 'Export/Import',
        description: 'Add bookmarks, export to JSON, clear, import back, verify restoration',
        run: testExportImport
    },
    {
        id: 7,
        name: 'LocalStorage Persistence',
        description: 'Add a bookmark, simulate refresh, verify bookmark persists',
        run: testLocalStoragePersistence
    },
    {
        id: 8,
        name: 'Bulk Delete',
        description: 'Add 5 bookmarks, select 3, bulk delete, verify only 2 remain',
        run: testBulkDelete
    },
    {
        id: 9,
        name: 'Sort Functionality',
        description: 'Add bookmarks at different times, test sort by newest/oldest',
        run: testSortFunctionality
    },
    {
        id: 10,
        name: 'Empty State Display',
        description: 'Delete all bookmarks, verify empty state message appears',
        run: testEmptyStateDisplay
    }
];

// Console Logging
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

// Helper Functions
function getManager() {
    return elements.testFrame.contentWindow.BookmarkManager;
}

function waitForFrame() {
    return new Promise((resolve) => {
        if (elements.testFrame.contentWindow.BookmarkManager) {
            resolve();
        } else {
            elements.testFrame.onload = () => {
                setTimeout(resolve, 500);
            };
        }
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
}

function getStoredBookmarks() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

// Test Card Rendering
function renderTestCards() {
    elements.testList.innerHTML = '';
    tests.forEach((test, index) => {
        const result = testResults[index];
        const status = result ? result.status : 'pending';
        const card = document.createElement('div');
        card.className = 'test-card';
        card.id = `test-${test.id}`;
        card.innerHTML = `
            <div class="test-status ${status}">
                ${getStatusIcon(status)}
            </div>
            <div class="test-info">
                <div class="test-name">${test.id}. ${test.name}</div>
                <div class="test-description">${test.description}</div>
                ${result && result.time ? `<div class="test-time">Completed in ${result.time}ms</div>` : ''}
            </div>
            <div class="test-actions">
                <button class="btn btn-secondary btn-sm run-single-btn" data-id="${index}" ${isRunning ? 'disabled' : ''}>
                    Run Test
                </button>
            </div>
        `;
        elements.testList.appendChild(card);
    });

    // Add event listeners to run buttons
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

// Test Runner
async function runSingleTest(index) {
    if (isRunning) return;
    isRunning = true;
    elements.runAllBtn.disabled = true;

    const test = tests[index];
    log(`Starting test: ${test.name}`, 'info');
    updateTestCard(index, 'running');

    const startTime = performance.now();

    try {
        await waitForFrame();
        clearStorage();
        getManager().clearAll();
        await delay(100);

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

    await waitForFrame();

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        log(`\n[Test ${test.id}/${tests.length}] ${test.name}`, 'info');
        updateTestCard(i, 'running');

        const startTime = performance.now();

        try {
            clearStorage();
            getManager().clearAll();
            await delay(100);

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

        await delay(200);
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
    clearStorage();
    renderTestCards();
    updateSummary();
    log('Tests reset. Storage cleared.', 'info');
}

// ================================
// Test Implementations
// ================================

async function testAddBookmark() {
    const manager = getManager();
    const testUrl = 'https://twitter.com/testuser/status/1234567890';

    log('  Adding bookmark with tweet URL...', 'info');
    const bookmark = manager.addBookmark(testUrl);
    await delay(100);

    if (!bookmark) {
        throw new Error('Bookmark was not created');
    }

    log(`  Bookmark ID: ${bookmark.id}`, 'info');
    log(`  Content: ${bookmark.content}`, 'info');
    log(`  Author: ${bookmark.author}`, 'info');
    log(`  Date: ${bookmark.dateAdded}`, 'info');

    const bookmarks = manager.getBookmarks();
    if (bookmarks.length !== 1) {
        throw new Error(`Expected 1 bookmark, got ${bookmarks.length}`);
    }

    if (!bookmark.content || !bookmark.author || !bookmark.dateAdded) {
        throw new Error('Bookmark missing required fields');
    }

    log('  ✓ All fields populated correctly', 'success');
}

async function testSearchFunctionality() {
    const manager = getManager();

    log('  Adding 3 bookmarks with unique keywords...', 'info');
    manager.addBookmark('JavaScript tutorial for beginners');
    manager.addBookmark('Python machine learning guide');
    manager.addBookmark('React component patterns');
    await delay(100);

    const bookmarks = manager.getBookmarks();
    if (bookmarks.length !== 3) {
        throw new Error(`Expected 3 bookmarks, got ${bookmarks.length}`);
    }

    // Test search for "JavaScript"
    log('  Searching for "JavaScript"...', 'info');
    const searchInput = elements.testFrame.contentDocument.getElementById('search-input');
    searchInput.value = 'JavaScript';
    searchInput.dispatchEvent(new Event('input'));
    await delay(100);

    const filtered = manager.getFilteredBookmarks();
    if (filtered.length !== 1) {
        throw new Error(`Search "JavaScript": expected 1 result, got ${filtered.length}`);
    }
    if (!filtered[0].content.includes('JavaScript')) {
        throw new Error('Search result does not contain expected keyword');
    }
    log('  ✓ JavaScript search returned 1 result', 'success');

    // Test search for "Python"
    searchInput.value = 'Python';
    searchInput.dispatchEvent(new Event('input'));
    await delay(100);

    const filtered2 = manager.getFilteredBookmarks();
    if (filtered2.length !== 1) {
        throw new Error(`Search "Python": expected 1 result, got ${filtered2.length}`);
    }
    log('  ✓ Python search returned 1 result', 'success');

    // Clear search
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
}

async function testTagSystem() {
    const manager = getManager();

    log('  Adding bookmark...', 'info');
    const bookmark = manager.addBookmark('Test bookmark for tag testing');
    await delay(100);

    log('  Adding custom tags...', 'info');
    manager.addTagToBookmark(bookmark.id, 'important');
    manager.addTagToBookmark(bookmark.id, 'work');
    await delay(100);

    const bookmarks = manager.getBookmarks();
    const updated = bookmarks.find(b => b.id === bookmark.id);

    if (!updated.tags || updated.tags.length !== 2) {
        throw new Error(`Expected 2 tags, got ${updated.tags ? updated.tags.length : 0}`);
    }

    if (!updated.tags.includes('important') || !updated.tags.includes('work')) {
        throw new Error('Tags not found on bookmark');
    }

    log(`  ✓ Tags added: ${updated.tags.join(', ')}`, 'success');

    // Verify tags appear in DOM
    manager.refresh();
    await delay(100);
    const tagElements = elements.testFrame.contentDocument.querySelectorAll('.tag-custom');
    if (tagElements.length < 2) {
        throw new Error('Tags not rendered in UI');
    }
    log('  ✓ Tags visible in UI', 'success');
}

async function testFilterByContentType() {
    const manager = getManager();

    log('  Adding bookmarks of different types...', 'info');
    manager.addBookmark('This is a thread 🧵 about coding');
    manager.addBookmark('Check out this image photo');
    manager.addBookmark('Watch this video clip');
    manager.addBookmark('Plain text content here');
    await delay(100);

    const bookmarks = manager.getBookmarks();
    log(`  Added ${bookmarks.length} bookmarks`, 'info');

    // Test thread filter
    log('  Testing thread filter...', 'info');
    manager.setFilter('thread');
    await delay(100);
    let filtered = manager.getFilteredBookmarks();
    if (filtered.length !== 1 || filtered[0].type !== 'thread') {
        throw new Error(`Thread filter: expected 1 thread, got ${filtered.length}`);
    }
    log('  ✓ Thread filter works', 'success');

    // Test image filter
    log('  Testing image filter...', 'info');
    manager.setFilter('image');
    await delay(100);
    filtered = manager.getFilteredBookmarks();
    if (filtered.length !== 1 || filtered[0].type !== 'image') {
        throw new Error(`Image filter: expected 1 image, got ${filtered.length}`);
    }
    log('  ✓ Image filter works', 'success');

    // Test all filter
    manager.setFilter('all');
    await delay(100);
    filtered = manager.getFilteredBookmarks();
    if (filtered.length !== 4) {
        throw new Error(`All filter: expected 4 bookmarks, got ${filtered.length}`);
    }
    log('  ✓ All filter shows all bookmarks', 'success');
}

async function testDeleteBookmark() {
    const manager = getManager();

    log('  Adding bookmark...', 'info');
    const bookmark = manager.addBookmark('Bookmark to be deleted');
    await delay(100);

    const bookmarkId = bookmark.id;
    log(`  Bookmark created with ID: ${bookmarkId}`, 'info');

    log('  Deleting bookmark...', 'info');
    manager.deleteBookmark(bookmarkId);
    await delay(400);

    const bookmarks = manager.getBookmarks();
    if (bookmarks.length !== 0) {
        throw new Error(`Expected 0 bookmarks after delete, got ${bookmarks.length}`);
    }
    log('  ✓ Bookmark removed from list', 'success');

    // Check localStorage
    const stored = getStoredBookmarks();
    if (stored.length !== 0) {
        throw new Error('Bookmark still exists in localStorage');
    }
    log('  ✓ Bookmark removed from localStorage', 'success');
}

async function testExportImport() {
    const manager = getManager();

    log('  Adding 2 bookmarks...', 'info');
    manager.addBookmark('First bookmark for export test');
    manager.addBookmark('Second bookmark for export test');
    await delay(100);

    const originalCount = manager.getBookmarks().length;
    if (originalCount !== 2) {
        throw new Error(`Expected 2 bookmarks, got ${originalCount}`);
    }
    log(`  ✓ Created ${originalCount} bookmarks`, 'success');

    // Get the data that would be exported
    const exportData = JSON.stringify(manager.getBookmarks());
    log('  ✓ Export data captured', 'success');

    // Clear all
    log('  Clearing all bookmarks...', 'info');
    manager.clearAll();
    await delay(100);

    if (manager.getBookmarks().length !== 0) {
        throw new Error('Bookmarks not cleared');
    }
    log('  ✓ All bookmarks cleared', 'success');

    // Simulate import
    log('  Importing bookmarks...', 'info');
    const importedData = JSON.parse(exportData);
    manager.setBookmarks(importedData);
    await delay(100);

    const finalCount = manager.getBookmarks().length;
    if (finalCount !== 2) {
        throw new Error(`Expected 2 restored bookmarks, got ${finalCount}`);
    }
    log('  ✓ Both bookmarks restored successfully', 'success');
}

async function testLocalStoragePersistence() {
    const manager = getManager();

    log('  Adding bookmark...', 'info');
    const testContent = 'Persistence test bookmark ' + Date.now();
    manager.addBookmark(testContent);
    await delay(100);

    // Verify in localStorage
    const stored = getStoredBookmarks();
    if (stored.length !== 1) {
        throw new Error('Bookmark not saved to localStorage');
    }
    log('  ✓ Bookmark saved to localStorage', 'success');

    // Simulate page refresh by reloading iframe
    log('  Simulating page refresh...', 'info');
    elements.testFrame.src = 'index.html';
    await new Promise(resolve => {
        elements.testFrame.onload = resolve;
    });
    await delay(500);

    // Check if bookmark persists
    const newManager = getManager();
    const bookmarks = newManager.getBookmarks();

    if (bookmarks.length !== 1) {
        throw new Error(`Expected 1 bookmark after refresh, got ${bookmarks.length}`);
    }

    if (!bookmarks[0].content.includes('Persistence test')) {
        throw new Error('Bookmark content changed after refresh');
    }

    log('  ✓ Bookmark persisted after refresh', 'success');
}

async function testBulkDelete() {
    const manager = getManager();

    log('  Adding 5 bookmarks...', 'info');
    const ids = [];
    for (let i = 1; i <= 5; i++) {
        const b = manager.addBookmark(`Bulk delete test bookmark ${i}`);
        ids.push(b.id);
    }
    await delay(100);

    if (manager.getBookmarks().length !== 5) {
        throw new Error('Failed to create 5 bookmarks');
    }
    log('  ✓ Created 5 bookmarks', 'success');

    // Select 3 bookmarks
    log('  Selecting 3 bookmarks...', 'info');
    manager.selectBookmark(ids[0]);
    manager.selectBookmark(ids[1]);
    manager.selectBookmark(ids[2]);
    await delay(100);

    if (manager.getSelectedCount() !== 3) {
        throw new Error(`Expected 3 selected, got ${manager.getSelectedCount()}`);
    }
    log('  ✓ 3 bookmarks selected', 'success');

    // Bulk delete
    log('  Performing bulk delete...', 'info');
    manager.bulkDeleteBookmarks();
    await delay(100);

    const remaining = manager.getBookmarks().length;
    if (remaining !== 2) {
        throw new Error(`Expected 2 remaining bookmarks, got ${remaining}`);
    }
    log('  ✓ 2 bookmarks remain after bulk delete', 'success');
}

async function testSortFunctionality() {
    const manager = getManager();

    log('  Adding bookmarks with different dates...', 'info');

    // Create bookmarks with specific dates
    const bookmarks = [
        { content: 'AAA First alphabetically', dateAdded: new Date('2024-01-01').toISOString() },
        { content: 'ZZZ Last alphabetically', dateAdded: new Date('2024-01-03').toISOString() },
        { content: 'MMM Middle alphabetically', dateAdded: new Date('2024-01-02').toISOString() }
    ];

    manager.setBookmarks(bookmarks.map((b, i) => ({
        id: 'sort-test-' + i,
        content: b.content,
        author: 'Test',
        type: 'text',
        tags: [],
        dateAdded: b.dateAdded
    })));
    await delay(100);

    // Test newest first (default)
    log('  Testing sort by newest...', 'info');
    const sortSelect = elements.testFrame.contentDocument.getElementById('sort-select');
    sortSelect.value = 'newest';
    sortSelect.dispatchEvent(new Event('change'));
    await delay(100);

    let filtered = manager.getFilteredBookmarks();
    if (filtered[0].content !== 'ZZZ Last alphabetically') {
        throw new Error('Newest sort failed');
    }
    log('  ✓ Newest sort works correctly', 'success');

    // Test oldest first
    log('  Testing sort by oldest...', 'info');
    sortSelect.value = 'oldest';
    sortSelect.dispatchEvent(new Event('change'));
    await delay(100);

    filtered = manager.getFilteredBookmarks();
    if (filtered[0].content !== 'AAA First alphabetically') {
        throw new Error('Oldest sort failed');
    }
    log('  ✓ Oldest sort works correctly', 'success');

    // Test alphabetical A-Z
    log('  Testing alphabetical sort (A-Z)...', 'info');
    sortSelect.value = 'az';
    sortSelect.dispatchEvent(new Event('change'));
    await delay(100);

    filtered = manager.getFilteredBookmarks();
    if (filtered[0].content !== 'AAA First alphabetically') {
        throw new Error('A-Z sort failed');
    }
    log('  ✓ Alphabetical A-Z sort works', 'success');
}

async function testEmptyStateDisplay() {
    const manager = getManager();

    log('  Verifying no bookmarks exist...', 'info');
    manager.clearAll();
    await delay(100);

    if (manager.getBookmarks().length !== 0) {
        throw new Error('Bookmarks not cleared');
    }

    // Check for empty state element
    const emptyState = elements.testFrame.contentDocument.getElementById('empty-state');
    if (!emptyState) {
        throw new Error('Empty state element not found');
    }

    if (emptyState.classList.contains('hidden')) {
        throw new Error('Empty state is hidden when it should be visible');
    }

    log('  ✓ Empty state is displayed', 'success');

    // Verify the message content
    const heading = emptyState.querySelector('h3');
    if (!heading || !heading.textContent.includes('No Bookmarks')) {
        throw new Error('Empty state heading incorrect');
    }

    log('  ✓ Empty state message is correct', 'success');
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

    // Auto-run tests on page load
    await waitForFrame();
    await delay(1000);
    log('Auto-starting tests...', 'info');
    runAllTests();
});
