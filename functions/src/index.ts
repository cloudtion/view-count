import * as functions from "firebase-functions";
import admin from "firebase-admin";
import crypto from "crypto";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

const COLLECTION_NAME = "view-counts";
const DEFAULT_CACHE_TTL_SECONDS = 30 * 60; // 30 minutes

// Color presets
const COLORS: Record<string, string> = {
  green: "#4c1",
  blue: "#007ec6",
  red: "#e05d44",
  orange: "#fe7d37",
  yellow: "#dfb317",
  purple: "#9f7be1",
  pink: "#e85aad",
  gray: "#555",
  black: "#1a1a1a",
  cyan: "#24b9a7",
};

function getColor(color: string | undefined): string {
  if (!color) return COLORS.green;
  if (color in COLORS) return COLORS[color];
  if (color.startsWith("#")) return color;
  return COLORS.green;
}

function generateSvg(count: number, label: string, color?: string): string {
  const countColor = getColor(color);
  const countText = count.toLocaleString();

  const fontSize = 11;
  const charWidth = fontSize * 0.65;
  const padding = 6;

  const labelWidth = label.length * charWidth + padding * 2;
  const countWidth = countText.length * charWidth + padding * 2;
  const totalWidth = labelWidth + countWidth;
  const height = 20;
  const radius = 3;

  const labelX = labelWidth / 2;
  const countX = labelWidth + countWidth / 2;
  const textY = height / 2 + 1;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}">
  <linearGradient id="smooth" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="round">
    <rect width="${totalWidth}" height="${height}" rx="${radius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#round)">
    <rect width="${labelWidth}" height="${height}" fill="#555"/>
    <rect x="${labelWidth}" width="${countWidth}" height="${height}" fill="${countColor}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#smooth)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="${fontSize}">
    <text x="${labelX}" y="${textY}" dominant-baseline="middle">${label}</text>
    <text x="${countX}" y="${textY}" dominant-baseline="middle">${countText}</text>
  </g>
</svg>`;
}

function hashPageUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").substring(0, 40);
}

function getVisitorId(req: functions.https.Request): string {
  const ip =
    req.ip ||
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    "unknown";
  const userAgent = (req.headers["user-agent"] as string) || "";

  return crypto
    .createHash("sha256")
    .update(`${ip}:${userAgent}`)
    .digest("hex")
    .substring(0, 32);
}

function getReferrerUrl(req: functions.https.Request): string | null {
  const referer =
    (req.headers["referer"] as string) ||
    (req.headers["referrer"] as string);

  if (!referer) return null;

  try {
    const url = new URL(referer);
    return `${url.origin}${url.pathname}`;
  } catch {
    return referer;
  }
}

async function recordView(
  pageUrl: string,
  visitorId: string
): Promise<{ views: number; visitors: number }> {
  const docId = hashPageUrl(pageUrl);
  const docRef = db.collection(COLLECTION_NAME).doc(docId);
  const visitorRef = docRef.collection("visitors").doc(visitorId);

  const result = await db.runTransaction(async (transaction) => {
    const [visitorDoc, statsDoc] = await Promise.all([
      transaction.get(visitorRef),
      transaction.get(docRef),
    ]);

    const isNewVisitor = !visitorDoc.exists;
    const currentData = statsDoc.data();
    const currentViews = currentData?.views || 0;
    const currentVisitors = currentData?.visitors || 0;

    const newViews = currentViews + 1;
    const newVisitors = isNewVisitor ? currentVisitors + 1 : currentVisitors;

    if (isNewVisitor) {
      transaction.set(visitorRef, {
        firstSeen: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    if (!statsDoc.exists) {
      transaction.set(docRef, {
        url: pageUrl,
        views: newViews,
        visitors: newVisitors,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      transaction.update(docRef, {
        views: newViews,
        visitors: newVisitors,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return { views: newViews, visitors: newVisitors };
  });

  return result;
}

// Views endpoint
export const views = functions.https.onRequest(async (req, res) => {
  const pageUrl = getReferrerUrl(req);

  if (!pageUrl) {
    res.status(400).send("Missing referer header");
    return;
  }

  const visitorId = getVisitorId(req);
  const color = req.query.color as string | undefined;

  try {
    const stats = await recordView(pageUrl, visitorId);
    const svg = generateSvg(stats.views, "Views", color);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader(
      "Cache-Control",
      `public, max-age=${DEFAULT_CACHE_TTL_SECONDS}, s-maxage=${DEFAULT_CACHE_TTL_SECONDS}`
    );
    res.status(200).send(svg);
  } catch (error) {
    console.error("View counter error:", error);
    res.status(500).send("Internal server error");
  }
});

// Visitors endpoint
export const visitors = functions.https.onRequest(async (req, res) => {
  const pageUrl = getReferrerUrl(req);

  if (!pageUrl) {
    res.status(400).send("Missing referer header");
    return;
  }

  const visitorId = getVisitorId(req);
  const color = req.query.color as string | undefined;

  try {
    const stats = await recordView(pageUrl, visitorId);
    const svg = generateSvg(stats.visitors, "Visitors", color);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader(
      "Cache-Control",
      `public, max-age=${DEFAULT_CACHE_TTL_SECONDS}, s-maxage=${DEFAULT_CACHE_TTL_SECONDS}`
    );
    res.status(200).send(svg);
  } catch (error) {
    console.error("View counter error:", error);
    res.status(500).send("Internal server error");
  }
});
