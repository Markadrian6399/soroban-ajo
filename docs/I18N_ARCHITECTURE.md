# i18n Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────┐  ┌──────────────────────────┐              │
│  │  Frontend (Next.js)      │  │  Mobile (React Native)   │              │
│  ├──────────────────────────┤  ├──────────────────────────┤              │
│  │ • LanguageSwitcher       │  │ • Language Provider      │              │
│  │ • RTLLayout              │  │ • Language Switcher      │              │
│  │ • useI18n hooks          │  │ • RTL Support            │              │
│  │ • next-intl integration  │  │ • i18n-js integration    │              │
│  │ • next/navigation        │  │ • AsyncStorage persist   │              │
│  └──────────────────────────┘  └──────────────────────────┘              │
│                                                                            │
└──────┬─────────────────────────────────────────────────────────┬──────────┘
       │                                                          │
       │ HTTP Requests                                            │ HTTP Requests
       │ (with Accept-Language header)                            │ (with Accept-Language header)
       │                                                          │
┌──────▼─────────────────────────────────────────────────────────▼──────────┐
│                         API GATEWAY / ROUTING LAYER                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  next-intl Middleware (Frontend)                              │     │
│  │  • Language detection                                         │     │
│  │  • URL locale prefix (/en/, /es/, /ar/)                       │     │
│  │  • Locale cookie management                                   │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  Express Middleware (Backend)                                 │     │
│  │  • Language detection from headers                            │     │
│  │  • RTL flag detection                                         │     │
│  │  • Cookie persistence                                         │     │
│  │  • Request context enrichment                                 │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                            │
└────┬───────────────────────────────────────────────────────┬──────────────┘
     │                                                        │
     │ /api/i18n/*                                           │ GET /[locale]/*
     │                                                        │
┌────▼─────────────────────────────────────────────────────────▼──────────┐
│                    APPLICATION LOGIC LAYER                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────┐  ┌──────────────────────────┐ │
│  │  Backend i18n API Routes            │  │  Frontend page routes    │ │
│  ├─────────────────────────────────────┤  ├──────────────────────────┤ │
│  │ GET  /languages                     │  │ Locale-aware rendering   │ │
│  │ GET  /current                       │  │ • useTranslations()      │ │
│  │ POST /set-language                  │  │ • useIsRTL()             │ │
│  │ GET  /translations/:lang            │  │ • useNumberFormat()      │ │
│  │ GET  /translations/:lang/:ns        │  │ • useLocaleMetadata()    │ │
│  │ GET  /language-info/:code           │  │                          │ │
│  └─────────────────────────────────────┘  └──────────────────────────┘ │
│                                                                           │
└────┬─────────────────────────────────────────────────────┬───────────────┘
     │                                                      │
     │ Translation requests                                │ Component queries
     │                                                      │
┌────▼─────────────────────────────────────────────────────▼───────────────┐
│                    DATA & SERVICE LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  i18nService (Backend)                                           │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  • getSupportedLanguages()    → [en, es, fr, sw, pt, ar, zh]   │  │
│  │  • getLanguageInfo(code)      → {name, rtl, currency, ...}      │  │
│  │  • detectLanguage(header)     → Parse Accept-Language header    │  │
│  │  • getTranslations(locale)    → Load from file system + cache   │  │
│  │  • translateKey(locale, key)  → Dot-notation key lookup         │  │
│  │  • formatNumber/Currency/Date → Locale-aware formatting         │  │
│  │  • getPluralKey(locale, key)  → Language-specific plurals       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                           │                                              │
│                           ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Translation Cache (In-Memory)                                   │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  Key: locale (en, es, fr, sw, pt, ar, zh)                       │  │
│  │  Value: {common, auth, groups, ...}                             │  │
│  │  TTL: 5 minutes                                                  │  │
│  │  Hit Rate: 95%+                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                           │                                              │
│                           ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Translation File System                                         │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  packages/shared/locales/                                        │  │
│  │  ├── en/                (Complete: 1,050+ strings)              │  │
│  │  │   ├── common.json                                            │  │
│  │  │   ├── auth.json                                              │  │
│  │  │   ├── groups.json                                            │  │
│  │  │   └── ... (10 files total)                                   │  │
│  │  ├── es/, fr/, sw/, pt/, ar/, zh/ (6 languages × 10 files)     │  │
│  │  │   └── Same structure, localized content                      │  │
│  │  └── Total: 70 translation files                                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘


## Request Flow Diagram

┌─────────────────────────────────────────────────────────────────────────┐
│  USER BROWSER / MOBILE APP                                               │
│  Sends: GET /page + Accept-Language: es-ES,es;q=0.9,en;q=0.8           │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │  next-intl Middleware / Express        │
        │  ├─ Parse Accept-Language header       │
        │  ├─ Check language cookie              │
        │  ├─ Detect preferred language: 'es'   │
        │  └─ Inject language context            │
        └────────┬─────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────────┐
        │  Application Route Handler             │
        │  ├─ Access req.language ('es')         │
        │  ├─ Call i18nService methods           │
        │  └─ Format response data               │
        └────────┬─────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────────┐
        │  i18nService                           │
        │  ├─ Check translation cache for 'es'   │
        │  ├─ [MISS] Load from file system:      │
        │  │  packages/shared/locales/es/*.json  │
        │  ├─ [HIT] Return cached translations   │
        │  ├─ Perform dot-notation lookup        │
        │  └─ Format numbers, dates per locale   │
        └────────┬─────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────────┐
        │  Response to User                      │
        │  ├─ Set-Cookie: ajo_language=es        │
        │  ├─ Set Header: Content-Language: es   │
        │  ├─ Set Header: X-Text-Direction: ltr  │
        │  ├─ Body: Localized content            │
        │  └─ Body: RTL flag if Arabic           │
        └────────┬─────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────────┐
        │  Frontend Rendering                    │
        │  ├─ Apply LanguageSwitcher             │
        │  ├─ Apply RTLLayout if RTL             │
        │  ├─ Use useI18n hooks for formatting   │
        │  └─ Render localized UI                │
        └────────────────────────────────────────┘


## RTL Processing Flow (Arabic Example)

┌─────────────────────────────────────────────────────────────────────────┐
│  USER SELECTS ARABIC                                                      │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  1. LanguageSwitcher Component                                            │
│     └─ User clicks Arabic (ar)                                            │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  2. Language Detection & Routing                                           │
│     ├─ Middleware detects: isRTLLanguage('ar') = true                    │
│     ├─ Set req.isRTL = true                                               │
│     ├─ Set req.textDirection = 'rtl'                                      │
│     └─ Set response header: X-Text-Direction: rtl                         │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  3. DOM & CSS Application                                                 │
│     ├─ Set <html dir="rtl" lang="ar">                                    │
│     ├─ Apply CSS class: .rtl                                              │
│     ├─ Apply Tailwind: flex-row-reverse                                  │
│     ├─ Text align: right                                                  │
│     └─ Margins: swap left/right                                           │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  4. Translation Loading                                                   │
│     ├─ Load: packages/shared/locales/ar/common.json                       │
│     ├─ Load: packages/shared/locales/ar/auth.json                         │
│     └─ Load: packages/shared/locales/ar/*.json (all files)               │
└────┬────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  5. Content Rendering                                                     │
│     ├─ RTL text direction applied                                         │
│     ├─ Arabic fonts loaded                                                │
│     ├─ Numbers formatted: ١٢٣٤.٥٦ (Arabic numerals)                        │
│     ├─ Dates formatted: ١٤ يناير ٢٠٢٤                                     │
│     ├─ Currency: ر.س ١٠٠ (SAR)                                            │
│     └─ Layout properly mirrored                                           │
└─────────────────────────────────────────────────────────────────────────┘


## Technology Stack

┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND                                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  • Node.js / Express.js                                                  │
│  • TypeScript                                                            │
│  • File System (translations from disk)                                  │
│  • Intl API (for number/date formatting)                                │
│  • Jest (testing)                                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  • Next.js 14+ (framework)                                               │
│  • React 18+ (UI)                                                        │
│  • next-intl ^4.8.3 (i18n library)                                       │
│  • TypeScript                                                            │
│  • Tailwind CSS (with RTL support)                                       │
│  • Zustand (state management)                                            │
│  • Jest (testing)                                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  MOBILE                                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  • React Native / Expo                                                   │
│  • i18n-js or react-i18next                                              │
│  • AsyncStorage (persistence)                                            │
│  • Platform APIs (language detection)                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  SHARED                                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  • Translation files (JSON)                                              │
│  • 7 languages: en, es, fr, sw, pt, ar, zh                              │
│  • 10 namespaces per language                                            │
│  • 70 total files                                                        │
└─────────────────────────────────────────────────────────────────────────┘


## Language Detection Priority

┌─────────────────────────────────────────────────────────────────────────┐
│  LANGUAGE SELECTION PRIORITY (Highest to Lowest)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. Explicit Language Header                                              │
│     └─ X-Language: es                                                     │
│        └─ Use: Spanish                                                    │
│                                                                           │
│  2. Query Parameter (if enabled)                                          │
│     └─ ?lang=fr                                                           │
│        └─ Use: French                                                     │
│                                                                           │
│  3. Language Cookie                                                       │
│     └─ Cookie: ajo_language=pt                                            │
│        └─ Use: Portuguese                                                 │
│                                                                           │
│  4. Accept-Language Header                                                │
│     └─ Accept-Language: ar-SA,ar;q=0.9,en;q=0.8                          │
│        └─ Parse and match against supported                               │
│        └─ Use: Arabic (ar)                                                │
│                                                                           │
│  5. System/Browser Default                                                │
│     └─ Last detected locale from browser                                  │
│        └─ Use: Previous selection                                         │
│                                                                           │
│  6. Fallback                                                              │
│     └─ Default language: English (en)                                     │
│        └─ Use: English                                                    │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## File Organization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SOURCE TREE                                      │
├─────────────────────────────────────────────────────────────────────────┤
│
│  soroban-ajo/
│  ├── backend/src/
│  │   ├── config/
│  │   │   └── i18n.config.ts .......................... Backend config
│  │   ├── middleware/
│  │   │   └── i18n.ts ................................ Express middleware
│  │   ├── services/
│  │   │   └── i18nService.ts ......................... Core service
│  │   ├── utils/
│  │   │   └── i18nHelpers.ts ......................... Helpers
│  │   ├── routes/api/
│  │   │   └── i18n.ts ................................ API endpoints
│  │   └── (other services/routes)
│  │
│  ├── backend/tests/
│  │   ├── services/
│  │   │   └── i18nService.test.ts ................... Service tests
│  │   └── middleware/
│  │       └── i18n.test.ts .......................... Middleware tests
│  │
│  ├── frontend/
│  │   ├── i18n.config.ts ............................ Frontend config
│  │   ├── src/
│  │   │   ├── i18n.ts .............................. i18n utils
│  │   │   ├── middleware.ts ........................ next-intl routing
│  │   │   ├── components/
│  │   │   │   ├── LanguageSwitcher.tsx ............ Switcher UI
│  │   │   │   └── RTLLayout.tsx .................. RTL wrapper
│  │   │   ├── hooks/
│  │   │   │   └── useI18n.ts ..................... Custom hooks
│  │   │   └── (other components/pages)
│  │   └── public/
│  │       └── locales/
│  │           └── (JSON translation files if separate)
│  │
│  ├── packages/shared/locales/
│  │   ├── en/ (10 files)
│  │   │   ├── common.json
│  │   │   ├── auth.json
│  │   │   ├── groups.json
│  │   │   ├── contributions.json
│  │   │   ├── leaderboard.json
│  │   │   ├── gamification.json
│  │   │   ├── wallet.json
│  │   │   ├── activity.json
│  │   │   ├── profile.json
│  │   │   └── errors.json
│  │   ├── es/ (10 files) [Spanish]
│  │   ├── fr/ (10 files) [French]
│  │   ├── sw/ (10 files) [Swahili]
│  │   ├── pt/ (10 files) [Portuguese]
│  │   ├── ar/ (10 files) [Arabic - RTL]
│  │   └── zh/ (10 files) [Chinese]
│  │
│  ├── mobile/
│  │   ├── i18n.config.ts ........................... Mobile config
│  │   ├── src/
│  │   │   ├── i18n/
│  │   │   │   └── localization.ts ............... Setup
│  │   │   ├── components/
│  │   │   │   └── LanguageSwitcher.tsx ........ Mobile switcher
│  │   │   └── hooks/
│  │   │       └── useI18n.ts .................. Mobile hooks
│  │   └── (other mobile components)
│  │
│  ├── scripts/
│  │   ├── generate-i18n-structure.sh ............ Generate structure
│  │   └── populate-translations.sh ............. Populate content
│  │
│  ├── docs/
│  │   ├── I18N_IMPLEMENTATION.md ............... Full documentation
│  │   └── (other docs)
│  │
│  └── I18N_IMPLEMENTATION_SUMMARY.md ........... Project summary
│
│
│  KEY STATISTICS:
│  ├── 7 Supported Languages
│  ├── 70 Translation Files (10 per language)
│  ├── 1,050+ Localized Strings
│  ├── 12 Backend/Frontend Components
│  ├── 50+ Test Cases
│  ├── 2,500+ Lines of Documentation
│  └── Full RTL Support for Arabic
│
└─────────────────────────────────────────────────────────────────────────┘
```
