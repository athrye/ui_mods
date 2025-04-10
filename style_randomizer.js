// ==UserScript==
// @name         Lichess Style Randomizer
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds buttons to randomize Lichess piece sets and board backgrounds
// @author       You
// @match        https://lichess.org/*
// @match        https://*.lichess.org/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Available piece sets and board backgrounds
    const pieceSets = [
        'cburnett', 'merida', 'alpha', 'pirouetti', 'chessnut', 'chess7',
        'reillycraig', 'fantasy', 'spatial', 'california', 'pixel', 'maestro',
        'fresca', 'cardinal', 'gioco', 'tatiana', 'staunty', 'governor',
        'dubrovny', 'icpieces', 'shapes', 'letter'
    ];

    const boardThemes = [
        'blue', 'blue2', 'blue3', 'blue-marble', 'canvas', 'wood', 'wood2',
        'wood3', 'wood4', 'maple', 'maple2', 'brown', 'leather', 'green',
        'marble', 'green-plastic', 'grey', 'metal', 'olive', 'newspaper',
        'purple', 'purple-diag', 'pink', 'ic', 'horsey'
    ];

    // Style history
    let styleHistory = [];
    let currentStyleIndex = -1;

    // Function to set piece set
    function setPieceSet(pieceSet) {
        // Get current asset URL from the page
        const assetUrl = document.body.getAttribute('data-asset-url') || 'https://lichess1.org';

        // Find the piece sprite element
        const pieceElem = document.getElementById('piece-sprite');
        if (pieceElem) {
            // Update the href with the new piece set
            pieceElem.setAttribute('href', `${assetUrl}/assets/piece-css/${pieceSet}.css`);

            // Also update data attribute to make it stick
            document.body.setAttribute('data-piece-set', pieceSet);
        }
    }

    // Function to set board theme
    function setBoardTheme(boardTheme) {
        // Update the data attribute for the board theme
        document.body.setAttribute('data-board', boardTheme);

        // Force a redraw of the board
        const board = document.querySelector('cg-board');
        if (board) {
            const currentDisplay = board.style.display;
            board.style.display = 'none';
            setTimeout(() => { board.style.display = currentDisplay; }, 0);
        }
    }

    // Function to randomly select a style and apply it
    function randomizeStyle() {
        const randomPieceSet = pieceSets[Math.floor(Math.random() * pieceSets.length)];
        const randomBoardTheme = boardThemes[Math.floor(Math.random() * boardThemes.length)];

        // Apply the new style
        setPieceSet(randomPieceSet);
        setBoardTheme(randomBoardTheme);

        // Update lichess preference cookie (optional - this helps make the change more permanent)
        try {
            const pref = JSON.parse(localStorage.getItem('lila-preferences') || '{}');
            pref.pieceSet = randomPieceSet;
            pref.theme = randomBoardTheme;
            localStorage.setItem('lila-preferences', JSON.stringify(pref));
        } catch (e) {
            console.error('Failed to save preferences:', e);
        }

        // Add to history
        if (currentStyleIndex < styleHistory.length - 1) {
            // If we're not at the end of the history, truncate it
            styleHistory = styleHistory.slice(0, currentStyleIndex + 1);
        }

        styleHistory.push({ pieceSet: randomPieceSet, boardTheme: randomBoardTheme });
        currentStyleIndex = styleHistory.length - 1;

        // Update button states
        updateButtonStates();

        console.log(`Style changed to: ${randomPieceSet} pieces on ${randomBoardTheme} board`);
    }

    // Function to go back to the previous style
    function previousStyle() {
        if (currentStyleIndex > 0) {
            currentStyleIndex--;
            const { pieceSet, boardTheme } = styleHistory[currentStyleIndex];
            setPieceSet(pieceSet);
            setBoardTheme(boardTheme);
            updateButtonStates();
        }
    }

    // Function to go forward to the next style
    function nextStyle() {
        if (currentStyleIndex < styleHistory.length - 1) {
            currentStyleIndex++;
            const { pieceSet, boardTheme } = styleHistory[currentStyleIndex];
            setPieceSet(pieceSet);
            setBoardTheme(boardTheme);
            updateButtonStates();
        }
    }

    // Function to update button states (enabled/disabled)
    function updateButtonStates() {
        const backBtn = document.getElementById('style-back-btn');
        const nextBtn = document.getElementById('style-next-btn');

        if (backBtn) {
            backBtn.disabled = currentStyleIndex <= 0;
        }

        if (nextBtn) {
            nextBtn.disabled = currentStyleIndex >= styleHistory.length - 1;
        }
    }

    // Add CSS for the buttons
    GM_addStyle(`
        #style-randomizer-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 5px;
            z-index: 999;
            background: rgba(32, 30, 27, 0.8);
            border-radius: 5px;
            padding: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        }

        #style-randomizer-container button {
            background: #4d4d4d;
            color: #fff;
            border: none;
            border-radius: 3px;
            padding: 5px 10px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        }

        #style-randomizer-container button:hover:not(:disabled) {
            background: #747474;
        }

        #style-randomizer-container button:disabled {
            opacity: 0.5;
            cursor: default;
        }

        #style-randomize-btn {
            background: #639b41 !important;
        }

        #style-randomize-btn:hover {
            background: #7bbd4f !important;
        }
    `);

    // Create and append the buttons
    function createButtons() {
        const container = document.createElement('div');
        container.id = 'style-randomizer-container';

        const backBtn = document.createElement('button');
        backBtn.id = 'style-back-btn';
        backBtn.textContent = '←';
        backBtn.title = 'Previous style';
        backBtn.disabled = true;
        backBtn.addEventListener('click', previousStyle);

        const randomizeBtn = document.createElement('button');
        randomizeBtn.id = 'style-randomize-btn';
        randomizeBtn.textContent = '🎲 Style';
        randomizeBtn.title = 'Randomize board style';
        randomizeBtn.addEventListener('click', randomizeStyle);

        const nextBtn = document.createElement('button');
        nextBtn.id = 'style-next-btn';
        nextBtn.textContent = '→';
        nextBtn.title = 'Next style';
        nextBtn.disabled = true;
        nextBtn.addEventListener('click', nextStyle);

        container.appendChild(backBtn);
        container.appendChild(randomizeBtn);
        container.appendChild(nextBtn);

        document.body.appendChild(container);
    }

    // Wait for the page to fully load
    window.addEventListener('load', function() {
        // Only create the buttons if we're on a page with a chess board
        if (document.querySelector('.cg-wrap')) {
            setTimeout(createButtons, 1000); // Delay to ensure Lichess has fully initialized
        }
    });
})();
