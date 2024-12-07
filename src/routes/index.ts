import express, { Request, Response } from "express";
import userRouter from "./user";

const router = express.Router();

router.use("/user", userRouter);

router.get("/", (req: Request, res: Response) => {
  res.send("This is the test route!");
});

export default router;
