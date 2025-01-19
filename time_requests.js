// ==UserScript==
// @name         Lichess Chat Time Request Handler
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Handles time addition requests in Lichess chat
// @match        https://lichess.org/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const DEBUG = true;
    const CLICK_DELAY_MS = 150;  // Delay between clicks in milliseconds
    const MAX_SECONDS = 300;     // Maximum allowed time addition in seconds
    const STORAGE_KEY = 'lichessTimeRequestsProcessed';  // localStorage key
    const debug = (...args) => DEBUG && console.log('[TimeRequest]', ...args);

    // Time request marker
    const TIME_TAG = '!t!';
    const TIME_INCREMENT = 15; // Lichess uses 15-second increments

    // Load processed messages from localStorage
    let processedMessages = new Set();
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            processedMessages = new Set(JSON.parse(stored));
        }
    } catch (e) {
        debug('Error loading processed messages:', e);
    }

    // Save processed messages to localStorage
    function saveProcessedMessages() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...processedMessages]));
        } catch (e) {
            debug('Error saving processed messages:', e);
        }
    }

    // Generate a unique ID for a message based on content and position
    function generateMessageId(node) {
        const content = node.nodeValue.trim();
        const parent = node.parentElement;
        const chatContainer = parent.closest('.mchat__messages');
        if (!chatContainer) return null;

        // Get all messages in the chat
        const messages = Array.from(chatContainer.querySelectorAll('*'));
        const messageIndex = messages.indexOf(parent);

        // Create a unique ID combining the message content and its position
        return `${content}:${messageIndex}`;
    }

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

    // Parse time request (e.g., "!t!+90" -> 90)
    function parseTimeRequest(text) {
        if (!text.startsWith(TIME_TAG)) return null;

        const timeStr = text.slice(TIME_TAG.length).trim();
        if (!timeStr.match(/^\+?\d+$/)) return null;

        const seconds = parseInt(timeStr.replace('+', ''), 10);
        if (isNaN(seconds) || seconds <= 0) return null;

        // Enforce maximum time limit
        return Math.min(seconds, MAX_SECONDS);
    }

    // Round up to nearest increment
    function roundToIncrement(seconds) {
        return Math.ceil(seconds / TIME_INCREMENT) * TIME_INCREMENT;
    }

    // Click the moretime button multiple times
    function addTime(seconds) {
        const moretimeBtn = document.querySelector('a.moretime');
        if (!moretimeBtn) {
            debug('No moretime button found');
            return;
        }

        const roundedSeconds = roundToIncrement(seconds);
        const clicks = roundedSeconds / TIME_INCREMENT;

        debug(`Adding ${roundedSeconds} seconds (${clicks} clicks with ${CLICK_DELAY_MS}ms delay)`);

        // Click the button multiple times with configured delay
        let clickCount = 0;
        const clickInterval = setInterval(() => {
            moretimeBtn.click();
            clickCount++;

            if (clickCount >= clicks) {
                clearInterval(clickInterval);
            }
        }, CLICK_DELAY_MS);

        return roundedSeconds;
    }

    // Process a time request node
    function processTimeRequest(node) {
        // Generate unique ID for this message
        const messageId = generateMessageId(node);
        if (!messageId) return;

        // Skip if already processed
        if (processedMessages.has(messageId)) {
            debug('Skipping already processed message:', messageId);
            return;
        }

        const parentEl = node.parentElement;
        if (!parentEl) return;

        const seconds = parseTimeRequest(node.nodeValue);
        if (!seconds) return;

        // Mark as processed both in DOM and storage
        processedMessages.add(messageId);
        saveProcessedMessages();

        // Add the time and get actual amount added
        const addedSeconds = addTime(seconds);

        // Visual feedback with amount actually added
        const originalColor = parentEl.style.color;
        const wasLimited = seconds > MAX_SECONDS;

        parentEl.style.color = wasLimited ? 'orange' : 'green';
        if (wasLimited) {
            // Add a note about the limit
            const limitNote = document.createElement('span');
            limitNote.textContent = ` (limited to ${addedSeconds}s)`;
            limitNote.style.color = 'orange';
            limitNote.style.fontSize = '0.8em';
            parentEl.appendChild(limitNote);
        }

        setTimeout(() => {
            parentEl.style.color = originalColor;
        }, 1000);
    }

    // Main scanner function
    function periodicTimeScanner() {
        setInterval(() => {
            const textNodes = findTextNodesContaining(TIME_TAG, document.body);
            textNodes.forEach(node => processTimeRequest(node));
        }, 1000);
    }

    // Cleanup old stored messages periodically (every hour)
    function cleanupOldMessages() {
        setInterval(() => {
            processedMessages.clear();
            saveProcessedMessages();
            debug('Cleared processed messages cache');
        }, 60 * 60 * 1000); // 1 hour
    }

    // Initialize
    function init() {
        periodicTimeScanner();
        cleanupOldMessages();
        debug('Initialized Time Request Handler');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
