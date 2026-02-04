// Service Worker - Minimal implementation
// This file exists to prevent 404 errors in the browser console

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', () => {
    // Do nothing
});
