import crypto from "crypto";
import {
  FirebaseConfig,
  getStats,
  initializeFirebase,
  PageStats,
  recordView,
} from "./firebase";
import { COLORS, DEFAULT_STYLE, generateSvg, StyleOptions } from "./svg";

const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export enum CounterMode {
  Views = "Views",
  Visitors = "Visitors",
}

export interface ViewCounterOptions {
  firebaseConfig: FirebaseConfig;
  style?: StyleOptions;
  cacheTtlMs?: number;
}

export interface RequestLike {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  url?: string;
  path?: string;
  query?: Record<string, string | string[] | undefined>;
}

export interface ResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): this;
  send(body: string): void;
}

export interface ViewCounter {
  handler(req: RequestLike, res: ResponseLike): Promise<void>;
  getStats(pageUrl: string): Promise<PageStats>;
  recordView(pageUrl: string, visitorId: string): Promise<PageStats>;
  preview(count: number, mode?: CounterMode, color?: string): string;
}

function getVisitorId(req: RequestLike): string {
  const ip =
    req.ip ||
    (req.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (req.headers?.["x-real-ip"] as string) ||
    "unknown";

  const userAgent = (req.headers?.["user-agent"] as string) || "";

  return crypto
    .createHash("sha256")
    .update(`${ip}:${userAgent}`)
    .digest("hex")
    .substring(0, 32);
}

function getPageUrl(req: RequestLike): string | null {
  // First try Referer header (most secure, can't be spoofed by end users)
  const referer =
    (req.headers?.["referer"] as string) ||
    (req.headers?.["referrer"] as string);

  if (referer) {
    try {
      const url = new URL(referer);
      return `${url.origin}${url.pathname}`;
    } catch {
      return referer;
    }
  }

  // Fall back to ?fallback-id= parameter (for environments like GitHub that strip Referer)
  let fallbackId: string | undefined;
  if (req.query?.["fallback-id"]) {
    fallbackId = Array.isArray(req.query["fallback-id"])
      ? req.query["fallback-id"][0]
      : req.query["fallback-id"];
  } else if (req.url?.includes("?")) {
    const searchParams = new URLSearchParams(req.url.split("?")[1]);
    fallbackId = searchParams.get("fallback-id") || undefined;
  }

  if (fallbackId) {
    return `fallback:${fallbackId}`;
  }

  return null;
}

function parseRequest(req: RequestLike): {
  mode: CounterMode;
  color: string | undefined;
} {
  const path = req.path || req.url?.split("?")[0] || "";
  const mode = path.endsWith("/visitors")
    ? CounterMode.Visitors
    : CounterMode.Views;

  // Get color from query params
  let color: string | undefined;
  if (req.query?.color) {
    color = Array.isArray(req.query.color)
      ? req.query.color[0]
      : req.query.color;
  } else if (req.url?.includes("?")) {
    const searchParams = new URLSearchParams(req.url.split("?")[1]);
    color = searchParams.get("color") || undefined;
  }

  return { mode, color };
}

export function createViewCounter(options: ViewCounterOptions): ViewCounter {
  if (!options.firebaseConfig) {
    throw new Error("firebaseConfig is required");
  }

  initializeFirebase(options.firebaseConfig);

  const style = { ...DEFAULT_STYLE, ...options.style };
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const cacheTtlSeconds = Math.floor(cacheTtlMs / 1000);

  async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
    try {
      const pageUrl = getPageUrl(req);

      if (!pageUrl) {
        res.status(400).send("Missing Referer header. Use ?fallback-id=your-id for environments that strip Referer (e.g., GitHub READMEs).");
        return;
      }

      const visitorId = getVisitorId(req);
      const { mode, color } = parseRequest(req);
      const stats = await recordView(pageUrl, visitorId);

      const count =
        mode === CounterMode.Visitors ? stats.visitors : stats.views;
      const label = mode; // CounterMode.Views = "Views", CounterMode.Visitors = "Visitors"
      const svg = generateSvg(count, { ...style, label, color });

      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader(
        "Cache-Control",
        `public, max-age=${cacheTtlSeconds}, s-maxage=${cacheTtlSeconds}`
      );

      res.status(200).send(svg);
    } catch (error) {
      console.error("View counter error:", error);
      res.status(500).send("Internal server error");
    }
  }

  function preview(
    count: number,
    mode: CounterMode = CounterMode.Views,
    color?: string
  ): string {
    const label = mode;
    return generateSvg(count, { ...style, label, color });
  }

  return {
    handler,
    getStats,
    recordView,
    preview,
  };
}

export { COLORS };
