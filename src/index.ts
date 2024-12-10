import express from "express";
import http from "http";
import mongoose, { Types } from "mongoose";
import cors from "cors";
import WebSocket, { WebSocketServer } from "ws";
import mainRouter from "./routes/index";
import { Match } from "./db";
import authMiddleware from "./middleware";

const app = express();
const PORT = 3001;

mongoose.connect(process.env.MONGODB_CONNECTION_STRING || "", {
  dbName: "cricket",
});

app.use(cors());
app.use(express.json());
app.use("/api/v1", mainRouter);

const MAX_OVER = 1;

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

// WebSocket Clients
const clients = new Set<WebSocket>();

function generateCommentary({
  run,
  extras,
  isWicket,
}: {
  run: number;
  extras: string;
  isWicket: boolean;
}) {
  if (isWicket) return "Wicket fallen!";

  if (extras) {
    if (extras === "wide") return "1 wide ball";

    if (extras === "noBall") return `No ball, ${run} runs`;
  }

  return `${run} run${run !== 1 ? "s" : ""} to striker`;
}

// Update Scoreboard API
app.post("/api/update-score", authMiddleware, async (req, res) => {
  let matchCompleteMessage = "";

  try {
    let match = await Match.findOne();

    if (match?.isOver === 1) {
      await Match.deleteOne({ isOver: 1 });
      match = null;
    }

    if (!match) {
      // Initialize the match if not found
      match = new Match({
        teamA: {
          name: "India",
          batters: {
            striker: { name: "Virat Kohli" },
            nonStriker: { name: "M.S. Dhoni" },
          },
          bowlers: {
            bowler: { name: "Mohammed Shami" },
            nonBowler: { name: "Jasprit Bumrah" },
          },
        },
        teamB: {
          name: "Bangladesh",
          batters: {
            striker: { name: "Shakib Al. Hassan" },
            nonStriker: { name: "Moen Ali" },
          },
          bowlers: {
            bowler: { name: "Adam Zampa" },
            nonBowler: { name: "Trent Boult" },
          },
        },
      });
    }

    let currentBattingTeam =
      match.currentBattingTeam === "teamA" ? match.teamA : match.teamB;

    let currentBowlingTeam =
      match.currentBattingTeam === "teamA" ? match.teamB : match.teamA;

    if (!currentBattingTeam) {
      res.status(400).json({ error: "Current batting team not found" });
      return;
    }

    if (!currentBowlingTeam) {
      res.status(400).json({ error: "Current bowling team not found" });
      return;
    }

    // Ensure `batters` is defined
    if (!currentBattingTeam?.batters) {
      res.status(400).json({ error: "Current batsmen not set up" });
      return;
    }

    // Ensure `bowlers` is defined
    if (!currentBowlingTeam?.bowlers) {
      res.status(400).json({ error: "Current bowler not set up" });
      return;
    }

    const { run, extras, isWicket } = req.body;

    const totalRuns = run + (extras === "" || extras === "start" ? 0 : 1);
    if (isWicket) {
      currentBattingTeam.wicketsLost += 1;
      currentBattingTeam.batters.striker.runs = 0;
      currentBattingTeam.batters.striker.fours = 0;
      currentBattingTeam.batters.striker.sixes = 0;
      currentBattingTeam.batters.striker.ballsFaced = 0;

      currentBowlingTeam.bowlers.bowler.wicketsTaken += 1;
    } else {
      // Update runs and stats
      currentBattingTeam.totalRuns += totalRuns;
      currentBattingTeam.batters.striker.runs += run;

      if (!currentBattingTeam.extras) {
        currentBattingTeam.extras = { wide: 0, noBall: 0 };
      }

      if (extras === "") currentBattingTeam.batters.striker.ballsFaced += 1;
      else if (extras === "wide") currentBattingTeam.extras.wide += 1;
      else if (extras === "noBall") currentBattingTeam.extras.noBall += 1;

      // Update specific run stats
      if (run === 4) currentBattingTeam.batters.striker.fours += 1;
      if (run === 6) currentBattingTeam.batters.striker.sixes += 1;

      // Handle strike change
      if (run % 2 !== 0) {
        [
          currentBattingTeam.batters.striker,
          currentBattingTeam.batters.nonStriker,
        ] = [
          currentBattingTeam.batters.nonStriker,
          currentBattingTeam.batters.striker,
        ];
      }

      currentBowlingTeam.bowlers.bowler.runsConceded += totalRuns;
    }

    // Update over and ball tracking
    if (!match.currentOver) {
      match.currentOver = { ballsBowled: 0, overNumber: 0 };
    }

    if (extras === "") {
      match.currentOver.ballsBowled += 1;
      currentBowlingTeam.bowlers.bowler.ballsBowled += 1;
    }

    // Over completion logic
    if (match.currentOver.ballsBowled === 6) {
      match.currentOver.ballsBowled = 0;
      match.currentOver.overNumber += 1;
      currentBattingTeam.overs += 1;
      currentBowlingTeam.bowlers.bowler.ballsBowled = 0;
      currentBowlingTeam.bowlers.bowler.oversBowled += 1;

      // Swap striker
      [
        currentBattingTeam.batters.striker,
        currentBattingTeam.batters.nonStriker,
      ] = [
        currentBattingTeam.batters.nonStriker,
        currentBattingTeam.batters.striker,
      ];

      // Swap bowler
      [
        currentBowlingTeam.bowlers.bowler,
        currentBowlingTeam.bowlers.nonBowler,
      ] = [
        currentBowlingTeam.bowlers.nonBowler,
        currentBowlingTeam.bowlers.bowler,
      ];
    }

    if (
      currentBattingTeam.wicketsLost === 10 ||
      match.currentOver?.overNumber === MAX_OVER
    ) {
      if (
        match.innings === 2 &&
        match.currentBattingTeam === "teamB" &&
        (match.teamB?.wicketsLost === 10 || match.teamB?.overs === MAX_OVER)
      ) {
        match.isOver = 1;
        const winningTeam =
          currentBattingTeam.totalRuns > currentBowlingTeam.totalRuns
            ? currentBattingTeam
            : currentBowlingTeam;

        if (winningTeam === currentBowlingTeam) {
          let runDifference =
            currentBattingTeam.totalRuns - currentBowlingTeam.totalRuns;
          if (runDifference < 0) runDifference *= -1;

          matchCompleteMessage = `${winningTeam.name} won by ${runDifference} runs!`;
        }

        matchCompleteMessage = `${winningTeam.name} won by ${
          10 - winningTeam.wicketsLost
        } wickets!`;
      } else if (match.innings === 1) {
        match.currentBattingTeam = "teamB";
        match.innings = 2;
        currentBattingTeam = match.teamB;
        currentBowlingTeam = match.teamA;
        match.currentOver.overNumber = 0;
        match.currentOver.ballsBowled = 0;

        if (!currentBattingTeam) {
          res.status(400).json({ error: "Current batting team not found" });
          return;
        }

        if (!currentBowlingTeam) {
          res.status(400).json({ error: "Current bowling team not found" });
          return;
        }

        // Ensure `batters` is defined
        if (!currentBattingTeam?.batters) {
          res.status(400).json({ error: "Current batsmen not set up" });
          return;
        }

        // Ensure `bowlers` is defined
        if (!currentBowlingTeam?.bowlers) {
          res.status(400).json({ error: "Current bowler not set up" });
          return;
        }
      }
    }

    if (extras !== "start") {
      // Add commentary
      const commentaryText = generateCommentary(req.body);
      const currBall =
        match.currentOver.overNumber + "." + match.currentOver.ballsBowled;
      match.commentary.push({ ball: currBall, run, text: commentaryText });
    }
    await match.save();

    // Broadcast to all WebSocket clients
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            match,
            type: "scoreUpdate",
          })
        );
      }
    });

    if (
      match.innings === 2 &&
      (match.teamB?.overs === MAX_OVER || match.teamB?.wicketsLost === 10)
    ) {
      res.json({
        matchOver: matchCompleteMessage,
      });
      return;
    }

    res.json({ success: true, match });
  } catch (error) {
    res.status(500).json({ message: "Error updating score" });
  }
});

// WebSocket Connection Handling
wss.on("connection", (ws) => {
  clients.add(ws);

  ws.on("close", () => {
    clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
