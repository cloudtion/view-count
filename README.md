# view-count

A simple, embeddable view counter badge for any website. Track page views and unique visitors with a beautiful two-tone SVG badge.<br/>
Powered by Firebase _or_ Express.js and SQLite.

![views](https://view-count.cloudtion.com/views) ![visitors](https://cloudtion.com/visitors)

## Quick Start (Hosted Service)

The easiest way to use view-count is with the hosted service. Just embed an image tag on your page:

### Track Page Views

```html
<img src="https://view-count.cloudtion.com/views" alt="views" />
```

### Track Unique Visitors

```html
<img src="https://view-count.cloudtion.com/visitors" alt="visitors" />
```

### Customize Colors

Add a `?color=` parameter to change the badge color:

```html
<img src="https://view-count.example.com/views?color=blue" alt="views" />
```

**Available colors:**

| Color | Preview |
|-------|---------|
| `green` (default) | ![green](https://img.shields.io/badge/views-123-green) |
| `blue` | ![blue](https://img.shields.io/badge/views-123-blue) |
| `red` | ![red](https://img.shields.io/badge/views-123-red) |
| `orange` | ![orange](https://img.shields.io/badge/views-123-orange) |
| `yellow` | ![yellow](https://img.shields.io/badge/views-123-yellow) |
| `purple` | ![purple](https://img.shields.io/badge/views-123-blueviolet) |
| `pink` | ![pink](https://img.shields.io/badge/views-123-ff69b4) |
| `cyan` | ![cyan](https://img.shields.io/badge/views-123-cyan) |
| `gray` | ![gray](https://img.shields.io/badge/views-123-gray) |
| `black` | ![black](https://img.shields.io/badge/views-123-black) |

### How It Works

1. When the image loads, the counter reads the `Referer` header to identify which page the badge is embedded on
2. Each unique page URL gets its own view/visitor count
3. The badge is cached by the browser (default: 30 minutes) to prevent excessive counting
4. Unique visitors are tracked by hashing IP + User-Agent

---

## Self-Hosted (Library Usage)

Install view-count as a library to run your own counter service.

### Installation

```bash
npm install view-count
```

### Basic Setup

```typescript
import { createViewCounter } from 'view-count';

const counter = createViewCounter({
  firebaseConfig: {
    projectId: 'your-project-id',
    clientEmail: 'your-service-account@your-project.iam.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
    collectionName: 'view-counts', // optional, defaults to 'view-counts'
  },
  cacheTtlMs: 30 * 60 * 1000, // optional, defaults to 30 minutes
});

// Use with Express
app.get('/views', counter.handler);
app.get('/visitors', counter.handler);
```

### Express Example

```typescript
import express from 'express';
import { createViewCounter } from 'view-count';

const app = express();

const counter = createViewCounter({
  firebaseConfig: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    collectionName: 'view-counts',
  },
});

// Badge endpoints
app.get('/views', counter.handler);
app.get('/visitors', counter.handler);

app.listen(3000);
```

### Vercel Serverless Example

```typescript
// api/views.ts
import { createViewCounter } from 'view-count';

const counter = createViewCounter({
  firebaseConfig: {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!,
    collectionName: 'view-counts',
  },
});

export default counter.handler;
```

```typescript
// api/visitors.ts
import { createViewCounter } from 'view-count';

const counter = createViewCounter({
  firebaseConfig: {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!,
    collectionName: 'view-counts',
  },
});

export default counter.handler;
```

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database** in the Firebase console
3. Go to **Project Settings** → **Service Accounts** → **Generate new private key**
4. Use the downloaded JSON values for your config

**Firestore Security Rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /view-counts/{document=**} {
      allow read, write: if true;
    }
  }
}
```

> Note: For production, consider adding rate limiting or authentication.

---

## API Reference

### `createViewCounter(options)`

Creates a new view counter instance.

#### Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `firebaseConfig.projectId` | `string` | Yes | - | Firebase project ID |
| `firebaseConfig.clientEmail` | `string` | Yes | - | Service account email |
| `firebaseConfig.privateKey` | `string` | Yes | - | Service account private key |
| `firebaseConfig.collectionName` | `string` | No | `'view-counts'` | Firestore collection name |
| `cacheTtlMs` | `number` | No | `1800000` | Browser cache duration (ms) |

#### Returns

| Method | Description |
|--------|-------------|
| `handler(req, res)` | Express-compatible request handler |
| `getStats(pageUrl)` | Get stats for a page without incrementing |
| `recordView(pageUrl, visitorId)` | Manually record a view |
| `preview(count, mode?, color?)` | Generate SVG without recording |

### Endpoints

The handler responds differently based on the URL path:

| Path | Badge Shows |
|------|-------------|
| `/views` | Total page views |
| `/visitors` | Unique visitors |

Both endpoints accept a `?color=` query parameter.

### Available Colors

```typescript
import { COLORS } from 'view-count';

// COLORS = {
//   green: "#4c1",
//   blue: "#007ec6",
//   red: "#e05d44",
//   orange: "#fe7d37",
//   yellow: "#dfb317",
//   purple: "#9f7be1",
//   pink: "#e85aad",
//   gray: "#555",
//   black: "#1a1a1a",
//   cyan: "#24b9a7",
// }
```

---

## Deploy to Firebase

The easiest way to deploy your own instance is using Firebase Functions.

### Prerequisites

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)

4. Enable **Firestore Database** in the Firebase console

### Deploy

1. Update `.firebaserc` with your project ID:
   ```json
   {
     "projects": {
       "default": "your-project-id"
     }
   }
   ```

2. Install functions dependencies:
   ```bash
   cd functions
   npm install
   cd ..
   ```

3. Deploy:
   ```bash
   firebase deploy
   ```

This deploys:
- **Cloud Functions**: `views` and `visitors` endpoints
- **Firestore Rules**: Allow read/write to `view-counts` collection

### Your Endpoints

After deployment, your endpoints will be:
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/views
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/visitors
```

Embed them on any page:
```html
<img src="https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/views" alt="views" />
<img src="https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/visitors?color=blue" alt="visitors" />
```

### Local Testing

Test locally with Firebase emulators:
```bash
cd functions
npm run serve
```

---

## Development

```bash
# Clone the repo
git clone https://github.com/your-username/view-count.git
cd view-count

# Install dependencies
npm install

# Copy env file and add your Firebase credentials
cp .env.example .env

# Run dev server (with hot reload)
npm run dev

# Build for production
npm run build
```

### Environment Variables

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_COLLECTION_NAME=view-counts
CACHE_TTL_MS=1800000
PORT=3000
```

---

## License

MIT
