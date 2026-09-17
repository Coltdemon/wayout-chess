import chess
import chess.engine

# Path to Stockfish
STOCKFISH_PATH = r"D:\AI-Chess\Stockfish\stockfish\stockfish-windows-x86-64-universal.exe"

# How long Stockfish thinks about each move
AI_TIME_LIMIT = 2.0


def play_game():

    board = chess.Board()

    # Start Stockfish
    engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

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

    while not board.is_game_over():

        print(board)
        print()

        # Your turn
        if board.turn == chess.WHITE:

            move_text = input("Your move: ")

            try:
                move = board.parse_san(move_text)

                if move in board.legal_moves:
                    print("You played:", board.san(move))
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

        # Stockfish's turn
        else:

            print("Stockfish is thinking...")

            result = engine.play(
                board,
                chess.engine.Limit(time=AI_TIME_LIMIT)
            )

            print("Stockfish plays:", board.san(result.move))

            board.push(result.move)

            print()

    print()
    print("========================================")
    print("              GAME OVER")
    print("========================================")
    print()
    print("Result:", board.result())
    print()

    engine.quit()


if __name__ == "__main__":
    play_game()