import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "@/models/User";

interface AuthRequest extends Request {
  body: {
    email: string;
    password: string;
    name?: string;
  };
}

interface AuthResponse {
  userId: string;
  email: string;
  name: string;
  token: string;
}

export const register = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Create new user
    const user = new User({ name, email, password });
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" },
    );

    const response: AuthResponse = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      token,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error(
      "Register error:",
      error instanceof Error ? error.message : error,
    );
    const errorMsg =
      error instanceof Error ? error.message : "Registration failed";
    res.status(500).json({ error: errorMsg });
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" },
    );

    const response: AuthResponse = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      token,
    };

    res.json(response);
  } catch (error) {
    console.error(
      "Login error:",
      error instanceof Error ? error.message : error,
    );
    const errorMsg = error instanceof Error ? error.message : "Login failed";
    res.status(500).json({ error: errorMsg });
  }
};

export const verify = async (
  req: Request & { userId?: string },
  res: Response,
): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    res.status(500).json({ error: "Verification failed" });
  }
};
