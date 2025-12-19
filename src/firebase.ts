import admin from "firebase-admin";
import crypto from "crypto";

export interface FirebaseConfig {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  credential?: admin.credential.Credential;
  collectionName: string;
}

let db: admin.firestore.Firestore | null = null;
let initialized = false;
let collectionName = "view-counts";

export function initializeFirebase(
  config: FirebaseConfig
): admin.firestore.Firestore {
  if (initialized && db) {
    return db;
  }

  collectionName = config.collectionName || "view-counts";

  if (config.credential) {
    admin.initializeApp({ credential: config.credential });
  } else if (config.privateKey && config.clientEmail && config.projectId) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey.replace(/\\n/g, "\n"),
      }),
    });
  } else if (config.projectId) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: config.projectId,
    });
  } else {
    throw new Error(
      "Invalid Firebase configuration. Provide projectId, or credential."
    );
  }

  db = admin.firestore();
  initialized = true;
  return db;
}

export function getDb(): admin.firestore.Firestore {
  if (!db) {
    throw new Error("Firebase not initialized. Call initializeFirebase first.");
  }
  return db;
}

function hashPageUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").substring(0, 40);
}

export interface PageStats {
  views: number;
  visitors: number;
}

export async function getStats(pageUrl: string): Promise<PageStats> {
  const docId = hashPageUrl(pageUrl);
  const doc = await getDb().collection(collectionName).doc(docId).get();
  if (!doc.exists) {
    return { views: 0, visitors: 0 };
  }
  const data = doc.data();
  return {
    views: data?.views || 0,
    visitors: data?.visitors || 0,
  };
}

export async function recordView(
  pageUrl: string,
  visitorId: string
): Promise<PageStats> {
  const docId = hashPageUrl(pageUrl);
  const docRef = getDb().collection(collectionName).doc(docId);
  const visitorRef = docRef.collection("visitors").doc(visitorId);

  const result = await getDb().runTransaction(async (transaction) => {
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
