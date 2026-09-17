import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { QRCodeSVG } from "qrcode.react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";
const BOARD_SIZE = 560;
const CAPTURE_WIDTH = 220;
const GAP = 18;

// ============================================================
// PROMOTION PIECE ICON
// Uses SVG instead of Unicode so pieces can never appear blank.
// ============================================================

function PromotionPieceIcon({ color, type }) {
  const isWhite = color === "w";

  const fill = isWhite ? "#ffffff" : "#111827";
  const stroke = isWhite ? "#111827" : "#000000";

  const commonProps = {
    fill,
    stroke,
    strokeWidth: 1.8,
    strokeLinejoin: "round",
    strokeLinecap: "round",
  };

  if (type === "q") {
    return (
      <svg
        width="44"
        height="44"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        {/* Queen crown */}
        <path
          {...commonProps}
          d="M10 11 L15 19 L24 9 L33 19 L38 11 L36 28 L12 28 Z"
        />

        {/* Queen body */}
        <path
          {...commonProps}
          d="M14 28 L34 28 L32 36 L16 36 Z"
        />

        {/* Base */}
        <rect
          {...commonProps}
          x="12"
          y="36"
          width="24"
          height="4"
          rx="1"
        />

        {/* Crown circles */}
        <circle
          cx="10"
          cy="10"
          r="2"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
        />
        <circle
          cx="24"
          cy="8"
          r="2"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
        />
        <circle
          cx="38"
          cy="10"
          r="2"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (type === "r") {
    return (
      <svg
        width="44"
        height="44"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        {/* Rook top */}
        <path
          {...commonProps}
          d="M10 9 H15 V14 H19 V9 H24 V14 H29 V9 H34 V14 H38 V19 H34 V34 H14 V19 H10 Z"
        />

        {/* Rook body */}
        <path
          {...commonProps}
          d="M14 19 H34 V34 H14 Z"
        />

        {/* Base */}
        <path
          {...commonProps}
          d="M11 34 H37 V40 H11 Z"
        />

        <line
          x1="18"
          y1="23"
          x2="30"
          y2="23"
          stroke={stroke}
          strokeWidth="1.5"
        />

        <line
          x1="18"
          y1="28"
          x2="30"
          y2="28"
          stroke={stroke}
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (type === "b") {
    return (
      <svg
        width="44"
        height="44"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        {/* Bishop head */}
        <path
          {...commonProps}
          d="M24 7 C17 11 15 17 19 23 L14 31 H34 L29 23 C33 17 31 11 24 7 Z"
        />

        {/* Bishop slit */}
        <line
          x1="27"
          y1="11"
          x2="21"
          y2="22"
          stroke={stroke}
          strokeWidth="2"
        />

        {/* Body */}
        <path
          {...commonProps}
          d="M17 31 H31 L34 36 H14 Z"
        />

        {/* Base */}
        <rect
          {...commonProps}
          x="11"
          y="36"
          width="26"
          height="4"
          rx="1"
        />
      </svg>
    );
  }

  // Knight
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      {/* Knight head/body */}
      <path
        {...commonProps}
        d="M13 38
           C15 33 17 29 18 25
           C14 21 14 15 18 11
           L22 8
           L21 14
           C27 12 33 15 35 20
           C37 25 34 29 31 31
           L34 36
           H38
           V40
           H11
           V38
           Z"
      />

      {/* Ear */}
      <path
        d="M22 8 L27 10 L21 14 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Eye */}
      <circle
        cx="29"
        cy="20"
        r="1.5"
        fill={isWhite ? "#111827" : "#ffffff"}
      />

      {/* Neck detail */}
      <path
        d="M19 27 C23 29 27 29 31 27"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
      />

      {/* Base */}
      <rect
        {...commonProps}
        x="10"
        y="36"
        width="28"
        height="4"
        rx="1"
      />
    </svg>
  );
}

function App() {
  const [game, setGame] = useState(new Chess());
  const [gameId, setGameId] = useState(null);
  const [mode, setMode] = useState("ai");
  const [status, setStatus] = useState(
    "Start a new game to begin"
  );
  const [isThinking, setIsThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [checkedKingSquare, setCheckedKingSquare] =
    useState(null);
  const [capturedPieces, setCapturedPieces] = useState({
    white: [],
    black: [],
  });
  const [flyingCapture, setFlyingCapture] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [promotionPending, setPromotionPending] =
    useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [coachFeedback, setCoachFeedback] = useState(null);

  // =========================================================
  // ONLINE MULTIPLAYER STATE
  // =========================================================

  const [onlineRoomId, setOnlineRoomId] = useState(null);
  const [onlineColor, setOnlineColor] = useState(null);
  const [onlineConnection, setOnlineConnection] =
    useState("idle");
  const [showRoomModal, setShowRoomModal] = useState(false);

  const onlineSocketRef = useRef(null);
  const gameRef = useRef(game);
  const modeRef = useRef(mode);
  const onlineColorRef = useRef(onlineColor);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    onlineColorRef.current = onlineColor;
  }, [onlineColor]);

  // =========================================================
  // PIECE SYMBOLS
  // =========================================================

  const getPieceSymbol = (piece) => {
    const symbols = {
      wP: "♙",
      wN: "♘",
      wB: "♗",
      wR: "♖",
      wQ: "♕",
      wK: "♔",
      bP: "♟",
      bN: "♞",
      bB: "♝",
      bR: "♜",
      bQ: "♛",
      bK: "♚",
    };

    return symbols[piece] || "";
  };

  // =========================================================
  // COACH CLASSIFICATION COLOR
  // =========================================================

  const getClassificationColor = (classification) => {
    const colors = {
      Excellent: "#16a34a",
      Good: "#2563eb",
      Inaccuracy: "#ca8a04",
      Mistake: "#ea580c",
      Blunder: "#dc2626",
    };

    return colors[classification] || "#6b7280";
  };

  // =========================================================
  // FIND CHECKED KING
  // =========================================================

  const findCheckedKingSquare = (board) => {
    if (!board.inCheck()) {
      return null;
    }

    const kingColor = board.turn();

    const files = [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
    ];

    for (const file of files) {
      for (let rank = 1; rank <= 8; rank++) {
        const square = `${file}${rank}`;
        const piece = board.get(square);

        if (
          piece &&
          piece.type === "k" &&
          piece.color === kingColor
        ) {
          return square;
        }
      }
    }

    return null;
  };

  // =========================================================
  // GAME STATUS
  // =========================================================

  const updateGameStatus = (board) => {
    const checkedSquare =
      findCheckedKingSquare(board);

    setCheckedKingSquare(checkedSquare);

    if (board.isCheckmate()) {
      setGameOver(true);

      const winner =
        board.turn() === "w"
          ? "Black"
          : "White";

      setStatus(
        `♔ Checkmate — ${winner} wins!`
      );

      return;
    }

    if (board.isStalemate()) {
      setGameOver(true);
      setStatus("½–½ Stalemate — Draw");
      return;
    }

    if (board.isInsufficientMaterial()) {
      setGameOver(true);
      setStatus("½–½ Draw");
      return;
    }

    if (board.isThreefoldRepetition()) {
      setGameOver(true);
      setStatus("½–½ Draw");
      return;
    }

    if (board.isDraw()) {
      setGameOver(true);
      setStatus("½–½ Draw");
      return;
    }

    setGameOver(false);

    if (board.inCheck()) {
      if (modeRef.current === "ai") {
        if (board.turn() === "w") {
          setStatus(
            "⚠️ Your king is in check!"
          );
        } else {
          setStatus(
            "⚠️ Black is in check!"
          );
        }
      } else if (modeRef.current === "online") {
        const myColorChar =
          onlineColorRef.current === "white"
            ? "w"
            : "b";

        setStatus(
          board.turn() === myColorChar
            ? "⚠️ Your king is in check!"
            : "⚠️ Opponent is in check!"
        );
      } else {
        const side =
          board.turn() === "w"
            ? "White"
            : "Black";

        setStatus(
          `⚠️ ${side} is in check!`
        );
      }

      return;
    }

    if (modeRef.current === "ai") {
      if (board.turn() === "w") {
        setStatus("Your turn");
      } else {
        setStatus("Black to move");
      }
    } else if (modeRef.current === "online") {
      const myColorChar =
        onlineColorRef.current === "white"
          ? "w"
          : "b";

      setStatus(
        board.turn() === myColorChar
          ? "Your turn"
          : "Opponent's turn"
      );
    } else {
      const side =
        board.turn() === "w"
          ? "White"
          : "Black";

      setStatus(`${side} to move`);
    }
  };

  // =========================================================
  // START AI GAME
  // =========================================================

  const startAIGame = async () => {
    closeOnlineSocket();

    try {
      setIsThinking(true);
      setStatus("Starting new game...");

      const response = await fetch(
        `${API_URL}/game/new`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (data.error) {
        setStatus(data.error);
        setIsThinking(false);
        return;
      }

      const newBoard = new Chess(data.fen);

      setGame(newBoard);
      setGameId(data.game_id);
      setMode("ai");

      setSelectedSquare(null);
      setLegalMoves([]);

      setCapturedPieces({
        white: [],
        black: [],
      });

      setMoveHistory([]);
      setCheckedKingSquare(null);
      setPromotionPending(null);
      setFlyingCapture(null);
      setUndoStack([]);
      setCoachFeedback(null);

      setGameOver(false);
      setStatus("Your turn");
      setIsThinking(false);
    } catch (error) {
      console.error(error);

      setStatus(
        "Unable to connect to backend"
      );

      setIsThinking(false);
    }
  };

  // =========================================================
  // START TWO PLAYER
  // =========================================================

  const startTwoPlayerGame = () => {
    closeOnlineSocket();

    const newBoard = new Chess();

    setGame(newBoard);
    setGameId(null);
    setMode("two-player");

    setSelectedSquare(null);
    setLegalMoves([]);

    setCapturedPieces({
      white: [],
      black: [],
    });

    setMoveHistory([]);
    setCheckedKingSquare(null);
    setPromotionPending(null);
    setFlyingCapture(null);
    setUndoStack([]);
    setCoachFeedback(null);

    setGameOver(false);
    setStatus("White to move");
    setIsThinking(false);
  };

  // =========================================================
  // RESTART
  // =========================================================

  const restartGame = async () => {
    if (isThinking) {
      return;
    }

    if (mode === "ai") {
      await startAIGame();
    } else if (mode === "two-player") {
      startTwoPlayerGame();
    }
  };

  // =========================================================
  // ONLINE MULTIPLAYER
  // =========================================================

  const getWebSocketUrl = (roomId) => {
    const wsBase = API_URL.replace(
      /^http/,
      "ws"
    );

    return `${wsBase}/ws/room/${roomId}`;
  };

  const closeOnlineSocket = () => {
    if (onlineSocketRef.current) {
      onlineSocketRef.current.onclose = null;
      onlineSocketRef.current.close();
      onlineSocketRef.current = null;
    }

    setOnlineRoomId(null);
    setOnlineColor(null);
    setOnlineConnection("idle");
    setShowRoomModal(false);
  };

  const applyIncomingOnlineMove = (
    moveSan,
    fen,
    gameOverFlag
  ) => {
    const boardBefore = new Chess(
      gameRef.current.fen()
    );

    const verboseMoves = boardBefore.moves({
      verbose: true,
    });

    const matchingMove = verboseMoves.find(
      (move) => move.san === moveSan
    );

    let capturedPiece = null;

    if (matchingMove) {
      capturedPiece = boardBefore.get(
        matchingMove.to
      );

      if (matchingMove.flags.includes("e")) {
        const capturedPawnSquare = `${
          matchingMove.to[0]
        }${
          parseInt(matchingMove.to[1]) +
          (matchingMove.color === "w" ? -1 : 1)
        }`;

        capturedPiece = boardBefore.get(
          capturedPawnSquare
        );
      }
    }

    if (capturedPiece) {
      const capturedColor = capturedPiece.color;

      setCapturedPieces((previous) => ({
        ...previous,
        [capturedColor === "w"
          ? "white"
          : "black"]: [
          ...previous[
            capturedColor === "w"
              ? "white"
              : "black"
          ],
          capturedPiece.type,
        ],
      }));

      if (matchingMove) {
        animateCapture(
          `${capturedColor}${capturedPiece.type.toUpperCase()}`,
          matchingMove.from,
          matchingMove.to
        );
      }
    }

    const moverColor = boardBefore.turn();

    setMoveHistory((previous) => {
      if (moverColor === "w") {
        return [
          ...previous,
          {
            moveNumber: previous.length + 1,
            white: moveSan,
            black: null,
          },
        ];
      }

      const updated = [...previous];
      const lastIndex = updated.length - 1;

      if (
        lastIndex >= 0 &&
        !updated[lastIndex].black
      ) {
        updated[lastIndex] = {
          ...updated[lastIndex],
          black: moveSan,
        };

        return updated;
      }

      return [
        ...updated,
        {
          moveNumber: updated.length + 1,
          white: null,
          black: moveSan,
        },
      ];
    });

    const newGame = new Chess(fen);

    setGame(newGame);
    gameRef.current = newGame;

    updateGameStatus(newGame);

    setSelectedSquare(null);
    setLegalMoves([]);

    if (gameOverFlag) {
      setGameOver(true);
    }
  };

  const connectRoomSocket = (roomId) => {
    const socket = new WebSocket(
      getWebSocketUrl(roomId)
    );

    onlineSocketRef.current = socket;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "joined") {
        setOnlineColor(data.color);
        onlineColorRef.current = data.color;

        const newGame = new Chess(data.fen);

        setGame(newGame);
        gameRef.current = newGame;

        updateGameStatus(newGame);

        setOnlineConnection("waiting");

        return;
      }

      if (data.type === "status") {
        const bothConnected =
          data.white_connected &&
          data.black_connected;

        setOnlineConnection(
          bothConnected ? "connected" : "waiting"
        );

        if (bothConnected) {
          setShowRoomModal(false);
        }

        return;
      }

      if (data.type === "move") {
        applyIncomingOnlineMove(
          data.move,
          data.fen,
          data.game_over
        );

        return;
      }

      if (data.type === "error") {
        setStatus(data.message);
      }
    };

    socket.onclose = () => {
      setOnlineConnection("idle");
    };

    socket.onerror = () => {
      setOnlineConnection("error");
    };
  };

  const sendOnlineMove = (moveSan) => {
    if (
      onlineSocketRef.current &&
      onlineSocketRef.current.readyState ===
        WebSocket.OPEN
    ) {
      onlineSocketRef.current.send(
        JSON.stringify({
          type: "move",
          move: moveSan,
        })
      );
    }
  };

  const resetLocalStateForOnlineGame = () => {
    const newGame = new Chess();

    setGame(newGame);
    gameRef.current = newGame;
    setGameId(null);
    setMode("online");
    modeRef.current = "online";

    setSelectedSquare(null);
    setLegalMoves([]);

    setCapturedPieces({
      white: [],
      black: [],
    });

    setMoveHistory([]);
    setCheckedKingSquare(null);
    setPromotionPending(null);
    setFlyingCapture(null);
    setUndoStack([]);
    setCoachFeedback(null);

    setGameOver(false);
    setIsThinking(false);
  };

  const startOnlineGame = async () => {
    try {
      setStatus("Creating room...");

      const response = await fetch(
        `${API_URL}/room/new`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      resetLocalStateForOnlineGame();

      setOnlineRoomId(data.room_id);
      setOnlineConnection("connecting");
      setStatus("Waiting for opponent...");
      setShowRoomModal(true);

      const url = new URL(
        window.location.href
      );

      url.searchParams.set(
        "room",
        data.room_id
      );

      window.history.replaceState(
        {},
        "",
        url
      );

      connectRoomSocket(data.room_id);
    } catch (error) {
      console.error(error);
      setStatus("Unable to create room");
    }
  };

  const joinOnlineGame = (roomId) => {
    resetLocalStateForOnlineGame();

    setOnlineRoomId(roomId);
    setOnlineConnection("connecting");
    setStatus("Connecting...");

    connectRoomSocket(roomId);
  };

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const roomId = params.get("room");

    if (roomId) {
      joinOnlineGame(roomId);
    }

    return () => {
      if (onlineSocketRef.current) {
        onlineSocketRef.current.onclose = null;
        onlineSocketRef.current.close();
        onlineSocketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================
  // SQUARE CENTER
  // =========================================================

  const getSquareCenter = (square) => {
    const file =
      square.charCodeAt(0) - 97;

    const rank =
      parseInt(square[1], 10);

    const x =
      file * (BOARD_SIZE / 8) +
      BOARD_SIZE / 16;

    const y =
      (8 - rank) *
        (BOARD_SIZE / 8) +
      BOARD_SIZE / 16;

    return {
      x,
      y,
    };
  };

  // =========================================================
  // CAPTURE ANIMATION
  // =========================================================

  const animateCapture = (
    capturedPiece,
    fromSquare,
    toSquare
  ) => {
    if (!capturedPiece) {
      return;
    }

    const start =
      getSquareCenter(toSquare);

    const end = {
      x:
        BOARD_SIZE +
        GAP +
        CAPTURE_WIDTH / 2,
      y:
        BOARD_SIZE / 2,
    };

    const timer = setTimeout(() => {
      setFlyingCapture(null);
    }, 1200);

    setFlyingCapture({
      piece: capturedPiece,
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      timer,
    });
  };

  // =========================================================
  // SAVE UNDO STATE
  // =========================================================

  const saveUndoState = () => {
    setUndoStack((previous) => [
      ...previous,
      {
        fen: game.fen(),

        capturedPieces: {
          white: [
            ...capturedPieces.white,
          ],
          black: [
            ...capturedPieces.black,
          ],
        },

        moveHistory: [
          ...moveHistory,
        ],

        checkedKingSquare,
        gameOver,
        status,
      },
    ]);
  };

  // =========================================================
  // SEND MOVE TO BACKEND
  // =========================================================

  const sendMoveToBackend = async (
    moveSan,
    localBoard
  ) => {
    try {
      setIsThinking(true);
      setStatus("Stockfish is thinking...");

      const response = await fetch(
        `${API_URL}/game/move`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            game_id: gameId,
            move: moveSan,
          }),
        }
      );

      const data =
        await response.json();

      if (data.error) {
        setStatus(data.error);
        setIsThinking(false);
        return;
      }

      setCoachFeedback(data.coach || null);

      if (data.stockfish_move) {
        const aiMove =
          data.stockfish_move;

        const verboseMoves =
          localBoard.moves({
            verbose: true,
          });

        const matchingMove =
          verboseMoves.find(
            (move) =>
              move.san === aiMove
          );

        let capturedPiece = null;

        if (matchingMove) {
          capturedPiece =
            localBoard.get(
              matchingMove.to
            );

          // En passant
          if (
            matchingMove.flags.includes(
              "e"
            )
          ) {
            const capturedPawnSquare =
              `${matchingMove.to[0]}${
                parseInt(
                  matchingMove.to[1]
                ) +
                (
                  matchingMove.color ===
                  "w"
                    ? -1
                    : 1
                )
              }`;

            capturedPiece =
              localBoard.get(
                capturedPawnSquare
              );
          }
        }

        if (capturedPiece) {
          const capturedColor =
            capturedPiece.color;

          setCapturedPieces(
            (previous) => ({
              ...previous,

              [capturedColor === "w"
                ? "white"
                : "black"]: [
                ...previous[
                  capturedColor ===
                  "w"
                    ? "white"
                    : "black"
                ],

                capturedPiece.type,
              ],
            })
          );

          if (matchingMove) {
            animateCapture(
              `${capturedColor}${capturedPiece.type.toUpperCase()}`,
              matchingMove.from,
              matchingMove.to
            );
          }
        }

        setMoveHistory(
          (previous) => {
            const updated = [
              ...previous,
            ];

            const lastIndex =
              updated.length - 1;

            if (
              lastIndex >= 0 &&
              !updated[lastIndex].black
            ) {
              updated[lastIndex] = {
                ...updated[lastIndex],
                black: aiMove,
              };
            } else {
              updated.push({
                moveNumber:
                  updated.length + 1,
                white: null,
                black: aiMove,
              });
            }

            return updated;
          }
        );
      }

      const boardAfterAI =
        new Chess(data.fen);

      setGame(boardAfterAI);

      updateGameStatus(
        boardAfterAI
      );

      if (data.game_over) {
        setGameOver(true);
      }

      setSelectedSquare(null);
      setLegalMoves([]);
      setIsThinking(false);
    } catch (error) {
      console.error(error);

      setStatus(
        "Unable to connect to backend"
      );

      setIsThinking(false);
    }
  };

  // =========================================================
  // MAKE MOVE
  // =========================================================

  const makeMove = async (
    sourceSquare,
    targetSquare,
    promotionPiece = "q"
  ) => {
    if (
      gameOver ||
      isThinking
    ) {
      return;
    }

    const boardCopy =
      new Chess(game.fen());

    const movingPiece =
      boardCopy.get(
        sourceSquare
      );

    if (!movingPiece) {
      return;
    }

    const verboseMoves =
      boardCopy.moves({
        square:
          sourceSquare,
        verbose: true,
      });

    const selectedMove =
      verboseMoves.find(
        (move) =>
          move.to ===
          targetSquare
      );

    if (!selectedMove) {
      return;
    }

    if (mode !== "online") {
      saveUndoState();
    }

    // =======================================================
    // CAPTURE DETECTION
    // =======================================================

    let capturedPiece =
      boardCopy.get(
        targetSquare
      );

    // En passant
    if (
      selectedMove.flags.includes(
        "e"
      )
    ) {
      const capturedPawnSquare =
        `${targetSquare[0]}${
          parseInt(
            targetSquare[1]
          ) +
          (
            movingPiece.color ===
            "w"
              ? -1
              : 1
          )
        }`;

      capturedPiece =
        boardCopy.get(
          capturedPawnSquare
        );
    }

    // =======================================================
    // MAKE THE MOVE
    // =======================================================

    const moveResult =
      boardCopy.move({
        from:
          sourceSquare,

        to:
          targetSquare,

        promotion:
          promotionPiece,
      });

    if (!moveResult) {
      return;
    }

    const moveSan =
      moveResult.san;

    // =======================================================
    // ONLINE MODE
    // =======================================================
    //
    // The board is only updated once the server broadcasts the
    // authoritative move back over the WebSocket, so both
    // players always see an identical, server-validated state.

    if (mode === "online") {
      sendOnlineMove(moveSan);

      setSelectedSquare(null);
      setLegalMoves([]);

      return;
    }

    // =======================================================
    // CAPTURED PIECES
    // =======================================================

    if (capturedPiece) {
      setCapturedPieces(
        (previous) => ({
          ...previous,

          [capturedPiece.color ===
          "w"
            ? "white"
            : "black"]: [
            ...previous[
              capturedPiece.color ===
              "w"
                ? "white"
                : "black"
            ],

            capturedPiece.type,
          ],
        })
      );

      animateCapture(
        `${capturedPiece.color}${capturedPiece.type.toUpperCase()}`,
        sourceSquare,
        targetSquare
      );
    }

    // =======================================================
    // MOVE HISTORY
    // =======================================================

    if (
      movingPiece.color === "w"
    ) {
      setMoveHistory(
        (previous) => [
          ...previous,

          {
            moveNumber:
              previous.length + 1,
            white: moveSan,
            black: null,
          },
        ]
      );
    } else {
      setMoveHistory(
        (previous) => {
          const updated = [
            ...previous,
          ];

          const lastIndex =
            updated.length - 1;

          if (
            lastIndex >= 0 &&
            !updated[lastIndex].black
          ) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              black: moveSan,
            };

            return updated;
          }

          return [
            ...updated,

            {
              moveNumber:
                updated.length + 1,
              white: null,
              black: moveSan,
            },
          ];
        }
      );
    }

    setGame(boardCopy);

    updateGameStatus(
      boardCopy
    );

    setSelectedSquare(null);
    setLegalMoves([]);

    // =======================================================
    // GAME OVER
    // =======================================================

    if (
      boardCopy.isGameOver()
    ) {
      setGameOver(true);
      return;
    }

    // =======================================================
    // AI MODE
    // =======================================================

    if (
      mode === "ai" &&
      movingPiece.color === "w"
    ) {
      await sendMoveToBackend(
        moveSan,
        boardCopy
      );

      return;
    }

    // =======================================================
    // TWO PLAYER
    // =======================================================

    if (
      mode === "two-player"
    ) {
      updateGameStatus(
        boardCopy
      );
    }
  };

  // =========================================================
  // PIECE CLICK
  // =========================================================

  const handlePieceClick = ({
    piece,
    square,
  }) => {
    if (
      gameOver ||
      isThinking ||
      !piece
    ) {
      return;
    }

    const boardPiece =
      game.get(square);

    if (!boardPiece) {
      return;
    }

    // AI mode = White only
    if (
      mode === "ai" &&
      boardPiece.color !== "w"
    ) {
      return;
    }

    // Two player = current side
    if (
      mode === "two-player" &&
      boardPiece.color !==
        game.turn()
    ) {
      return;
    }

    // Online = only your assigned color, only on your turn
    if (mode === "online") {
      const myColorChar =
        onlineColor === "white"
          ? "w"
          : "b";

      if (
        boardPiece.color !==
          myColorChar ||
        game.turn() !== myColorChar
      ) {
        return;
      }
    }

    if (
      selectedSquare ===
      square
    ) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const moves =
      game.moves({
        square,
        verbose: true,
      });

    setSelectedSquare(square);
    setLegalMoves(moves);
  };

  // =========================================================
  // SQUARE CLICK
  // =========================================================

  const handleSquareClick = ({
    square,
  }) => {
    if (
      gameOver ||
      isThinking
    ) {
      return;
    }

    if (!selectedSquare) {
      return;
    }

    const moves =
      game.moves({
        square:
          selectedSquare,
        verbose: true,
      });

    const selectedMove =
      moves.find(
        (move) =>
          move.to === square
      );

    // Not a legal destination
    if (!selectedMove) {
      const piece =
        game.get(square);

      if (piece) {
        if (
          mode === "ai" &&
          piece.color !== "w"
        ) {
          return;
        }

        if (
          mode === "two-player" &&
          piece.color !==
            game.turn()
        ) {
          return;
        }

        if (mode === "online") {
          const myColorChar =
            onlineColor === "white"
              ? "w"
              : "b";

          if (
            piece.color !==
              myColorChar ||
            game.turn() !==
              myColorChar
          ) {
            return;
          }
        }

        const newMoves =
          game.moves({
            square,
            verbose: true,
          });

        setSelectedSquare(square);
        setLegalMoves(
          newMoves
        );
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }

      return;
    }

    // Promotion
    if (
      selectedMove.promotion
    ) {
      setPromotionPending({
        from:
          selectedSquare,

        to:
          square,

        color:
          game.get(
            selectedSquare
          )?.color || "w",
      });

      return;
    }

    makeMove(
      selectedSquare,
      square,
      selectedMove.promotion ||
        "q"
    );
  };

  // =========================================================
  // DRAG AND DROP
  // =========================================================

  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }) => {
    if (
      gameOver ||
      isThinking ||
      !targetSquare
    ) {
      return false;
    }

    const piece =
      game.get(sourceSquare);

    if (!piece) {
      return false;
    }

    // AI mode = White only
    if (
      mode === "ai" &&
      piece.color !== "w"
    ) {
      return false;
    }

    // Two player = current side
    if (
      mode === "two-player" &&
      piece.color !==
        game.turn()
    ) {
      return false;
    }

    if (mode === "online") {
      const myColorChar =
        onlineColor === "white"
          ? "w"
          : "b";

      if (
        piece.color !==
          myColorChar ||
        game.turn() !== myColorChar
      ) {
        return false;
      }
    }

    const moves =
      game.moves({
        square:
          sourceSquare,
        verbose: true,
      });

    const selectedMove =
      moves.find(
        (move) =>
          move.to ===
          targetSquare
      );

    if (!selectedMove) {
      return false;
    }

    // Promotion
    if (
      selectedMove.promotion
    ) {
      setPromotionPending({
        from:
          sourceSquare,

        to:
          targetSquare,

        color:
          piece.color,
      });

      return false;
    }

    makeMove(
      sourceSquare,
      targetSquare,
      selectedMove.promotion ||
        "q"
    );

    return true;
  };

  // =========================================================
  // PROMOTION
  // =========================================================

  const choosePromotion = (
    promotionPiece
  ) => {
    if (
      !promotionPending
    ) {
      return;
    }

    const {
      from,
      to,
    } = promotionPending;

    setPromotionPending(null);

    makeMove(
      from,
      to,
      promotionPiece
    );
  };

  // =========================================================
  // UNDO
  // =========================================================

  const undoMove = async () => {
    if (
      isThinking ||
      undoStack.length === 0
    ) {
      return;
    }

    // =======================================================
    // TWO PLAYER
    // =======================================================

    if (
      mode === "two-player"
    ) {
      const previousState =
        undoStack[
          undoStack.length - 1
        ];

      const restoredGame =
        new Chess(
          previousState.fen
        );

      setGame(
        restoredGame
      );

      setCapturedPieces({
        white: [
          ...previousState
            .capturedPieces
            .white,
        ],

        black: [
          ...previousState
            .capturedPieces
            .black,
        ],
      });

      setMoveHistory([
        ...previousState
          .moveHistory,
      ]);

      setCheckedKingSquare(
        previousState
          .checkedKingSquare
      );

      setGameOver(
        previousState.gameOver
      );

      setStatus(
        previousState.status
      );

      setSelectedSquare(null);
      setLegalMoves([]);
      setPromotionPending(null);
      setFlyingCapture(null);
      setCoachFeedback(null);

      setUndoStack(
        (previous) =>
          previous.slice(
            0,
            -1
          )
      );

      return;
    }

    // =======================================================
    // AI MODE
    // =======================================================

    if (!gameId) {
      return;
    }

    try {
      setIsThinking(true);
      setStatus("Undoing move...");

      const response =
        await fetch(
          `${API_URL}/game/undo`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              game_id:
                gameId,

              move: "",
            }),
          }
        );

      const data =
        await response.json();

      if (data.error) {
        setStatus(
          data.error
        );

        setIsThinking(false);
        return;
      }

      const previousState =
        undoStack[
          undoStack.length - 1
        ];

      const restoredGame =
        new Chess(
          data.fen
        );

      setGame(
        restoredGame
      );

      setCapturedPieces({
        white: [
          ...previousState
            .capturedPieces
            .white,
        ],

        black: [
          ...previousState
            .capturedPieces
            .black,
        ],
      });

      setMoveHistory([
        ...previousState
          .moveHistory,
      ]);

      setCheckedKingSquare(
        findCheckedKingSquare(
          restoredGame
        )
      );

      setGameOver(
        restoredGame.isGameOver()
      );

      setSelectedSquare(null);
      setLegalMoves([]);
      setPromotionPending(null);
      setFlyingCapture(null);
      setCoachFeedback(null);

      setStatus("Your turn");

      setUndoStack(
        (previous) =>
          previous.slice(
            0,
            -1
          )
      );

      setIsThinking(false);
    } catch (error) {
      console.error(error);

      setStatus(
        "Unable to undo move"
      );

      setIsThinking(false);
    }
  };

  // =========================================================
  // BOARD STYLES
  // =========================================================

  const squareStyles = {};

  // Checked king
  if (checkedKingSquare) {
    squareStyles[
      checkedKingSquare
    ] = {
      background:
        "rgba(255, 60, 60, 0.65)",
    };
  }

  // Selected piece
  if (selectedSquare) {
    squareStyles[
      selectedSquare
    ] = {
      background:
        "rgba(255, 215, 0, 0.55)",
    };
  }

  // Legal moves
  legalMoves.forEach(
    (move) => {
      const isCapture =
        move.flags.includes(
          "c"
        ) ||
        move.flags.includes(
          "e"
        );

      squareStyles[
        move.to
      ] = {
        background:
          isCapture
            ? "rgba(255, 80, 80, 0.30)"
            : "rgba(80, 200, 120, 0.45)",
      };
    }
  );

  // =========================================================
  // CAPTURED PIECES
  // =========================================================

  const renderCapturedPieces = (
    color
  ) => {
    const pieces =
      capturedPieces[color];

    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 7,
          alignContent:
            "flex-start",
        }}
      >
        {pieces.map(
          (
            piece,
            index
          ) => (
            <div
              key={`${piece}-${index}`}
              style={{
                width: 38,
                height: 38,
                borderRadius: 7,
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                fontSize: 27,

                background:
                  color ===
                  "white"
                    ? "#111827"
                    : "#f3f4f6",

                color:
                  color ===
                  "white"
                    ? "#ffffff"
                    : "#111827",

                boxShadow:
                  "0 2px 5px rgba(0,0,0,0.15)",
              }}
            >
              {getPieceSymbol(
                `${
                  color ===
                  "white"
                    ? "w"
                    : "b"
                }${piece.toUpperCase()}`
              )}
            </div>
          )
        )}
      </div>
    );
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      style={{
        minHeight:
          "100vh",

        background:
          "#f5f7fb",

        padding:
          "30px 3vw",

        boxSizing:
          "border-box",

        fontFamily:
          "Arial, sans-serif",

        color:
          "#111827",
      }}
    >
      <div
        style={{
          maxWidth:
            "1500px",

          margin:
            "0 auto",
        }}
      >
        {/* ===================================================
            HEADER
        =================================================== */}

        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "space-between",

            marginBottom:
              24,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 32,
              }}
            >
              Wayout Chess
            </h1>

            <div
              style={{
                marginTop: 6,
                color:
                  "#6b7280",
              }}
            >
              Play chess against
              Stockfish or locally
              with two players.
            </div>
          </div>

          {/* BUTTONS */}

          <div
            style={{
              display:
                "flex",

              gap: 10,

              flexWrap:
                "wrap",

              justifyContent:
                "flex-end",
            }}
          >
            <button
              onClick={
                startAIGame
              }
              style={{
                padding:
                  "10px 16px",

                borderRadius:
                  8,

                border:
                  "1px solid #2563eb",

                background:
                  "#2563eb",

                color:
                  "white",

                cursor:
                  "pointer",

                fontWeight:
                  600,
              }}
            >
              New AI Game
            </button>

            <button
              onClick={
                startTwoPlayerGame
              }
              style={{
                padding:
                  "10px 16px",

                borderRadius:
                  8,

                border:
                  "1px solid #d1d5db",

                background:
                  "white",

                color:
                  "#111827",

                cursor:
                  "pointer",

                fontWeight:
                  600,
              }}
            >
              Two Player
            </button>

            <button
              onClick={
                startOnlineGame
              }
              style={{
                padding:
                  "10px 16px",

                borderRadius:
                  8,

                border:
                  "1px solid #16a34a",

                background:
                  "#16a34a",

                color:
                  "white",

                cursor:
                  "pointer",

                fontWeight:
                  600,
              }}
            >
              Play with Friend
            </button>

            {mode !== "online" && (
              <button
                onClick={
                  restartGame
                }
                disabled={
                  isThinking
                }
                style={{
                  padding:
                    "10px 16px",

                  borderRadius:
                    8,

                  border:
                    "1px solid #d1d5db",

                  background:
                    isThinking
                      ? "#f3f4f6"
                      : "white",

                  color:
                    isThinking
                      ? "#9ca3af"
                      : "#111827",

                  cursor:
                    isThinking
                      ? "not-allowed"
                      : "pointer",

                  fontWeight:
                    600,
                }}
              >
                ↻ Restart
              </button>
            )}

            {mode !== "online" && (
              <button
                onClick={
                  undoMove
                }
                disabled={
                  isThinking ||
                  undoStack.length ===
                    0
                }
                style={{
                  padding:
                    "10px 16px",

                  borderRadius:
                    8,

                  border:
                    "1px solid #d1d5db",

                  background:
                    isThinking ||
                    undoStack.length ===
                      0
                      ? "#f3f4f6"
                      : "white",

                  color:
                    isThinking ||
                    undoStack.length ===
                      0
                      ? "#9ca3af"
                      : "#111827",

                  cursor:
                    isThinking ||
                    undoStack.length ===
                      0
                      ? "not-allowed"
                      : "pointer",

                  fontWeight:
                    600,
                }}
              >
                ↩ Undo
              </button>
            )}
          </div>
        </div>

        {/* ===================================================
            MAIN AREA
        =================================================== */}

        <div
          style={{
            display:
              "flex",

            alignItems:
              "flex-start",

            gap:
              GAP,

            position:
              "relative",

            overflow:
              "visible",
          }}
        >
          {/* =================================================
              BOARD + CAPTURE AREA
          ================================================= */}

          <div
            style={{
              display:
                "flex",

              gap:
                GAP,

              position:
                "relative",

              overflow:
                "visible",
            }}
          >
            {/* BOARD */}

            <div
              style={{
                width:
                  BOARD_SIZE,

                height:
                  BOARD_SIZE,

                position:
                  "relative",
              }}
            >
              <Chessboard
                options={{
                  position:
                    game.fen(),

                  boardWidth:
                    BOARD_SIZE,

                  onPieceClick:
                    handlePieceClick,

                  onSquareClick:
                    handleSquareClick,

                  onPieceDrop:
                    handlePieceDrop,

                  squareStyles:
                    squareStyles,

                  boardStyle: {
                    border:
                      "none",

                    boxShadow:
                      "none",
                  },

                  arePiecesDraggable:
                    !gameOver &&
                    !isThinking,
                }}
              />
            </div>

            {/* =================================================
                CAPTURED PIECES
            ================================================= */}

            <div
              style={{
                width:
                  CAPTURE_WIDTH,

                minHeight:
                  BOARD_SIZE,

                background:
                  "#ffffff",

                border:
                  "1px solid #e5e7eb",

                borderRadius:
                  12,

                padding:
                  16,

                boxSizing:
                  "border-box",

                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontWeight:
                    700,

                  fontSize:
                    15,

                  marginBottom:
                    12,
                }}
              >
                Captured
              </div>

              {/* WHITE */}

              <div
                style={{
                  marginBottom:
                    22,
                }}
              >
                <div
                  style={{
                    fontSize:
                      12,

                    color:
                      "#6b7280",

                    marginBottom:
                      8,
                  }}
                >
                  White pieces
                </div>

                {renderCapturedPieces(
                  "white"
                )}
              </div>

              {/* BLACK */}

              <div>
                <div
                  style={{
                    fontSize:
                      12,

                    color:
                      "#6b7280",

                    marginBottom:
                      8,
                  }}
                >
                  Black pieces
                </div>

                {renderCapturedPieces(
                  "black"
                )}
              </div>
            </div>

            {/* =================================================
                FLYING CAPTURE
            ================================================= */}

            {flyingCapture && (
              <div
                style={{
                  position:
                    "absolute",

                  left: 0,
                  top: 0,

                  width: 38,
                  height: 38,

                  borderRadius: 7,

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  fontSize: 27,

                  background:
                    flyingCapture.piece.startsWith(
                      "w"
                    )
                      ? "#111827"
                      : "#f3f4f6",

                  color:
                    flyingCapture.piece.startsWith(
                      "w"
                    )
                      ? "#ffffff"
                      : "#111827",

                  pointerEvents:
                    "none",

                  zIndex: 100,

                  "--start-x":
                    `${
                      flyingCapture.startX -
                      19
                    }px`,

                  "--start-y":
                    `${
                      flyingCapture.startY -
                      19
                    }px`,

                  "--end-x":
                    `${
                      flyingCapture.endX -
                      19
                    }px`,

                  "--end-y":
                    `${
                      flyingCapture.endY -
                      19
                    }px`,

                  animation:
                    "captureFly 1200ms ease-in-out forwards",

                  willChange:
                    "transform, opacity",
                }}
              >
                {getPieceSymbol(
                  flyingCapture.piece
                )}
              </div>
            )}
          </div>

          {/* =================================================
              RIGHT PANEL
          ================================================= */}

          <div
            style={{
              flex: 1,

              minWidth:
                300,

              maxWidth:
                650,
            }}
          >
            {/* STATUS */}

            <div
              style={{
                background:
                  "#ffffff",

                border:
                  "1px solid #e5e7eb",

                borderRadius:
                  12,

                padding:
                  18,

                marginBottom:
                  18,

                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize:
                    13,

                  color:
                    "#6b7280",

                  marginBottom:
                    6,
                }}
              >
                GAME STATUS
              </div>

              <div
                style={{
                  fontSize:
                    21,

                  fontWeight:
                    700,
                }}
              >
                {isThinking
                  ? "Thinking..."
                  : status}
              </div>

              <div
                style={{
                  marginTop:
                    10,

                  fontSize:
                    13,

                  color:
                    "#6b7280",
                }}
              >
                Mode:{" "}
                <strong>
                  {mode === "ai"
                    ? "AI vs Stockfish"
                    : mode === "online"
                    ? "Play with Friend (Online)"
                    : "Two Player"}
                </strong>
              </div>

              {mode === "online" &&
                onlineColor && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      color: "#6b7280",
                    }}
                  >
                    You are playing:{" "}
                    <strong>
                      {onlineColor ===
                      "white"
                        ? "White"
                        : "Black"}
                    </strong>
                  </div>
                )}

              {mode === "online" &&
                onlineRoomId &&
                !showRoomModal && (
                  <button
                    onClick={() =>
                      setShowRoomModal(
                        true
                      )
                    }
                    style={{
                      marginTop: 10,
                      padding:
                        "6px 12px",
                      borderRadius: 6,
                      border:
                        "1px solid #d1d5db",
                      background:
                        "white",
                      color: "#111827",
                      cursor:
                        "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Show room QR code
                  </button>
                )}
            </div>

            {/* AI COACH */}

            {mode === "ai" && (
              <div
                style={{
                  background:
                    "#ffffff",

                  border:
                    "1px solid #e5e7eb",

                  borderRadius:
                    12,

                  padding:
                    18,

                  marginBottom:
                    18,

                  boxShadow:
                    "0 4px 12px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize:
                      13,

                    color:
                      "#6b7280",

                    marginBottom:
                      12,
                  }}
                >
                  AI COACH
                </div>

                {coachFeedback ? (
                  <div>
                    <div
                      style={{
                        display:
                          "inline-block",

                        padding:
                          "4px 10px",

                        borderRadius:
                          6,

                        fontSize:
                          13,

                        fontWeight:
                          700,

                        color:
                          "#ffffff",

                        background:
                          getClassificationColor(
                            coachFeedback.classification
                          ),

                        marginBottom:
                          10,
                      }}
                    >
                      {
                        coachFeedback.classification
                      }
                    </div>

                    <div
                      style={{
                        fontSize:
                          14,

                        lineHeight:
                          1.6,

                        color:
                          "#374151",

                        marginBottom:
                          10,
                      }}
                    >
                      {
                        coachFeedback.explanation
                      }
                    </div>

                    <div
                      style={{
                        fontSize:
                          12,

                        color:
                          "#9ca3af",
                      }}
                    >
                      Eval before:{" "}
                      {
                        coachFeedback.evaluation_before
                      }{" "}
                      · Eval after:{" "}
                      {
                        coachFeedback.evaluation_after
                      }{" "}
                      · Best move:{" "}
                      {
                        coachFeedback.best_move
                      }
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      color:
                        "#9ca3af",

                      fontSize:
                        14,
                    }}
                  >
                    Play a move to get
                    coaching feedback.
                  </div>
                )}
              </div>
            )}

            {/* MOVE HISTORY */}

            <div
              style={{
                background:
                  "#ffffff",

                border:
                  "1px solid #e5e7eb",

                borderRadius:
                  12,

                padding:
                  18,

                marginBottom:
                  18,

                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize:
                    13,

                  color:
                    "#6b7280",

                  marginBottom:
                    12,
                }}
              >
                MOVE HISTORY
              </div>

              <div
                style={{
                  maxHeight:
                    350,

                  overflowY:
                    "auto",
                }}
              >
                {moveHistory.length ===
                0 ? (
                  <div
                    style={{
                      color:
                        "#9ca3af",

                      fontSize:
                        14,
                    }}
                  >
                    No moves yet.
                  </div>
                ) : (
                  moveHistory.map(
                    (
                      move,
                      index
                    ) => {
                      const isLatest =
                        index ===
                        moveHistory.length -
                          1;

                      return (
                        <div
                          key={
                            index
                          }
                          style={{
                            display:
                              "grid",

                            gridTemplateColumns:
                              "45px 1fr 1fr",

                            padding:
                              "9px 10px",

                            borderRadius:
                              7,

                            background:
                              isLatest
                                ? "#eff6ff"
                                : "transparent",

                            fontSize:
                              14,

                            marginBottom:
                              3,
                          }}
                        >
                          <div
                            style={{
                              color:
                                "#6b7280",

                              fontWeight:
                                600,
                            }}
                          >
                            {
                              move.moveNumber
                            }.
                          </div>

                          <div
                            style={{
                              fontWeight:
                                isLatest
                                  ? 700
                                  : 400,
                            }}
                          >
                            {
                              move.white
                            }
                          </div>

                          <div
                            style={{
                              fontWeight:
                                isLatest
                                  ? 700
                                  : 400,
                            }}
                          >
                            {
                              move.black ||
                              ""
                            }
                          </div>
                        </div>
                      );
                    }
                  )
                )}
              </div>
            </div>

            {/* INSTRUCTIONS */}

            <div
              style={{
                background:
                  "#ffffff",

                border:
                  "1px solid #e5e7eb",

                borderRadius:
                  12,

                padding:
                  18,

                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize:
                    13,

                  color:
                    "#6b7280",

                  marginBottom:
                    12,
                }}
              >
                HOW TO PLAY
              </div>

              <div
                style={{
                  fontSize:
                    14,

                  lineHeight:
                    1.7,

                  color:
                    "#374151",
                }}
              >
                <div>
                  • Drag a piece to
                  move it.
                </div>

                <div>
                  • Or click a piece
                  and then click its
                  destination.
                </div>

                <div>
                  • Green squares
                  show legal moves.
                </div>

                <div>
                  • Red squares show
                  captures.
                </div>

                <div>
                  • Yellow shows the
                  selected piece.
                </div>

                <div>
                  • Castling is handled
                  automatically.
                </div>

                <div>
                  • En passant is
                  supported.
                </div>

                <div>
                  • Promotion gives
                  you a choice of
                  Queen, Rook, Bishop
                  or Knight.
                </div>

                <div>
                  • Undo restores the
                  previous position.
                </div>

                <div>
                  • Restart starts the
                  current game again.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          ROOM / QR MODAL
      ===================================================== */}

      {showRoomModal && onlineRoomId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              padding: 28,
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.25)",
              minWidth: 320,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Invite a Friend
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#6b7280",
                marginBottom: 18,
              }}
            >
              {onlineConnection ===
              "connected"
                ? "Opponent connected!"
                : "Scan this QR code or share the link. You play White."}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "center",
                marginBottom: 18,
              }}
            >
              <QRCodeSVG
                value={
                  window.location.href
                }
                size={200}
              />
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#374151",
                wordBreak: "break-all",
                background: "#f3f4f6",
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 16,
              }}
            >
              {window.location.href}
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
              }}
            >
              <button
                onClick={() => {
                  navigator.clipboard
                    .writeText(
                      window.location
                        .href
                    )
                    .catch(() => {});
                }}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border:
                    "1px solid #2563eb",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Copy Link
              </button>

              <button
                onClick={() =>
                  setShowRoomModal(false)
                }
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border:
                    "1px solid #d1d5db",
                  background: "white",
                  color: "#111827",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          PROMOTION MODAL
      ===================================================== */}

      {promotionPending && (
        <div
          style={{
            position:
              "fixed",

            inset: 0,

            background:
              "rgba(0,0,0,0.35)",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            zIndex: 1000,
          }}
        >
          <div
            style={{
              background:
                "#ffffff",

              borderRadius:
                14,

              padding:
                24,

              boxShadow:
                "0 20px 50px rgba(0,0,0,0.25)",

              minWidth:
                300,

              textAlign:
                "center",
            }}
          >
            <div
              style={{
                fontSize:
                  20,

                fontWeight:
                  700,

                marginBottom:
                  18,
              }}
            >
              Promote Pawn
            </div>

            <div
              style={{
                display:
                  "flex",

                flexDirection:
                  "column",

                gap: 10,
              }}
            >
              {[
                {
                  value: "q",
                  label: "Queen",
                },

                {
                  value: "r",
                  label: "Rook",
                },

                {
                  value: "b",
                  label: "Bishop",
                },

                {
                  value: "n",
                  label: "Knight",
                },
              ].map(
                (option) => (
                  <button
                    key={
                      option.value
                    }
                    onClick={() =>
                      choosePromotion(
                        option.value
                      )
                    }
                    style={{
                      width:
                        "100%",

                      minHeight:
                        64,

                      padding:
                        "8px 14px",

                      borderRadius:
                        8,

                      border:
                        "1px solid #d1d5db",

                      background:
                        "#ffffff",

                      color:
                        "#111827",

                      cursor:
                        "pointer",

                      display:
                        "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      gap: 14,

                      fontSize:
                        16,

                      fontWeight:
                        600,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "center",

                        background:
                          promotionPending.color ===
                          "w"
                            ? "#f3f4f6"
                            : "#e5e7eb",

                        borderRadius:
                          8,
                      }}
                    >
                      <PromotionPieceIcon
                        color={
                          promotionPending.color
                        }
                        type={
                          option.value
                        }
                      />
                    </div>

                    <span
                      style={{
                        minWidth:
                          70,

                        textAlign:
                          "left",
                      }}
                    >
                      {
                        option.label
                      }
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          CAPTURE ANIMATION
      ===================================================== */}

      <style>
        {`
          @keyframes captureFly {
            0% {
              transform:
                translate3d(
                  var(--start-x),
                  var(--start-y),
                  0
                )
                scale(1);
              opacity: 1;
            }

            25% {
              transform:
                translate3d(
                  calc(
                    var(--start-x) +
                    (
                      var(--end-x) -
                      var(--start-x)
                    ) * 0.25
                  ),
                  calc(
                    var(--start-y) -
                    30px
                  ),
                  0
                )
                scale(1.08);
              opacity: 1;
            }

            70% {
              transform:
                translate3d(
                  calc(
                    var(--start-x) +
                    (
                      var(--end-x) -
                      var(--start-x)
                    ) * 0.75
                  ),
                  calc(
                    var(--start-y) +
                    (
                      var(--end-y) -
                      var(--start-y)
                    ) * 0.75 -
                    20px
                  ),
                  0
                )
                scale(0.9);
              opacity: 0.95;
            }

            100% {
              transform:
                translate3d(
                  var(--end-x),
                  var(--end-y),
                  0
                )
                scale(0.35);
              opacity: 0;
            }
          }

          button {
            transition:
              background 0.15s ease,
              border-color 0.15s ease,
              transform 0.1s ease;
          }

          button:not(:disabled):hover {
            transform:
              translateY(-1px);
          }

          button:not(:disabled):active {
            transform:
              translateY(0);
          }
        `}
      </style>
    </div>
  );
}

export default App;