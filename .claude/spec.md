# view-count

A simple, embeddable view counter that generates dynamic SVG badges showing page view counts and unique visitors. Users can embed an image on any website, and each time the image loads, it logs a view to Firebase Firestore and returns a two-tone SVG badge displaying the current count.

## Overview

**view-count** is both a hosted service and an npm package that provides a serverless-ready view counter service. It works by serving a dynamic SVG badge that:

1. Receives a request when embedded on a webpage
2. Reads the `Referer` header to identify which page the badge is on
3. Logs the view/visitor to Firebase Firestore
4. Returns a two-tone SVG badge (shields.io style) displaying the current count
5. Uses HTTP cache headers to prevent excessive counting

## Features

- **Zero-configuration embedding**: Just add an `<img>` tag to any website
- **Automatic page detection**: Uses `Referer` header to track each page separately
- **Two metrics**: Track total views OR unique visitors per page
- **Two-tone badges**: shields.io-style badges with customizable colors
- **HTTP caching**: Browser caches the badge to prevent excessive counting (default: 30 min)
- **Firebase-backed storage**: Reliable, scalable view count persistence
- **Firebase Functions deployment**: Easy deployment with custom domain support
- **npm package**: Can also be self-hosted with Express or other frameworks

## Hosted Service

Embed on any page:

```html
<img src="https://view-count.cloudtion.com/views" alt="views" />
<img src="https://view-count.cloudtion.com/visitors" alt="visitors" />
```

Customize colors with `?color=` parameter:
- green (default), blue, red, orange, yellow, purple, pink, cyan, gray, black

## Architecture

### Endpoints

| Path | Description |
|------|-------------|
| `/views` | Returns badge showing total page views |
| `/visitors` | Returns badge showing unique visitors |

### Unique Visitor Tracking

Visitors are identified by hashing `IP + User-Agent`. Each page has a subcollection of visitor hashes to track uniqueness.

### Caching Strategy

The SVG response includes `Cache-Control: public, max-age=1800` header. Since browsers treat the badge as an image, this prevents the same user from incrementing the counter on every page refresh.

### Firestore Structure

```
view-counts/
  {pageUrlHash}/
    views: number
    visitors: number
    url: string
    visitors_subcollection/
      {visitorHash}/
        createdAt: timestamp
```

## Project Structure

```
view-count/
├── src/                    # Library source (TypeScript)
│   ├── index.ts           # Main entry point & exports
│   ├── counter.ts         # View counter logic
│   ├── firebase.ts        # Firebase integration
│   └── svg.ts             # SVG badge generation
├── functions/             # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts       # Cloud Functions entry point
│   ├── package.json
│   └── tsconfig.json
├── public/                # Firebase Hosting static files
│   └── index.html         # Redirect to GitHub
├── firebase.json          # Firebase configuration
├── firestore.rules        # Firestore security rules
├── .firebaserc            # Firebase project config
├── package.json
├── tsconfig.json
└── README.md
```

## Deployment

The project deploys to Firebase with:
- **Cloud Functions**: `views` and `visitors` endpoints
- **Hosting**: Static files + rewrites to functions
- **Firestore**: Data persistence

Custom domain: `view-count.cloudtion.com`

## Available Colors

```typescript
const COLORS = {
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
```

## License

MIT
