# AI Chess Coach — Claude Code Master Prompt / Project Handoff

## Project

I am building an **AI Chess Coach** application.

Project root:

```text
D:\AI-Chess
```

Folders:

```text
D:\AI-Chess\frontend
D:\AI-Chess\backend
D:\AI-Chess\Stockfish
D:\AI-Chess\frontend_working_backup
D:\AI-Chess\frontend_before_captured_pieces
```

### Stack

- Frontend: React + Vite
- Backend: FastAPI + Python
- Frontend chess rules: `chess.js`
- Backend chess rules: `python-chess`
- Chess engine: Stockfish
- `react-chessboard`: 5.12.1
- Node.js: 22.23.2
- npm: 10.9.8
- Vite: 8.3.0
- Frontend: port `5174`
- Backend: port `8000`

Stockfish:

```text
D:\AI-Chess\Stockfish\stockfish\stockfish-windows-x86-64-universal.exe
```

Run frontend:

```powershell
cd D:\AI-Chess\frontend
npm run dev -- --port 5174
```

Run backend:

```powershell
cd D:\AI-Chess\backend
python -m uvicorn main:app --reload --port 8000
```

---

# IMPORTANT INSTRUCTIONS FOR CLAUDE CODE

You are taking over an **existing working project**.

## DO NOT:

- Start from scratch.
- Rewrite the application into a simplified demo.
- Remove working features.
- Randomly redesign the UI.
- Replace working chess logic unnecessarily.
- Change ports without being asked.
- Move project folders.
- Add unnecessary libraries.
- Assume a feature works merely because the code compiles.

## ALWAYS:

1. Inspect the existing files before modifying them.
2. Understand the current architecture.
3. Preserve all working functionality.
4. Make the smallest sensible change for the requested feature.
5. Test the feature.
6. Test important existing features after major changes.
7. Fix regressions before moving forward.
8. Follow the roadmap in order.
9. Prefer complete, reliable implementations over short code.
10. Keep the code maintainable.

If modifying `App.jsx`, preserve the entire existing functionality unless there is a deliberate reason to change it.

---

# CURRENT STATUS

The application already has a substantial Phase 1 implementation.

The following features have been implemented and tested:

- AI vs Stockfish
- Two-player local mode
- New AI Game
- New Two Player Game
- Restart
- Drag-and-drop
- Click-to-move
- Legal move detection
- Legal move highlighting
- Capture highlighting
- Captures
- Captured pieces display
- Capture animation
- Move history
- Check detection
- Checkmate detection
- Stalemate detection
- Draw detection
- Promotion UI
- Castling
- En passant
- AI thinking state
- Game-over state

The user has specifically tested and confirmed:

- Promotion works
- Castling works
- En passant works
- Captures work
- Move history works
- Check/checkmate/draw work

**Do not break these features.**

---

# CURRENT UI

Board:

```text
560px
```

Captured-piece tray:

```text
220px
```

Gap:

```text
18px
```

Page padding:

```text
30px 3vw
```

The board should have no unwanted outer border/shadow:

```jsx
boardStyle: {
    border: "none",
    boxShadow: "none",
}
```

The layout has:

```text
Chess Board → Captured Pieces → AI Coach panel
```

The AI Coach panel can use flexible width up to approximately 650px.

---

# LEGAL MOVE HIGHLIGHTING

Normal legal move:

```text
rgba(80, 200, 120, 0.45)
```

Capture:

```text
rgba(255, 80, 80, 0.30)
```

Selected square:

```text
rgba(255, 215, 0, 0.55)
```

Highlights cover the whole target square.

Preserve this behavior.

---

# CAPTURED PIECES

Captured pieces are displayed beside the board.

Captured black pieces:

```text
background: #f3f4f6
piece: #111827
```

Captured white pieces:

```text
background: #111827
piece: #ffffff
```

Must correctly support:

- normal captures
- AI captures
- en passant captures

There was previously a bug where AI captures were not always detected. The fix matches Stockfish SAN against verbose legal moves on the board after the player's move.

**Preserve this logic.**

---

# CAPTURE ANIMATION

There is a flying captured-piece animation.

Important:

The flying capture element must be positioned relative to the **outer board + capture-area wrapper**, not the 560px inner board.

Outer wrapper:

```css
position: relative;
overflow: visible;
```

Animation uses:

```css
transform: translate3d(...);
will-change: transform, opacity;
```

Duration:

```text
1200ms
```

CSS keyframes are used.

React controls the start/end of the animation.

Do not break the animation when modifying the layout.

---

# MOVE HISTORY

Move history is stored in React state.

Format:

```text
1. e4 e5
2. Nf3 Nc6
3. Bb5 a6
```

Latest move is highlighted.

Works in:

- AI mode
- Two-player mode

Must reset on:

- New Game
- Restart

---

# CHECK / CHECKMATE / DRAW

Supported:

- Check
- Checkmate
- Stalemate
- Draw

Checked king receives a red highlight.

Current status examples:

```text
⚠️ Your king is in check!
```

```text
⚠️ White is in check!
```

```text
♔ Checkmate — Black wins!
```

```text
½–½ Stalemate — Draw
```

```text
½–½ Draw
```

After game over:

- board input is disabled
- no moves are accepted
- Stockfish is not called if the player's move already ends the game

---

# PROMOTION

Promotion has a UI.

Available:

```text
Queen
Rook
Bishop
Knight
```

Both must work:

- click-to-move promotion
- drag-and-drop promotion

Promotion cannot always default to queen.

The implementation supports a dynamic promotion piece.

---

# CASTLING

Castling is handled by `chess.js`.

Support:

- White kingside
- White queenside
- Black kingside
- Black queenside

Do not manually recreate chess legality unnecessarily.

---

# EN PASSANT

En passant is handled by `chess.js`.

The captured pawn must also be correctly reflected in the captured-piece tray.

The verbose move's en-passant flag is used to identify the captured pawn.

Preserve this.

---

# REACT-CHESSBOARD VERSION

Installed:

```text
react-chessboard 5.12.1
```

This version uses the `options={{ ... }}` API.

Correct pattern:

```jsx
<Chessboard
    options={{
        position: game.fen(),
        boardWidth: 560,
        onPieceClick: handlePieceClick,
        onSquareClick: handleSquareClick,
        onPieceDrop: handlePieceDrop,
        squareStyles: squareStyles,
        boardStyle: {
            border: "none",
            boxShadow: "none",
        },
        arePiecesDraggable: !gameOver && !isThinking,
    }}
/>
```

Do not accidentally use an older API.

---

# CURRENT FRONTEND ARCHITECTURE

`App.jsx` contains state/functions conceptually including:

```text
game
gameId
mode
status
isThinking
gameOver
selectedSquare
legalMoves
checkedKingSquare
capturedPieces
flyingCapture
moveHistory
promotionPending
undoStack
```

Important functions include:

```text
findCheckedKingSquare
updateGameStatus
startAIGame
startTwoPlayerGame
restartGame
getSquareCenter
animateCapture
saveUndoState
sendMoveToBackend
makeMove
handlePieceClick
handleSquareClick
handlePieceDrop
choosePromotion
undoMove
getPieceSymbol
getPromotionSymbol
```

Do not remove these concepts simply to shorten the file.

---

# BACKEND

Current backend:

```text
D:\AI-Chess\backend\main.py
```

Uses:

```python
import chess
import chess.engine

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
```

Stockfish:

```python
STOCKFISH_PATH = r"D:\AI-Chess\Stockfish\stockfish\stockfish-windows-x86-64-universal.exe"
```

AI time:

```python
AI_TIME_LIMIT = 2.0
```

Current endpoints:

```text
GET /
POST /game/new
POST /game/move
```

CORS allows:

```text
http://localhost:5174
http://127.0.0.1:5174
```

---

# IMPORTANT: UNDO BACKEND

The frontend Undo work has been started, but proper backend AI Undo still needs to be completed.

The original backend stores games approximately like:

```python
games[game_id] = board
```

For proper history, change the architecture to something like:

```python
games[game_id] = {
    "board": board,
    "history": [initial_fen]
}
```

The exact implementation can be improved if needed, but preserve correctness.

## AI Undo requirement

One AI turn consists of:

```text
Player move
+
Stockfish response
```

Therefore:

```text
Before:
Initial
White e4
Black e5
White Nf3
Black Nc6
```

One Undo should restore:

```text
Initial
White e4
Black e5
```

A second Undo:

```text
Initial
```

AI Undo must NOT leave the board at the position where the Stockfish response was simply removed while retaining the user's move incorrectly.

---

# TWO-PLAYER UNDO

In two-player mode:

```text
White move
Black move
White move
Black move
```

Undo one move at a time.

So one Undo removes one ply.

---

# BACKEND ENDPOINT

Implement:

```text
POST /game/undo
```

It should:

1. Find the game.
2. Restore the appropriate previous position.
3. Return the restored FEN.
4. Return appropriate game status.
5. Keep backend state synchronized with frontend state.

---

# UNDO MUST RESTORE

Undo should restore:

- board
- move history
- captured pieces
- check state
- game-over state
- selected square
- legal move highlights
- promotion state
- animation state
- backend board state in AI mode

---

# RESTART

Restart must create a completely fresh game.

AI mode:

```text
POST /game/new
```

Two-player:

```text
new Chess()
```

Reset:

- board
- move history
- captured pieces
- undo history
- check state
- game-over state
- selected square
- legal moves
- promotion state
- status
- animations

---

# AI MOVE FLOW

Expected AI flow:

```text
User moves
↓
Frontend validates move
↓
Frontend sends move to backend
↓
Backend validates move
↓
Backend updates board
↓
Backend checks game over
↓
If not over:
    ↓
Stockfish calculates
    ↓
Backend applies Stockfish move
    ↓
Frontend receives:
    your_move
    stockfish_move
    fen
    game_over
    result
    ↓
Frontend updates UI
```

Do not run a second Stockfish engine in React.

---

# TWO-PLAYER FLOW

Two-player mode is local.

```text
White
↓
Black
↓
White
↓
Black
```

No Stockfish request.

Still support:

- legal moves
- captures
- promotion
- castling
- en passant
- check
- checkmate
- stalemate
- draw
- history
- undo
- restart

---

# IMMEDIATE TASK

The immediate priority is:

## FINISH AND VERIFY UNDO + RESTART

Before editing:

1. Inspect the current `frontend/src/App.jsx`.
2. Inspect `backend/main.py`.
3. Understand the existing implementation.
4. Do not overwrite working functionality with a simplified implementation.

Then:

### Step 1
Verify existing features.

### Step 2
Finish frontend Undo.

### Step 3
Implement backend history.

### Step 4
Implement:

```text
POST /game/undo
```

### Step 5
Make AI Undo revert the complete user + Stockfish turn.

### Step 6
Make Two Player Undo revert one move.

### Step 7
Make Restart completely reset everything.

### Step 8
Test everything.

---

# PHASE 1 TEST CHECKLIST

## Basic

- [ ] Start AI game
- [ ] e4 works
- [ ] Stockfish responds
- [ ] Start two-player
- [ ] e4 works
- [ ] e5 works

## Click

- [ ] Click piece
- [ ] Legal moves appear
- [ ] Click target
- [ ] Move executes

## Drag

- [ ] Legal drag works
- [ ] Illegal drag is rejected
- [ ] Illegal drag does not alter state

## Captures

- [ ] Human capture
- [ ] AI capture
- [ ] Correct captured piece
- [ ] Captured tray updates
- [ ] Capture animation works

## Promotion

- [ ] White promotion
- [ ] Black promotion
- [ ] Queen
- [ ] Rook
- [ ] Bishop
- [ ] Knight
- [ ] Click promotion
- [ ] Drag promotion

## Castling

- [ ] White kingside
- [ ] White queenside
- [ ] Black kingside
- [ ] Black queenside

## En Passant

- [ ] White en passant
- [ ] Black en passant
- [ ] Captured pawn removed correctly
- [ ] Captured tray updates

## Check

- [ ] Check detected
- [ ] King highlighted
- [ ] Illegal move while in check rejected
- [ ] Check can be escaped

## Checkmate

- [ ] Checkmate detected
- [ ] Correct winner
- [ ] Board locked

## Draw

- [ ] Stalemate
- [ ] Other supported draw conditions

## History

- [ ] Correct numbering
- [ ] White move
- [ ] Black move
- [ ] Latest move highlighted
- [ ] Reset on restart

## Undo

- [ ] Two-player undo
- [ ] AI undo
- [ ] AI undo removes both player + Stockfish move
- [ ] Multiple undos
- [ ] Captures restored
- [ ] Move history restored
- [ ] Check restored
- [ ] Game-over state restored

## Restart

- [ ] AI restart
- [ ] Two-player restart
- [ ] Everything resets

---

# PHASE 1 COMPLETION RULE

Do NOT move to Phase 2 until Phase 1 is stable.

Phase 1:

```text
Board
✓

Drag
✓

Click-to-move
✓

Legal highlights
✓

Captures
✓

Stockfish
✓

Two-player
✓

New Game
✓

Move History
✓

Captured Pieces
✓

Check
✓

Checkmate
✓

Draw
✓

Stalemate
✓

Promotion
✓

Castling
✓

En Passant
✓

Undo
→ finish

Restart
→ verify

Full chess-rule verification
→ finish
```

---

# PHASE 2 — AI COACH

Only after Phase 1 is complete.

Implement:

- engine evaluation
- best move
- blunder detection
- mistake detection
- good move detection
- move quality classification
- explanations
- game review
- accuracy
- statistics

Explanations must be based on actual chess/engine analysis, not random text.

Example:

```text
Good move.

You developed a piece and increased control of the center.
```

Example:

```text
Blunder.

This move allows Black to win material because the queen becomes vulnerable.
```

The actual explanation should be generated from the position and engine analysis.

---

# PHASE 3 — PROFESSIONAL UI

After functionality is stable:

- polished board
- polished pieces
- animations
- responsive desktop
- responsive mobile
- captured pieces
- move history
- check/checkmate animations
- polished controls
- theme
- typography
- loading states
- error states

Do not perform a giant redesign while core functionality is unstable.

---

# PHASE 4 — USER ACCOUNTS

Later:

- registration
- login
- authentication
- profiles
- saved games
- game history
- preferences

---

# PHASE 5 — ONLINE MULTIPLAYER

Desired flow:

### Player A

```text
Create Game
↓
Room created
↓
QR code displayed
```

### Player B

```text
Scan QR
↓
Game opens
↓
Automatically joins
```

Creator:

```text
White
```

Scanner:

```text
Black
```

QR should contain a room/game identifier or URL.

---

# PHASE 6 — WEBSOCKETS

Later:

- real-time moves
- opponent synchronization
- room state
- reconnect
- disconnect handling
- synchronized game state

---

# PHASE 7 — CHESS CLOCKS

Later:

- bullet
- blitz
- rapid
- custom clocks
- increment
- timeout

---

# PHASE 8 — DATABASE

Later store:

- users
- games
- moves
- positions
- ratings
- analysis
- statistics
- preferences

---

# PHASE 9 — RATING

Later:

- rating system
- rating changes
- player statistics

---

# PHASE 10 — AI TRAINING

Later:

- tactics
- puzzles
- openings
- endgames
- practice positions
- AI difficulty
- training modes

---

# PHASE 11 — PERSONALIZED AI COACH

Eventually:

- recurring mistakes
- opening weaknesses
- tactical weaknesses
- endgame weaknesses
- time-management patterns
- personalized recommendations
- training plans

---

# PHASE 12 — SECURITY

Later:

- authentication security
- authorization
- API security
- input validation
- abuse prevention
- rate limiting
- WebSocket security
- database security

---

# PHASE 13 — BACKEND DEPLOYMENT

Deploy backend publicly.

---

# PHASE 14 — FRONTEND DEPLOYMENT

Deploy frontend publicly.

---

# PHASE 15 — DOMAIN + HTTPS

Add:

- domain
- HTTPS
- production configuration

---

# PHASE 16 — MOBILE / PWA

Later:

- installable web app
- mobile UX
- touch controls
- responsive board

---

# PHASE 17 — TESTING

Eventually create automated tests for:

- chess rules
- API
- game state
- undo
- restart
- promotion
- castling
- en passant
- checkmate
- draws
- multiplayer
- authentication
- AI analysis

---

# PHASE 18 — MONITORING

Later:

- error logging
- performance monitoring
- uptime
- analytics
- backups

---

# PHASE 19 — LAUNCH

Final:

- production deployment
- domain
- HTTPS
- testing
- monitoring
- backups
- documentation
- launch

---

# DEVELOPMENT WORKFLOW

For every new feature:

```text
INSPECT
↓
UNDERSTAND
↓
PLAN
↓
IMPLEMENT
↓
TEST
↓
FIX REGRESSIONS
↓
VERIFY
↓
MOVE TO NEXT FEATURE
```

If something breaks:

```text
STOP
↓
IDENTIFY REGRESSION
↓
FIX IT
↓
RE-TEST OLD FEATURE
↓
CONTINUE
```

Never knowingly leave an old feature broken for a future phase.

---

# BACKUPS

Existing:

```text
D:\AI-Chess\frontend_working_backup
D:\AI-Chess\frontend_before_captured_pieces
```

The project is not currently a Git repository.

Before a major architectural change, create a local backup of affected files if appropriate.

---

# FINAL MASTER INSTRUCTION

This is an existing AI Chess Coach project that has already had significant development work.

**Do not start over.**

Continue from the current files.

The immediate job is:

```text
1. Finish Undo
2. Finish Restart verification
3. Complete Phase 1 chess-rule verification
4. Only then begin Phase 2 AI Coach
```

The ultimate goal is a professional AI chess platform with:

```text
Correct Chess Rules
+
Stockfish
+
AI Coaching
+
Game Review
+
Statistics
+
Online Multiplayer
+
QR Room Joining
+
WebSockets
+
Clocks
+
Accounts
+
Ratings
+
Personalized Training
+
Production Deployment
```

Build it incrementally and carefully.
