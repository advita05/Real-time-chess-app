const socket = io();

const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const roleText = document.getElementById("roleText");
const turnDot = document.getElementById("turnDot");
const turnText = document.getElementById("turnText");
const banner = document.getElementById("gameOverBanner");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let gameEnded = false;

const roleLabels = { w: "White", b: "Black" };

const updateNameplate = () => {
  roleText.innerText = playerRole ? roleLabels[playerRole] : "Spectator";

  if (gameEnded) return; 

  const turn = chess.turn();
  const isMyTurn = playerRole === turn;

  if (playerRole === null) {
    turnDot.classList.add("waiting");
    turnText.innerText = `${roleLabels[turn]} to move`;
  } else if (isMyTurn) {
    turnDot.classList.remove("waiting");
    turnText.innerText = "Your move";
  } else {
    turnDot.classList.add("waiting");
    turnText.innerText = `${roleLabels[turn]} to move`;
  }
};

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  const flipped = playerRole === "b";

  for (let displayRow = 0; displayRow < 8; displayRow++) {
    for (let displayCol = 0; displayCol < 8; displayCol++) {
      const rowindex = flipped ? 7 - displayRow : displayRow;
      const squareindex = flipped ? 7 - displayCol : displayCol;
      const square = board[rowindex][squareindex];

      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowindex + squareindex) % 2 === 0 ? "light" : "dark",
      );
      squareElement.dataset.row = rowindex;
      squareElement.dataset.column = squareindex;

      if (square) {
        const pieceElement = document.createElement("div");

        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black",
        );
        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable =
          !gameEnded &&
          playerRole === square.color &&
          chess.turn() === playerRole;
        if (pieceElement.draggable) pieceElement.classList.add("draggable");

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowindex, col: squareindex };
            pieceElement.classList.add("dragging");
            e.dataTransfer.setData("text/plain", "");
          }
        });
        pieceElement.addEventListener("dragend", () => {
          pieceElement.classList.remove("dragging");
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", function (e) {
        e.preventDefault();
        if (!gameEnded) squareElement.classList.add("drag-over");
      });
      squareElement.addEventListener("dragleave", function () {
        squareElement.classList.remove("drag-over");
      });
      squareElement.addEventListener("drop", function (e) {
        e.preventDefault();
        squareElement.classList.remove("drag-over");
        if (draggedPiece && !gameEnded) {
          const targetSquare = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.column),
          };
          handleMove(sourceSquare, targetSquare);
        }
      });

      boardElement.appendChild(squareElement);
    }
  }

  updateNameplate();
};

const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q",
  };
  socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
  const unicodePieces = {
    P: { w: "♙", b: "♟" },
    R: { w: "♖", b: "♜" },
    N: { w: "♘", b: "♞" },
    B: { w: "♗", b: "♝" },
    Q: { w: "♕", b: "♛" },
    K: { w: "♔", b: "♚" },
  };

  return unicodePieces[piece.type.toUpperCase()][piece.color];
};

socket.on("playerRole", function (role) {
  playerRole = role;
  renderBoard();
});

socket.on("spectatorRole", function () {
  playerRole = null;
  renderBoard();
});

socket.on("boardState", function (fen) {
  chess.load(fen);
  renderBoard();
});

socket.on("gameOver", function (message) {
  gameEnded = true;
  turnDot.classList.add("waiting");
  turnText.innerText = "Game over";
  banner.innerText = message;
  banner.classList.add("visible");
  renderBoard(); 
});

renderBoard();