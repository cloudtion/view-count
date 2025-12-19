import "dotenv/config";
import http from "http";
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

function renderTestPage(pageName: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>${pageName} - view-count test</title>
  </head>
  <body style="font-family: system-ui; max-width: 700px; margin: 50px auto; padding: 20px;">
    <h1>${pageName}</h1>
    <p>This page tracks both views and unique visitors. Cache TTL: ${CACHE_TTL_DISPLAY} minutes.</p>

    <h3>Views (total page loads):</h3>
    <p><img src="/views" alt="view count" /></p>

    <h3>Visitors (unique):</h3>
    <p><img src="/visitors" alt="visitor count" /></p>

    <h3>Color variants:</h3>
    <p>
      <img src="/views?color=green" alt="green" />
      <img src="/views?color=blue" alt="blue" />
      <img src="/views?color=red" alt="red" />
      <img src="/views?color=orange" alt="orange" />
      <img src="/views?color=purple" alt="purple" />
      <img src="/views?color=pink" alt="pink" />
      <img src="/views?color=cyan" alt="cyan" />
    </p>

    <h3>Test caching:</h3>
    <ul>
      <li>Refresh - counts stay the same (browser cached for ${CACHE_TTL_DISPLAY} min)</li>
      <li>Hard refresh (Ctrl+Shift+R) - views increase, visitors stays same</li>
      <li>Incognito window - both increase</li>
    </ul>

    <h3>Other test pages:</h3>
    <ul>
      <li><a href="/page/home">Home Page</a></li>
      <li><a href="/page/blog">Blog Page</a></li>
      <li><a href="/page/about">About Page</a></li>
    </ul>

    <p style="margin-top: 40px; color: #666; font-size: 12px;">
      Each page tracks stats separately based on URL.
    </p>
  </body>
</html>`;
}

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
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<!DOCTYPE html>
<html>
  <head><title>view-count dev server</title></head>
  <body style="font-family: system-ui; max-width: 700px; margin: 50px auto; padding: 20px;">
    <h1>view-count dev server</h1>
    <p>The counter tracks views based on the <code>Referer</code> header.</p>

    <h3>Endpoints:</h3>
    <ul>
      <li><code>/views</code> - Shows total page views</li>
      <li><code>/visitors</code> - Shows unique visitors</li>
    </ul>

    <h3>Color options:</h3>
    <p>Add <code>?color=name</code> to customize: ${colorNames}</p>

    <h3>How it works:</h3>
    <ol>
      <li>Embed <code>&lt;img src="/views" /&gt;</code> or <code>&lt;img src="/visitors" /&gt;</code></li>
      <li>Counter reads the Referer header to identify the page</li>
      <li>Browser caches the image for ${CACHE_TTL_DISPLAY} minutes</li>
    </ol>

    <h3>Test Pages:</h3>
    <ul>
      <li><a href="/page/home">Home Page</a></li>
      <li><a href="/page/blog">Blog Page</a></li>
      <li><a href="/page/about">About Page</a></li>
    </ul>

    <h3>Embed examples:</h3>
    <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px;">&lt;img src="http://localhost:${PORT}/views" alt="views" /&gt;
&lt;img src="http://localhost:${PORT}/visitors?color=blue" alt="visitors" /&gt;</pre>
  </body>
</html>`);
    return;
  }

  if (url.pathname.startsWith("/page/")) {
    const pageName = url.pathname.replace("/page/", "") || "Test Page";
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(renderTestPage(pageName));
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
  console.log(`  Test pages:`);
  console.log(`    http://localhost:${PORT}/page/home`);
  console.log(`    http://localhost:${PORT}/page/blog`);
  console.log(`    http://localhost:${PORT}/page/about\n`);
});
