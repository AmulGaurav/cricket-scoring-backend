import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import { WebSocketServer } from "ws";
import mainRouter from "./routes/index";

const app = express();
const PORT = 3001;

mongoose.connect(process.env.MONGODB_CONNECTION_STRING || "", {
  dbName: "cricket",
});

app.use(cors());
app.use(express.json());
app.use("/api/v1", mainRouter);

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on("connection", async (ws, req) => {
  console.log("someone connected");

  ws.on("message", (message) => {
    console.log("received: " + message);
    ws.send("Hello, you sent -> " + message);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
