// ==UserScript==
// @name Lichess Chat Meme Converter
// @namespace http://tampermonkey.net/
// @version 0.1
// @description Converts meme tags to image URLs in Lichess chat
// @match https://lichess.org/*
// @grant none
// ==/UserScript==

(function() {
    'use strict';

    // Toggle debug for console output
    const DEBUG = true;
    const debug = (...args) => DEBUG && console.log('[MemeConverter]', ...args);

    // Meme tag marker and lookup table
    const MEME_TAG = '!meme!';
    const memeDatabase = {
        'pikachu': 'https://i.kym-cdn.com/entries/icons/mobile/000/027/475/Screen_Shot_2018-10-25_at_11.02.15_AM.jpg',
        'elmo': 'https://media.tenor.com/jDYNnTW0v9gAAAAM/hellfire.gif',
        'doge': 'https://upload.wikimedia.org/wikipedia/en/5/5f/Original_Doge_meme.jpg',
        'notsureif': 'https://media0.giphy.com/media/ANbD1CCdA3iI8/200w.gif?cid=6c09b9522tdf89y6y61he7b38pr74sunmv6d7flqyju1a5b3&ep=v1_gifs_search&rid=200w.gif&ct=g'
    };

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

    // Convert meme tag to image URL
    function convertMemeTag(text) {
        // Check if text contains a meme tag
        if (!text.includes(MEME_TAG)) return text;

        // Find all meme tags and replace them
        return text.replace(/!meme!(\w+)/g, (match, memeId) => {
            const url = memeDatabase[memeId.toLowerCase()];
            return url ? `!i!u|${url}` : match;
        });
    }

    // Main scanner function
    function periodicMemeScanner() {
        setInterval(() => {
            const textNodes = findTextNodesContaining(MEME_TAG, document.body);
            textNodes.forEach(node => {
                const parentEl = node.parentElement;
                if (!parentEl) return;

                // Skip if we've already processed this node
                if (parentEl.dataset.memeConverted) return;

                // Convert meme tags to image URLs
                const newText = convertMemeTag(node.nodeValue);

                // Only replace if we actually made a conversion
                if (newText !== node.nodeValue) {
                    node.nodeValue = newText;
                    parentEl.dataset.memeConverted = 'true';
                    debug('Converted meme tag:', newText);
                }
            });
        }, 2000);
    }

    // Initialize function
    function init() {
        periodicMemeScanner();
        debug('Initialized Meme Converter');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
