import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  password: string;
  username: string;
}

const userSchema: Schema<IUser> = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
    required: true,
  },
  lastName: {
    type: String,
    trim: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    required: true,
  },
});

export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

// Batter Schema
const BatterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  runs: { type: Number, default: 0 },
  ballsFaced: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
});

// Bowler Schema
const BowlerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ballsBowled: { type: Number, default: 0 },
  oversBowled: { type: Number, default: 0 },
  runsConceded: { type: Number, default: 0 },
  wicketsTaken: { type: Number, default: 0 },
});

// Team Schema
const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  totalRuns: { type: Number, default: 0 },
  extras: {
    wide: { type: Number, default: 0 },
    noBall: { type: Number, default: 0 },
  },
  wicketsLost: { type: Number, default: 0 },
  overs: { type: Number, default: 0 },
  batters: {
    striker: { type: BatterSchema, default: null },
    nonStriker: { type: BatterSchema, default: null },
  },
  bowlers: {
    bowler: { type: BowlerSchema, default: null },
    nonBowler: { type: BowlerSchema, default: null },
  },
});

// Match Schema
const MatchSchema = new mongoose.Schema({
  teamA: TeamSchema,
  teamB: TeamSchema,
  currentBattingTeam: {
    type: String,
    enum: ["teamA", "teamB"],
    default: "teamA",
  },
  currentOver: {
    ballsBowled: { type: Number, default: 0 },
    overNumber: { type: Number, default: 0 },
  },
  innings: {
    type: Number,
    enum: [1, 2],
    default: 1,
  },
  isOver: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },
  commentary: [
    {
      ball: { type: String, default: "0.0" },
      run: { type: Number, default: 0 },
      text: { type: String },
    },
  ],
});

export const Match = mongoose.model("Match", MatchSchema);
