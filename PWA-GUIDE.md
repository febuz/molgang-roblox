# Progressive Web App (PWA) & Mobile Guide

Complete PWA implementation for VirtualPC.

## PWA Features

### 1. Web App Manifest
File: `public/manifest.json`

Enables:
- Install to home screen
- Standalone app mode (no address bar)
- Custom app icons
- Splash screen
- Theme customization

### 2. Service Worker
File: `public/service-worker.js`

Capabilities:
- Offline support
- Background sync
- Push notifications
- Cache management
- Network-first strategy

### 3. HTTPS Required
VirtualPC PWA requires HTTPS for:
- Service worker registration
- Secure data transmission
- Push notification support

## Installation

### Desktop (Chrome, Edge, Firefox)
1. Visit https://api.virtualpc.com
2. Click "Install app" in address bar
3. Click "Install"
4. App opens in standalone window

### Mobile (Android)
1. Open in Chrome browser
2. Tap menu (three dots)
3. Tap "Install app"
4. Confirm installation
5. App added to home screen

### Mobile (iOS 16+)
1. Open in Safari browser
2. Tap Share button
3. Tap "Add to Home Screen"
4. Enter app name
5. Tap "Add"

## Offline Support

### What Works Offline
- Dashboard view (cached)
- Backlog (cached)
- Previous API responses
- UI interactions

### What Requires Connection
- Real-time updates
- New API calls
- Data submission

## Setup Instructions

### 1. Update HTML Head
```html
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#667eea">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" href="/icons/icon-192x192.png">
</head>
```

### 2. Register Service Worker
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then((registration) => {
      console.log('Service worker registered');
    })
    .catch((error) => {
      console.error('Service worker registration failed:', error);
    });
}
```

### 3. Create App Icons
Icons needed:
- icons/icon-192x192.png
- icons/icon-512x512.png

### 4. Test Installation
```bash
# Navigate to https://api.virtualpc.com
# Look for install prompt or menu option
```

## Caching Strategy

### Network First
1. Try network
2. If offline, use cache
3. Update cache when online

Used for API calls and dynamic content.

### Cache First
1. Check cache
2. If miss, fetch network

Used for static assets.

## Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | ✓ 44+ | ✓ 40+ |
| Edge | ✓ 17+ | ✓ 17+ |
| Firefox | ✓ 44+ | ✓ 48+ |
| Safari | ✓ 16+ | ✓ 16.4+ |

## Testing Checklist

- [ ] Manifest loads correctly
- [ ] Service worker registers
- [ ] App can be installed
- [ ] Works in standalone mode
- [ ] Works offline (with cache)
- [ ] Responsive on mobile
- [ ] No console errors

## Performance Impact

### Bundle Addition
- Service worker: ~2KB
- Manifest: ~1KB
- Icons: ~100KB (one-time)

### Improvements
- Instant load time (cached)
- Offline functionality
- Reduced bandwidth
- Better perceived performance

## Resources

- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)
- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Manifest Specification](https://www.w3.org/TR/appmanifest/)
