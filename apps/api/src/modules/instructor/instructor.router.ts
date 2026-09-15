import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRoles, type AuthedRequest } from "../../middleware/auth.js";
import {
  buildInstructorBootstrap,
  buildInstructorScreen,
  runInstructorAction,
} from "./instructor.service.js";

export const instructorRouter: Router = Router();

instructorRouter.use(requireAuth, requireRoles("instructor", "admin"));

instructorRouter.get("/sis/bootstrap", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    res.json(await buildInstructorBootstrap(user));
  } catch (err) {
    next(err);
  }
});

instructorRouter.get("/sis/screen", async (req, res, next) => {
  try {
    const user = (req as AuthedRequest).user;
    const path = String(req.query.path ?? "");
    if (!path.startsWith("/instructor")) {
      res.status(400).json({ error: { message: "path must start with /instructor" } });
      return;
    }
    res.json(await buildInstructorScreen(path, user));
  } catch (err) {
    next(err);
  }
});

instructorRouter.post("/sis/action", async (req, res, next) => {
  try {
    const body = z
      .object({
        path: z.string().min(1),
        action: z.string().min(1),
        rowKey: z.string().optional(),
      })
      .parse(req.body);
    const user = (req as AuthedRequest).user;
    if (!body.path.startsWith("/instructor")) {
      res.status(400).json({ error: { message: "path must start with /instructor" } });
      return;
    }
    res.json(await runInstructorAction(user, body));
  } catch (err) {
    next(err);
  }
});
