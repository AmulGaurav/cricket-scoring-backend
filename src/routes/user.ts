import express, { Request, Response } from "express";
import { signinSchema, signupSchema } from "../types";
import authMiddleware from "../middleware";
import { User } from "../db";
import jwt from "jsonwebtoken";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "";

// extended Request interface to include `userId` from authMiddleware
interface AuthenticatedRequest extends Request {
  userId?: string;
}

router.get(
  "/me",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await User.findById(req.userId, "firstName");
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.json({ name: user.firstName });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { success } = signupSchema.safeParse(req.body);

    if (!success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }

    const existingUser = await User.findOne(
      { username: req.body.username },
      "_id"
    );

    if (existingUser) {
      res.status(409).json({ message: "username already exists" });
      return;
    }

    const newUser = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      password: req.body.password,
      username: req.body.username,
    });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, {
      expiresIn: "5h",
    });

    res.json({ message: "User signed up successfully!", token });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/signin", async (req: Request, res: Response) => {
  try {
    const { success } = signinSchema.safeParse(req.body);

    if (!success) {
      res.status(400).json({ message: "Invalid input" });
      return;
    }

    const user = await User.findOne(
      { username: req.body.username, password: req.body.password },
      "_id"
    );

    if (!user) {
      res.status(404).json({ message: "User does not exist" });
      return;
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "5h",
    });

    res.json({ message: "User signed in successfully!", token });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
