// ==UserScript==
// @name         Lichess URLifier
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Makes URLs in chat messages clickable
// @match        https://lichess.org/*
// @grant        none
// ==/UserScript==
(function() {
    'use strict';
    // Toggle debug for console output
    const DEBUG = true;
    const debug = (...args) => DEBUG && console.log('[URLLinker]', ...args);

    // URL regex pattern - matches common URL formats
    const URL_PATTERN = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

    // Helper to find text nodes containing URLs
    function findTextNodesContainingUrls(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const results = [];
        let node;

        while ((node = walker.nextNode())) {
            if (URL_PATTERN.test(node.nodeValue)) {
                results.push(node);
                URL_PATTERN.lastIndex = 0; // Reset regex state
            }
        }
        return results;
    }

    // Create link element with appropriate styling and security attributes
    function createLinkElement(url) {
        const link = document.createElement('a');
        link.href = url;
        link.textContent = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.color = '#2196F3';
        link.style.textDecoration = 'underline';
        link.style.wordBreak = 'break-all';
        return link;
    }

    // Replace URLs in text with clickable links
    function replaceUrlsWithLinks(node) {
        const text = node.nodeValue;
        const container = document.createElement('span');
        let lastIndex = 0;
        let match;

        URL_PATTERN.lastIndex = 0; // Reset regex state
        while ((match = URL_PATTERN.exec(text)) !== null) {
            // Add text before the URL
            if (match.index > lastIndex) {
                container.appendChild(
                    document.createTextNode(text.slice(lastIndex, match.index))
                );
            }

            // Add the URL as a link
            const url = match[0];
            const link = createLinkElement(url);
            container.appendChild(link);

            lastIndex = URL_PATTERN.lastIndex;
        }

        // Add any remaining text
        if (lastIndex < text.length) {
            container.appendChild(
                document.createTextNode(text.slice(lastIndex))
            );
        }

        return container;
    }

    // Main scanner function
    function periodicUrlScanner() {
        setInterval(() => {
            const textNodes = findTextNodesContainingUrls(document.body);
            textNodes.forEach(node => {
                const parentEl = node.parentElement;
                if (!parentEl) return;

                // Skip if we've already processed this node
                if (parentEl.dataset.urlLinked) return;

                // Replace text node with linked version
                const container = replaceUrlsWithLinks(node);
                container.dataset.urlLinked = 'true';
                node.replaceWith(container);
                debug('Linked URLs in text:', node.nodeValue);
            });
        }, 2000);
    }

    // Initialize
    function init() {
        periodicUrlScanner();
        debug('Initialized URL Linker');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
