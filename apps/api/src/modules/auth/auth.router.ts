import { Router } from "express";
import { LoginRequest, LoginResponse } from "@myheritage/contracts";
import { loginWithPassword } from "@myheritage/auth";

export const authRouter: Router = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = LoginRequest.parse(req.body);
    const result = await loginWithPassword({
      ...body,
      ipAddress: req.ip ?? "127.0.0.1",
      userAgent: req.header("user-agent") ?? "unknown",
    });
    res.json(LoginResponse.parse(result));
  } catch (err) {
    next(err);
  }
});
