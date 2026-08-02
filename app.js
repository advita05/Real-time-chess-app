const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const chess = new Chess();

let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess game" });
});

function getGameOverMessage() {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    return `Checkmate — ${winner} wins`;
  }
  if (chess.isStalemate()) return "Draw by stalemate";
  if (chess.isThreefoldRepetition()) return "Draw by repetition";
  if (chess.isInsufficientMaterial()) return "Draw — insufficient material";
  if (chess.isDraw()) return "Draw";
  return "Game over";
}

io.on("connection", function (uniquesocket) {
  console.log("connected");

  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b");
  } else {
    uniquesocket.emit("spectatorRole");
  }

  uniquesocket.emit("boardState", chess.fen());
  if (chess.isGameOver()) {
    uniquesocket.emit("gameOver", getGameOverMessage());
  }

  uniquesocket.on("disconnect", function () {
    if (uniquesocket.id === players.white) {
      delete players.white;
    }
    if (uniquesocket.id === players.black) {
      delete players.black;
    }
  });

  uniquesocket.on("move", function (move) {
    try {
      if (chess.isGameOver()) return;

      if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
      if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

      const result = chess.move(move);

      if (result) {
        currentPlayer = chess.turn();

        io.emit("boardState", chess.fen());

        if (chess.isGameOver()) {
          io.emit("gameOver", getGameOverMessage());
        }
      } else {
        console.log("Invalid move:", move);
      }
    } catch (err) {
      console.log("Move error:", err);
    }
  });
});

server.listen(3000, function () {
  console.log("listening on port 3000");
});