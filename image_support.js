// ==UserScript==
// @name         Lichess Chat Image Inliner
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Renders image URLs inline in Lichess chat
// @match        https://lichess.org/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Toggle debug for console output
    const DEBUG = true;
    const debug = (...args) => DEBUG && console.log('[ImageInline]', ...args);

    // Image tag marker
    const IMAGE_TAG = '!i!u|';

    // Helper to find text nodes containing our marker
    function findTextNodesContaining(substring, root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const results = [];
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeValue.includes(substring)) results.push(node);
        }
        return results;
    }

    // Check if URL is valid and points to an image
    function isValidImageUrl(url) {
        try {
            const parsed = new URL(url);
            const ext = parsed.pathname.toLowerCase();
            return ext.endsWith('.jpg') ||
                   ext.endsWith('.jpeg') ||
                   ext.endsWith('.png') ||
                   ext.endsWith('.gif') ||
                   ext.endsWith('.webp');
        } catch {
            return false;
        }
    }

    // Extract URL from our tagged format
    function extractUrl(text) {
        if (!text.startsWith(IMAGE_TAG)) return null;
        const url = text.slice(IMAGE_TAG.length).trim();
        return isValidImageUrl(url) ? url : null;
    }

    // Create image element with some basic styling
    function createImageElement(url) {
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '200px';
        img.style.maxHeight = '200px';
        img.style.border = '1px solid #666';
        img.style.borderRadius = '4px';
        img.style.margin = '4px 0';
        img.style.cursor = 'pointer';

        // Click to open in new tab
        img.addEventListener('click', () => {
            window.open(url, '_blank');
        });

        return img;
    }

    // Main scanner function
    function periodicImageScanner() {
        setInterval(() => {
            const textNodes = findTextNodesContaining(IMAGE_TAG, document.body);

            textNodes.forEach(node => {
                const parentEl = node.parentElement;
                if (!parentEl) return;

                // Skip if we've already processed this node
                if (parentEl.dataset.imageInlined) return;

                // Get the URL and validate it
                const url = extractUrl(node.nodeValue);
                if (!url) return;

                // Create and insert the image
                const img = createImageElement(url);

                // Replace the text node with both the original text and the image
                const container = document.createElement('div');
                container.appendChild(document.createTextNode(node.nodeValue));
                container.appendChild(document.createElement('br'));
                container.appendChild(img);

                // Mark as processed
                container.dataset.imageInlined = 'true';

                // Replace the original node
                node.replaceWith(container);

                debug('Inlined image:', url);
            });
        }, 2000);
    }

    // Initialize
    function init() {
        periodicImageScanner();
        debug('Initialized Image Inliner');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
