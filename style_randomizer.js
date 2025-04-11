// ==UserScript==
// @name         Lichess Style Randomizer
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Adds buttons to randomize Lichess piece sets and board backgrounds with additional auto-randomize options
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

    // Auto-randomize settings
    let randomizeOnMyMove = false;
    let randomizeOnOpponentMove = false;

    // Game state tracking
    let lastMoveElement = null;
    let lastMoveData = null;
    let lastMoveCount = 0;
    let myColor = null;
    let weAreWhite = true;
    let currentPly = -1;

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

        // IMPORTANT: Don't force a board redraw, as this can cause pieces to get stuck
        // Instead, rely on Lichess's own style update mechanisms
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
        const myMoveCheck = document.getElementById('randomize-my-move');
        const opponentMoveCheck = document.getElementById('randomize-opponent-move');

        if (backBtn) {
            backBtn.disabled = currentStyleIndex <= 0;
        }

        if (nextBtn) {
            nextBtn.disabled = currentStyleIndex >= styleHistory.length - 1;
        }

        if (myMoveCheck) {
            myMoveCheck.checked = randomizeOnMyMove;
        }

        if (opponentMoveCheck) {
            opponentMoveCheck.checked = randomizeOnOpponentMove;
        }
    }

    // Detect if we're playing as black or white
    function detectPlayerColor() {
        // First check the board orientation
        const boardElement = document.querySelector('.cg-wrap');
        if (boardElement) {
            if (boardElement.classList.contains('orientation-white')) {
                weAreWhite = true;
                console.log('[Style Randomizer] Detected playing as White');
                return;
            } else if (boardElement.classList.contains('orientation-black')) {
                weAreWhite = false;
                console.log('[Style Randomizer] Detected playing as Black');
                return;
            }
        }
    }

    // Get the current move count by counting the move elements
    function getActualMoveCount() {
        // Look for move elements (different in different page layouts)
        const moveElements = document.querySelectorAll('kwdb');
        if (moveElements.length > 0) {
            return moveElements.length;
        }

        // Try alternate selectors if the above didn't work
        const altMoveElements = document.querySelectorAll('l4x kwdb, l4x move');
        if (altMoveElements.length > 0) {
            return altMoveElements.length;
        }

        return 0;
    }

    // Check if a move has been made
    function checkForMoves() {
        // Get the current move count
        const currentMoveCount = getActualMoveCount();

        // If the move count has changed
        if (currentMoveCount > lastMoveCount) {
            // A move has been made
            const movesMade = currentMoveCount - lastMoveCount;

            // Update our tracking variable
            lastMoveCount = currentMoveCount;

            // Get the current ply (half-move) count
            currentPly += movesMade;

            // Determine if it was my move or opponent's move based on who is moving now
            // In chess, white moves on even plies (0, 2, 4...) and black on odd plies (1, 3, 5...)
            // We need to find out if the current turn belongs to us or opponent

            // First determine whose turn it is now (after the observed move)
            // If currentPly is even, it's white's turn; if odd, it's black's turn
            const isWhiteTurn = (currentPly % 2 === 0);

            // Now determine if the player who just moved was us or opponent
            // If it's white's turn now, black just moved, and vice versa
            const wasWhiteMove = !isWhiteTurn; // If white's turn now, black just moved

            // Check if it was my move by comparing my color with who just moved
            const wasMyMove = (weAreWhite === wasWhiteMove);

            console.log(`[Style Randomizer] Move detected: Current ply ${currentPly}, ${wasWhiteMove ? 'White' : 'Black'} just moved, ${wasMyMove ? 'My move' : 'Opponent move'}`);

            // Trigger randomize based on settings
            if (wasMyMove && randomizeOnMyMove) {
                randomizeStyle();
            } else if (!wasMyMove && randomizeOnOpponentMove) {
                randomizeStyle();
            }
        }
    }

    // Toggle randomize on my move
    function toggleRandomizeOnMyMove() {
        randomizeOnMyMove = !randomizeOnMyMove;
        updateButtonStates();
    }

    // Toggle randomize on opponent move
    function toggleRandomizeOnOpponentMove() {
        randomizeOnOpponentMove = !randomizeOnOpponentMove;
        updateButtonStates();
    }

    // Add CSS for the buttons
    GM_addStyle(`
        #style-randomizer-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 5px;
            z-index: 999;
            background: rgba(32, 30, 27, 0.8);
            border-radius: 5px;
            padding: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        }

        #style-randomizer-buttons {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        #style-randomizer-options {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
            margin-top: 5px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 5px;
            width: 100%;
        }

        .style-option {
            display: flex;
            align-items: center;
            gap: 5px;
            color: #fff;
            font-size: 12px;
            width: 100%;
        }

        .style-option input {
            margin: 0;
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
    function createInterface() {
        const container = document.createElement('div');
        container.id = 'style-randomizer-container';

        // Buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.id = 'style-randomizer-buttons';

        // Create navigation buttons
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

        // Add buttons to the buttons container
        buttonsContainer.appendChild(backBtn);
        buttonsContainer.appendChild(randomizeBtn);
        buttonsContainer.appendChild(nextBtn);

        // Create options container
        const optionsContainer = document.createElement('div');
        optionsContainer.id = 'style-randomizer-options';

        // Create my move option
        const myMoveOption = document.createElement('div');
        myMoveOption.className = 'style-option';

        const myMoveCheck = document.createElement('input');
        myMoveCheck.type = 'checkbox';
        myMoveCheck.id = 'randomize-my-move';
        myMoveCheck.checked = randomizeOnMyMove;
        myMoveCheck.addEventListener('change', toggleRandomizeOnMyMove);

        const myMoveLabel = document.createElement('label');
        myMoveLabel.htmlFor = 'randomize-my-move';
        myMoveLabel.textContent = 'Randomize on my move';

        myMoveOption.appendChild(myMoveCheck);
        myMoveOption.appendChild(myMoveLabel);

        // Create opponent move option
        const opponentMoveOption = document.createElement('div');
        opponentMoveOption.className = 'style-option';

        const opponentMoveCheck = document.createElement('input');
        opponentMoveCheck.type = 'checkbox';
        opponentMoveCheck.id = 'randomize-opponent-move';
        opponentMoveCheck.checked = randomizeOnOpponentMove;
        opponentMoveCheck.addEventListener('change', toggleRandomizeOnOpponentMove);

        const opponentMoveLabel = document.createElement('label');
        opponentMoveLabel.htmlFor = 'randomize-opponent-move';
        opponentMoveLabel.textContent = 'Randomize on opponent move';

        opponentMoveOption.appendChild(opponentMoveCheck);
        opponentMoveOption.appendChild(opponentMoveLabel);

        // Add options to the options container
        optionsContainer.appendChild(myMoveOption);
        optionsContainer.appendChild(opponentMoveOption);

        // Add containers to the main container
        container.appendChild(buttonsContainer);
        container.appendChild(optionsContainer);

        document.body.appendChild(container);
    }

    // Wait for the page to fully load
    window.addEventListener('load', function() {
        // Only create the buttons if we're on a page with a chess board
        if (document.querySelector('.cg-wrap')) {
            setTimeout(() => {
                // Initialize the interface
                createInterface();

                // Initialize style history with current style
                const currentPieceSet = document.body.getAttribute('data-piece-set') || 'cburnett';
                const currentBoardTheme = document.body.getAttribute('data-board') || 'brown';

                styleHistory.push({ pieceSet: currentPieceSet, boardTheme: currentBoardTheme });
                currentStyleIndex = 0;

                // Detect player color
                detectPlayerColor();

                // Initialize the move count and ply count
                lastMoveCount = getActualMoveCount();

                // Estimate current ply from move count
                // Each full move is 2 plies (white move + black move)
                // At the start of a game the currentPly should be 0
                // If we join mid-game, we need to calculate the proper ply
                currentPly = lastMoveCount * 2;

                // If the last move count is not 0 (we joined an ongoing game),
                // determine whose turn it is now
                if (lastMoveCount > 0) {
                    // Check whose turn it is based on move elements
                    // This assumes standard game where white goes first
                    const moveElements = document.querySelectorAll('kwdb, move');
                    if (moveElements.length > 0) {
                        // If the number of moves is odd, then black has the move
                        // If even, white has the move
                        const isWhiteTurn = (moveElements.length % 2 === 0);

                        // Adjust ply count based on current turn
                        // If it's white's turn, the ply is even (0, 2, 4...)
                        // If it's black's turn, the ply is odd (1, 3, 5...)
                        if (isWhiteTurn && currentPly % 2 !== 0) {
                            currentPly--;
                        } else if (!isWhiteTurn && currentPly % 2 === 0) {
                            currentPly--;
                        }
                    }
                }

                console.log(`[Style Randomizer] Initialized: ${weAreWhite ? 'Playing as White' : 'Playing as Black'}, starting at move ${lastMoveCount}, ply ${currentPly}`);

                // Set up monitoring for moves
                setInterval(checkForMoves, 500);

                // Also set up mutation observer for move list updates
                const observer = new MutationObserver(function() {
                    checkForMoves();
                });

                // Target the move list container
                const moveContainer = document.querySelector('l4x') || document.body;
                observer.observe(moveContainer, {
                    childList: true,
                    subtree: true
                });
            }, 1000); // Delay to ensure Lichess has fully initialized
        }
    });
})();
