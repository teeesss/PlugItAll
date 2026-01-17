# Mobile & Advanced Filtering Roadmap

## Overview
This roadmap outlines the strategy for making Plug It All fully mobile-optimized while maintaining privacy-first principles.

---

## Phase 1: Advanced Filter UX (v1.3.0) - TASK-086 ✅ **40% COMPLETE**
**Goal:** Make filtering more powerful and user-friendly (Foundation Built)

### Features:
1. **Filter Presets** (Quick access buttons)
   - Last Month
   - This Quarter
   - Last Quarter  
   - This Year
   - Last 90 Days

2. **Custom Date Range Picker**
   - Start date selector
   - End date selector
   - "Apply" button
   - Quick range shortcuts

3. **Saved Filter Sets**
   - Save current filter combination with custom name
   - Store in localStorage
   - Quick recall dropdown
   - Edit/delete saved filters
   - Example: "Monthly Review" (Last Month + Purchases + Sort by Largest)

4. **URL Parameters for Sharing**
   - Encode filter state in URL query params
   - Example: `?type=purchases&range=30days&sort=largest&search=amazon`
   - Shareable bookmarks
   - Browser back/forward support
   - **Note:** Shares filter state only, not actual data

5. **UX Improvements**
   - "Clear all filters" button (visible when filters active)
   - Filter history (last 5 filter combinations)
   - Keyboard shortcuts:
     - `/` → Focus merchant search
     - `Escape` → Clear search / Close modal
     - `f` → Focus filter controls

---

## Phase 2: Mobile Optimization (v1.4.0) - TASK-087
**Goal:** Full mobile experience with PWA capabilities

### 2A: Responsive Design
- **Insights Panel Mobile Layout:**
  - Collapse filters into accordion sections
  - Stack filter pills vertically
  - Bottom sheet for advanced filters
  - Horizontal scroll for date range pills
  
- **Touch-Friendly:**
  - 44px minimum tap targets
  - Increased padding on buttons
  - Swipe gestures for modal dismissal
  - Pull-to-refresh for data reload

- **Mobile-First Components:**
  - Bottom navigation for main sections
  - Fixed header with hamburger menu
  - Sticky filter summary bar
  - Optimized chart rendering (smaller on mobile)

### 2B: Progressive Web App (PWA)
- **Core PWA Features:**
  - `manifest.json` for app metadata
  - Service worker for offline support
  - Install prompt ("Add to Home Screen")
  - Splash screens
  - App icon (multiple sizes)

- **Offline Functionality:**
  - Cache app shell
  - Store uploaded data in IndexedDB
  - Work without internet after first load
  - Sync when online (if cloud backup enabled)

- **App-Like Experience:**
  - Fullscreen mode (no browser chrome)
  - Status bar styling
  - Platform-specific UI adjustments
 - Apple touch icons
  - Launch screen

### 2C: Mobile-Specific Features
- **Camera Integration:**
  - Photo upload for physical statements
  - OCR for text extraction (future)
  - Multi-page scanning

- **Share Sheet:**
  - Export to PDF
  - Share via email/messages
  - Copy summary to clipboard

- **Gestures:**
  - Swipe right: Open filters
  - Swipe left: Close modal
  - Pull down: Refresh data
  - Long press: Quick actions on merchant cards

---

## Phase 3: Data Sync & Sharing (v1.5.0) - TASK-088
**Goal:** Enable cross-device workflow while maintaining privacy

### 3A: URL-Based Sharing
**Use Case:** Share filter views, not data
- Encode filter state in URL
- Example flow:
  1. Desktop: Apply filters → Copy URL
  2. Mobile: Open URL → Same filters applied (if data exists locally)
  
**Implementation:**
```typescript
// URL structure
https://plugitall.com/?filters=eyJ0eXBlIjoicHVyY2hhc2VzIiwicmFuZ2UiOiIzMGRheXMifQ

// Decoded:
{
  type: "purchases",
  range: "30days",
  sort: "largest",
  search: "netflix",
  merchant: "NETFLIX.COM"
}
```

**Limitations:**
- ⚠️ Data must be uploaded separately on target device
- ✅ Good for: Bookmarks, sharing analysis views
- ❌ Bad for: Sharing raw data

---

### 3B: Optional Cloud Backup (Privacy-First)
**Use Case:** Cross-device data access

#### Architecture:
```
Desktop Upload → Encrypt Client-Side → Cloud Storage → Decrypt on Mobile
                  (User Key)                            (Same Key)
```

#### Privacy Guarantees:
1. **Client-Side Encryption:**
   - AES-256 encryption
   - User-generated passphrase
   - Key never leaves device
   - Server cannot decrypt

2. **Anonymous Storage:**
   - No account required
   - Random session ID
   - No personal data collected
   - IP not logged

3. **User Control:**
   - Manual backup (not automatic)
   - Set expiration (7, 30, 90 days, or manual delete)
   - Revoke access anytime
   - Download encrypted backup file

#### Implementation Flow:

**Desktop (Upload):**
1. User clicks "Generate Shareable Link"
2. Enter optional passphrase
3. Encrypt data client-side
4. Upload encrypted blob to server
5. Receive short code (e.g., `A3X7Y2`)
6. Generate QR code for mobile

**Mobile (Access):**
1. Scan QR code OR enter code
2. Download encrypted blob
3. Enter passphrase
4. Decrypt client-side
5. Load data into app

#### Technical Stack:
- **Storage:** Simple key-value store (Cloudflare KV, Deta Base)
- **Encryption:** Web Crypto API (SubtleCrypto)
- **Transport:** HTTPS only
- **Cost:** ~$0 for first 10k sessions/month

---

### 3C: Cross-Device Workflows

#### Option 1: QR Code Handoff
Desktop → Mobile
```
1. Desktop: Upload statements
2. Click "View on Mobile"
3. QR code appears with encrypted session
4. Scan with phone
5. Data automatically loaded
```

#### Option 2: Export/Import
Manual Transfer
```
1. Desktop: Export → encrypted .plugit file
2. Transfer via AirDrop/email/USB
3. Mobile: Import file
4. Data loaded
```

#### Option 3: Browser Sync
Using Browser's Native Sync
```
- Store in browser's sync storage
- Works if user logged into Chrome/Edge/Safari
- Private, uses browser's encryption
- No additional infrastructure needed
```

---

## Recommended Implementation Order

### **v1.3.0** (Week 1) - Quick Wins
1. URL params for filter state ✅ High impact, low effort
2. Filter presets ✅ User-requested
3. Date range picker ✅ Common request

### **v1.4.0** (Week 2-3) - Mobile Foundation
1. Responsive design polish
2. PWA manifest + service worker
3. Install prompt
4. Touch optimizations

### **v1.5.0** (Week 4+) - Advanced Features
1. localStorage export/import (easiest cross-device)
2. QR code generation
3. Optional cloud backup (if users request)

---

## Mobile Strategy: My Recommendation

Given your observation that **most users won't upload statements on mobile**, I recommend:

### Phase 1 (Immediate):
✅ **Desktop-first** with mobile viewing  
✅ **URL filter sharing** (bookmark views)  
✅ **PWA** for install-ability

### Phase 2 (If needed):
🔄 **Export/Import** for manual transfer  
🔄 **QR handoff** for quick preview

### Phase 3 (Optional):
❓ **Cloud backup** (only if users demand it)

**Rationale:**
- Most analysis happens on desktop
- Mobile is for quick review/checking
- Privacy-first = local-first
- PWA gives app-like feel without app store

---

## Privacy Trade-offs

| Feature | Privacy | Convenience | Complexity |
|---------|---------|-------------|------------|
| localStorage only | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| URL filter state | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Export/Import | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| QR handoff | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Encrypted cloud | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**Current approach (localStorage) = Maximum privacy, acceptable convenience for desktop-primary workflow.**

---

## Next Steps

Want me to implement **TASK-086** (Filter Presets + URL Params + Date Picker) now?

This would give you:
- Quick filter presets
- Custom date range
- Shareable filter URLs
- Saved filter sets

Estimated time: ~1-2 hours for full implementation.
