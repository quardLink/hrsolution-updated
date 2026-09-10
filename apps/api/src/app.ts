import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import zktecoRouter from "./routes/zkteco";
import { logger } from "./lib/logger";

const app: Express = express();

// Both Vercel and the local Vite dev proxy sit in front of this app, so
// req.ip needs to trust the X-Forwarded-For header to reflect the real
// client IP (used only for the informational IP shown on paired devices,
// not for any security decision).
app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// credentials: true + a reflected origin (rather than "*") is required for
// the admin session cookie to work — in practice the frontend and API are
// always same-origin (Vite dev proxy locally, Vercel rewrites in prod), so
// this mainly guards against someone embedding the API cross-origin.
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());

// Fingerprint terminals (ZKTeco ADMS/PUSH protocol) call fixed /iclock/*
// paths at the app root, not under /api, and send raw text bodies — this
// has to run before the JSON/urlencoded parsers below so it can read the
// body itself instead of getting an empty one. Scoped to the "/iclock"
// prefix (not a blanket app.use) so its raw-text body parser can't also
// swallow the body of unrelated requests like /api/auth/login.
app.use("/iclock", zktecoRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
