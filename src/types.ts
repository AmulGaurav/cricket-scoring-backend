import { z } from "zod";

export const signupSchema = z.object({
  firstName: z.string().max(30, "First name cannot exceed 30 characters."),
  lastName: z.string().max(30, "Last name cannot exceed 30 characters."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters.")
    .max(20, "Password cannot exceed 20 characters."),
  username: z.string().email("Invalid email address.").min(5).max(50),
});

export const signinSchema = z.object({
  password: z.string().min(6).max(20),
  username: z.string().email().min(5).max(50),
});
