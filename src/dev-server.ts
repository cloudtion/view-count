import "dotenv/config";
import http from "http";
import fs from "fs";
import path from "path";
import { createViewCounter, RequestLike, ResponseLike, COLORS } from ".";

const required = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
] as const;
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  missing.forEach((key) => console.error(`  - ${key}`));
  console.error(
    "\nCopy .env.example to .env and fill in your Firebase credentials."
  );
  process.exit(1);
}

const cacheTtlMs = process.env.CACHE_TTL_MS
  ? parseInt(process.env.CACHE_TTL_MS, 10)
  : undefined;

const counter = createViewCounter({
  firebaseConfig: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    collectionName: process.env.FIREBASE_COLLECTION_NAME ?? "view-counts",
  },
  cacheTtlMs,
});

const PORT = process.env.PORT || 3000;
const CACHE_TTL_DISPLAY = ((cacheTtlMs ?? 1800000) / 60000).toFixed(0);
const colorNames = Object.keys(COLORS).join(", ");

async function handleCounter(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  path: string
): Promise<void> {
  const mockReq: RequestLike = {
    headers: req.headers as Record<string, string | string[] | undefined>,
    ip: req.socket.remoteAddress,
    url: req.url,
    path,
  };

  let statusCode = 200;
  const headers: Record<string, string> = {};

  const mockRes: ResponseLike = {
    setHeader(key: string, value: string) {
      headers[key] = value;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    send(body: string) {
      res.writeHead(statusCode, headers);
      res.end(body);
    },
  };

  await counter.handler(mockReq, mockRes);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  if (url.pathname === "/") {
    const indexPath = path.join(__dirname, "..", "public", "index.html");
    try {
      const html = fs.readFileSync(indexPath, "utf-8");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    } catch {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Error loading index.html");
    }
    return;
  }

  if (url.pathname === "/views" || url.pathname === "/visitors") {
    await handleCounter(req, res, url.pathname + url.search);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n  view-count dev server running at:\n`);
  console.log(`  → http://localhost:${PORT}\n`);
  console.log(`  Endpoints: /views, /visitors`);
  console.log(`  Colors: ${colorNames}`);
  console.log(`  Cache TTL: ${CACHE_TTL_DISPLAY} minutes\n`);
});
