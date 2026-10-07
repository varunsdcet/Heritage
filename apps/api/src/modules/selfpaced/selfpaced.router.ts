import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { issueSelfpacedCertificate } from "./selfpaced.service.js";

export const selfpacedRouter: Router = Router();

selfpacedRouter.post("/certificates", requireAuth, async (req, res, next) => {
  try {
    const out = await issueSelfpacedCertificate((req as AuthedRequest).user, req.body);
    res.status(out.created ? 201 : 200).json(out);
  } catch (err) {
    next(err);
  }
});
