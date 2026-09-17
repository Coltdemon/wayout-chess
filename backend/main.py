import os
import random
import string

import chess
import chess.engine

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


STOCKFISH_PATH = os.environ.get(
    "STOCKFISH_PATH",
    r"D:\AI-Chess\Stockfish\stockfish\stockfish-windows-x86-64-universal.exe"
)

AI_TIME_LIMIT = 2.0
COACH_TIME_LIMIT = 0.8


app = FastAPI(
    title="Wayout Chess",
    version="1.0"
)


DEFAULT_CORS_ORIGINS = [
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

CORS_ORIGINS = os.environ.get("CORS_ORIGINS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        [
            origin.strip()
            for origin in CORS_ORIGINS.split(",")
            if origin.strip()
        ]
        if CORS_ORIGINS
        else DEFAULT_CORS_ORIGINS
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


games = {}


class MoveRequest(BaseModel):
    game_id: str
    move: str


def score_to_cp(score):
    """
    Convert a Stockfish score into a numerical centipawn value.

    Positive = good for the player being evaluated.
    Negative = bad for the player being evaluated.

    Mate scores are converted to very large values so they can
    be compared with normal centipawn evaluations.
    """
    if score.is_mate():
        mate_in = score.mate()

        if mate_in is None:
            return 0

        if mate_in > 0:
            return 100000 - abs(mate_in)

        return -100000 + abs(mate_in)

    cp = score.score()

    if cp is None:
        return 0

    return cp


def format_evaluation(cp):
    """
    Convert centipawn evaluation into a human-readable number.
    """
    if cp >= 100000:
        return "Mate"

    if cp <= -100000:
        return "-Mate"

    return f"{cp / 100:.2f}"


def get_move_san(board, move):
    """
    Safely convert a chess move into SAN.
    """
    try:
        return board.san(move)
    except Exception:
        return str(move)


def classify_move(centipawn_loss, before_cp, after_cp):
    """
    Classify the player's move.

    The thresholds are intentionally simple for the first
    version of the coach.
    """

    if centipawn_loss <= 10:
        return "Excellent"

    if centipawn_loss <= 40:
        return "Good"

    if centipawn_loss <= 100:
        return "Inaccuracy"

    if centipawn_loss <= 250:
        return "Mistake"

    return "Blunder"


def build_coach_explanation(
    classification,
    best_move,
    centipawn_loss,
    before_cp,
    after_cp,
    player_move
):
    """
    Generate a simple human-readable explanation.

    This is deliberately rule-based for now.
    Later we can add a much more advanced natural-language
    explanation layer.
    """

    if classification == "Excellent":
        return (
            f"{player_move} was an excellent move. "
            f"You played very close to the best move."
        )

    if classification == "Good":
        return (
            f"{player_move} was a good move. "
            f"It kept the position in good shape, although "
            f"{best_move} was a little more precise."
        )

    if classification == "Inaccuracy":
        return (
            f"{player_move} was a slight inaccuracy. "
            f"The position became somewhat less favorable. "
            f"Stockfish preferred {best_move}."
        )

    if classification == "Mistake":
        return (
            f"{player_move} was a mistake. "
            f"You gave up around {centipawn_loss / 100:.2f} pawns of evaluation. "
            f"A stronger choice was {best_move}."
        )

    return (
        f"{player_move} was a blunder. "
        f"The evaluation dropped significantly after this move. "
        f"Stockfish preferred {best_move}."
    )


def analyze_player_move(board_before, board_after, player_move):
    """
    Analyze a player's move with Stockfish.

    Returns:
        classification
        best_move
        evaluation before
        evaluation after
        centipawn loss
        explanation
    """

    player_color = board_before.turn

    engine = chess.engine.SimpleEngine.popen_uci(
        STOCKFISH_PATH
    )

    try:
        before_result = engine.analyse(
            board_before,
            chess.engine.Limit(
                time=COACH_TIME_LIMIT
            )
        )

        before_score_object = before_result["score"].pov(
            player_color
        )

        before_cp = score_to_cp(
            before_score_object
        )

        principal_variation = before_result.get(
            "pv",
            []
        )

        best_move = None

        if principal_variation:
            best_move = principal_variation[0]

        if best_move is not None:
            best_move_san = get_move_san(
                board_before,
                best_move
            )
        else:
            best_move_san = "No move available"

        after_result = engine.analyse(
            board_after,
            chess.engine.Limit(
                time=COACH_TIME_LIMIT
            )
        )

        after_score_object = after_result["score"].pov(
            player_color
        )

        after_cp = score_to_cp(
            after_score_object
        )

    finally:
        engine.quit()

    centipawn_loss = max(
        0,
        before_cp - after_cp
    )

    classification = classify_move(
        centipawn_loss,
        before_cp,
        after_cp
    )

    explanation = build_coach_explanation(
        classification,
        best_move_san,
        centipawn_loss,
        before_cp,
        after_cp,
        player_move
    )

    return {
        "classification": classification,
        "best_move": best_move_san,
        "evaluation_before": format_evaluation(
            before_cp
        ),
        "evaluation_after": format_evaluation(
            after_cp
        ),
        "centipawn_loss": centipawn_loss,
        "explanation": explanation,
    }


@app.get("/")
def home():
    return {
        "message": "Wayout Chess backend is running!"
    }


@app.post("/game/new")
def new_game():
    game_id = str(len(games) + 1)

    board = chess.Board()

    games[game_id] = {
        "board": board,
        "history": [board.copy()]
    }

    return {
        "game_id": game_id,
        "fen": board.fen(),
        "turn": "white",
        "game_over": False
    }


@app.post("/game/move")
def play_move(request: MoveRequest):

    if request.game_id not in games:
        return {
            "error": "Game not found"
        }

    game_data = games[request.game_id]
    board = game_data["board"]

    try:
        player_move = board.parse_san(
            request.move
        )
    except ValueError:
        return {
            "error": "Invalid chess move"
        }

    if player_move not in board.legal_moves:
        return {
            "error": "Illegal chess move"
        }

    # Only allow White to be controlled by the player
    if board.turn != chess.WHITE:
        return {
            "error": "It is not your turn"
        }

    # ---------------------------------------------------------
    # SAVE POSITION BEFORE PLAYER MOVE
    # ---------------------------------------------------------

    board_before_player_move = board.copy()

    # ---------------------------------------------------------
    # PLAYER MOVE
    # ---------------------------------------------------------

    player_move_san = board.san(
        player_move
    )

    board.push(
        player_move
    )

    board_after_player_move = board.copy()

    # ---------------------------------------------------------
    # COACH ANALYSIS
    # ---------------------------------------------------------

    coach_analysis = None

    try:
        coach_analysis = analyze_player_move(
            board_before_player_move,
            board_after_player_move,
            player_move_san
        )
    except Exception as error:
        print(
            "Coach analysis error:",
            error
        )

    # ---------------------------------------------------------
    # SAVE PLAYER POSITION
    # ---------------------------------------------------------

    game_data["history"].append(
        board.copy()
    )

    # ---------------------------------------------------------
    # PLAYER CHECKMATE / DRAW
    # ---------------------------------------------------------

    if board.is_game_over():

        game_data["board"] = board

        return {
            "your_move": player_move_san,
            "stockfish_move": None,
            "fen": board.fen(),
            "game_over": True,
            "result": board.result(),
            "coach": coach_analysis
        }

    # ---------------------------------------------------------
    # STOCKFISH MOVE
    # ---------------------------------------------------------

    engine = chess.engine.SimpleEngine.popen_uci(
        STOCKFISH_PATH
    )

    try:

        result = engine.play(
            board,
            chess.engine.Limit(
                time=AI_TIME_LIMIT
            )
        )

        stockfish_move_san = board.san(
            result.move
        )

        board.push(
            result.move
        )

    finally:
        engine.quit()

    # ---------------------------------------------------------
    # SAVE STOCKFISH POSITION
    # ---------------------------------------------------------

    game_data["history"].append(
        board.copy()
    )

    game_data["board"] = board

    return {
        "your_move": player_move_san,
        "stockfish_move": stockfish_move_san,
        "fen": board.fen(),
        "game_over": board.is_game_over(),
        "result": board.result(),
        "coach": coach_analysis
    }


@app.post("/game/undo")
def undo_move(request: MoveRequest):

    if request.game_id not in games:
        return {
            "error": "Game not found"
        }

    game_data = games[request.game_id]

    history = game_data["history"]

    # We need at least the initial position.
    if len(history) <= 1:
        return {
            "error": "Nothing to undo"
        }

    # Remove current position.
    history.pop()

    # In AI mode the history contains:
    #
    # initial position
    # player move
    # Stockfish move
    #
    # So remove the player's move position too.
    if len(history) > 1:
        history.pop()

    board = history[-1].copy()

    game_data["board"] = board

    return {
        "fen": board.fen(),
        "game_over": board.is_game_over(),
        "result": board.result()
    }


# ---------------------------------------------------------------
# ONLINE MULTIPLAYER (QR-JOIN ROOMS)
# ---------------------------------------------------------------

rooms = {}


def generate_room_id():
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choices(alphabet, k=6))


@app.post("/room/new")
def new_room():
    room_id = generate_room_id()

    while room_id in rooms:
        room_id = generate_room_id()

    board = chess.Board()

    rooms[room_id] = {
        "board": board,
        "white": None,
        "black": None,
    }

    return {
        "room_id": room_id
    }


async def broadcast_to_room(room, message):
    for socket in (room.get("white"), room.get("black")):
        if socket is not None:
            try:
                await socket.send_json(message)
            except Exception:
                pass


async def broadcast_room_status(room):
    await broadcast_to_room(room, {
        "type": "status",
        "white_connected": room.get("white") is not None,
        "black_connected": room.get("black") is not None,
    })


@app.websocket("/ws/room/{room_id}")
async def room_websocket(websocket: WebSocket, room_id: str):
    if room_id not in rooms:
        await websocket.close(code=4404)
        return

    room = rooms[room_id]

    if room["white"] is not None and room["black"] is not None:
        await websocket.close(code=4403)
        return

    await websocket.accept()

    if room["white"] is None:
        color = "white"
        room["white"] = websocket
    else:
        color = "black"
        room["black"] = websocket

    await websocket.send_json({
        "type": "joined",
        "color": color,
        "fen": room["board"].fen(),
    })

    await broadcast_room_status(room)

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") != "move":
                continue

            board = room["board"]

            turn_color = "white" if board.turn == chess.WHITE else "black"

            if color != turn_color:
                await websocket.send_json({
                    "type": "error",
                    "message": "It is not your turn",
                })
                continue

            try:
                move = board.parse_san(data.get("move", ""))
            except ValueError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid move",
                })
                continue

            if move not in board.legal_moves:
                await websocket.send_json({
                    "type": "error",
                    "message": "Illegal move",
                })
                continue

            board.push(move)

            await broadcast_to_room(room, {
                "type": "move",
                "move": data.get("move"),
                "fen": board.fen(),
                "game_over": board.is_game_over(),
                "result": board.result() if board.is_game_over() else None,
            })

    except WebSocketDisconnect:
        if room.get("white") is websocket:
            room["white"] = None

        if room.get("black") is websocket:
            room["black"] = None

        await broadcast_room_status(room)