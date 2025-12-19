import * as functions from "firebase-functions";
import type { Response } from "express";
import { createViewCounter } from "./counter";
import type { RequestLike, ResponseLike } from "./counter";

const DEFAULT_CACHE_TTL_SECONDS = 30 * 60; // 30 minutes

// Create counter instance - uses Firebase Admin SDK initialized by the environment
const counter = createViewCounter({
  firebaseConfig: {
    // When running in Firebase Functions, these are auto-configured
    projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || "",
    clientEmail: "", // Not needed when running in Firebase Functions environment
    privateKey: "", // Not needed when running in Firebase Functions environment
    collectionName: "view-counts",
  },
});

// Adapter to convert Firebase Functions request to RequestLike
function toRequestLike(req: functions.https.Request): RequestLike {
  return {
    headers: req.headers as Record<string, string | string[] | undefined>,
    ip: req.ip,
    url: req.url,
    path: req.path,
    query: req.query as Record<string, string | string[] | undefined>,
  };
}

// Adapter to convert Firebase Functions response to ResponseLike
function toResponseLike(res: Response): ResponseLike {
  return {
    setHeader(name: string, value: string) {
      res.setHeader(name, value);
    },
    status(code: number) {
      res.status(code);
      return this;
    },
    send(body: string) {
      res.send(body);
    },
  };
}

// Views endpoint
export const views = functions.https.onRequest(async (req, res) => {
  res.setHeader(
    "Cache-Control",
    `public, max-age=${DEFAULT_CACHE_TTL_SECONDS}, s-maxage=${DEFAULT_CACHE_TTL_SECONDS}`
  );
  await counter.handler(toRequestLike(req), toResponseLike(res));
});

// Visitors endpoint
export const visitors = functions.https.onRequest(async (req, res) => {
  res.setHeader(
    "Cache-Control",
    `public, max-age=${DEFAULT_CACHE_TTL_SECONDS}, s-maxage=${DEFAULT_CACHE_TTL_SECONDS}`
  );
  await counter.handler(toRequestLike(req), toResponseLike(res));
});
