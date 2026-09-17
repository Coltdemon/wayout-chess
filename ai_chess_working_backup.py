import chess
import chess.engine

# ==========================================
# CONFIGURATION
# ==========================================

STOCKFISH_PATH = r"D:\AI-Chess\Stockfish\stockfish\stockfish-windows-x86-64-universal.exe"

AI_TIME_LIMIT = 2.0
ANALYSIS_TIME_LIMIT = 1.0

# Evaluation drop thresholds
MISTAKE_THRESHOLD = 150
BLUNDER_THRESHOLD = 300


# ==========================================
# ANALYZE YOUR MOVE
# ==========================================

def analyze_move(board_before, move):

    print("  Analyzing this move...")

    # Start a separate Stockfish process for analysis
    analysis_engine = chess.engine.SimpleEngine.popen_uci(
        STOCKFISH_PATH
    )

    try:

        # Analyze position BEFORE your move
        before_info = analysis_engine.analyse(
            board_before,
            chess.engine.Limit(time=ANALYSIS_TIME_LIMIT)
        )

        before_score = before_info["score"].pov(
            chess.WHITE
        ).score(mate_score=10000)

        # Stockfish's recommended move
        best_move = before_info["pv"][0]

        best_move_san = board_before.san(best_move)

        # Create position AFTER your move
        board_after = board_before.copy()
        board_after.push(move)

        # Analyze position AFTER your move
        after_info = analysis_engine.analyse(
            board_after,
            chess.engine.Limit(time=ANALYSIS_TIME_LIMIT)
        )

        after_score = after_info["score"].pov(
            chess.WHITE
        ).score(mate_score=10000)

        # You are White.
        # If this number is positive, your position became worse.
        evaluation_drop = before_score - after_score

        return (
            best_move_san,
            before_score,
            after_score,
            evaluation_drop
        )

    finally:

        # Close the temporary Stockfish process
        analysis_engine.quit()


# ==========================================
# PLAY CHESS
# ==========================================

def play_game():

    board = chess.Board()

    # Start Stockfish for playing
    engine = chess.engine.SimpleEngine.popen_uci(
        STOCKFISH_PATH
    )

    # Store your moves
    game_history = []

    print()
    print("========================================")
    print("          AI CHESS COACH")
    print("========================================")
    print()
    print("You are WHITE.")
    print("Stockfish is BLACK.")
    print()
    print("Enter moves such as:")
    print("  e4")
    print("  Nf3")
    print("  Bc4")
    print("  O-O")
    print()
    print("========================================")
    print()

    try:

        while not board.is_game_over():

            print(board)
            print()

            # ==================================
            # YOUR TURN
            # ==================================

            if board.turn == chess.WHITE:

                move_text = input("Your move: ")

                try:

                    move = board.parse_san(move_text)

                    if move in board.legal_moves:

                        san_move = board.san(move)

                        # Save the board BEFORE your move
                        board_before = board.copy()

                        print("You played:", san_move)

                        game_history.append({
                            "player": "You",
                            "move": san_move,
                            "board_before": board_before
                        })

                        board.push(move)

                    else:

                        print("Illegal move.")
                        continue

                except ValueError:

                    print()
                    print("Invalid move.")
                    print("Examples: e4, Nf3, Bc4, O-O")
                    print()
                    continue

            # ==================================
            # STOCKFISH TURN
            # ==================================

            else:

                print("Stockfish is thinking...")

                result = engine.play(
                    board,
                    chess.engine.Limit(
                        time=AI_TIME_LIMIT
                    )
                )

                san_move = board.san(result.move)

                print("Stockfish plays:", san_move)

                board.push(result.move)

                print()

    except KeyboardInterrupt:

        print()
        print("Game stopped.")

    finally:

        # Close the playing Stockfish process
        engine.quit()

    # ==========================================
    # GAME SUMMARY
    # ==========================================

    print()
    print("========================================")
    print("              GAME SUMMARY")
    print("========================================")
    print()

    print("Result:", board.result())
    print()

    # ==========================================
    # ANALYZE YOUR MOVES
    # ==========================================

    if game_history:

        print("========================================")
        print("          YOUR MOVE ANALYSIS")
        print("========================================")
        print()

        mistakes_found = 0

        for number, move_data in enumerate(
            game_history,
            start=1
        ):

            board_before = move_data["board_before"]

            # Re-create the move from SAN
            move = board_before.parse_san(
                move_data["move"]
            )

            try:

                (
                    best_move,
                    before_score,
                    after_score,
                    evaluation_drop
                ) = analyze_move(
                    board_before,
                    move
                )

                print(
                    f"Move {number}: "
                    f"{move_data['move']}"
                )

                if evaluation_drop >= BLUNDER_THRESHOLD:

                    print("  !!! BLUNDER !!!")
                    print(
                        "  Best move:",
                        best_move
                    )

                    print(
                        "  Evaluation drop:",
                        f"{evaluation_drop / 100:.2f}"
                    )

                    mistakes_found += 1

                elif evaluation_drop >= MISTAKE_THRESHOLD:

                    print("  ⚠ MISTAKE")
                    print(
                        "  Best move:",
                        best_move
                    )

                    print(
                        "  Evaluation drop:",
                        f"{evaluation_drop / 100:.2f}"
                    )

                    mistakes_found += 1

                else:

                    print(
                        "  ✓ No major mistake detected."
                    )

                print()

            except Exception as error:

                print(
                    f"  Could not analyze this move: "
                    f"{error}"
                )

                print()

        print("========================================")
        print("              FINAL REPORT")
        print("========================================")
        print()

        print(
            "Your moves analyzed:",
            len(game_history)
        )

        print(
            "Significant mistakes:",
            mistakes_found
        )

    else:

        print("No moves were played.")

    print()


# ==========================================
# START PROGRAM
# ==========================================

if __name__ == "__main__":

    play_game()