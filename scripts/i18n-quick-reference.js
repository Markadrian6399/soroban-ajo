#!/usr/bin/env node

/**
 * i18n Quick Reference Guide
 * Fast lookup for common i18n tasks and code snippets
 */

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║          i18n QUICK REFERENCE GUIDE - AJO PLATFORM                ║
╚════════════════════════════════════════════════════════════════════╝

SUPPORTED LANGUAGES
═══════════════════════════════════════════════════════════════════
  Code  │ Name           │ Native Name     │ Direction │ Currency
  ──────┼────────────────┼─────────────────┼───────────┼─────────
  en    │ English        │ English         │ LTR       │ USD
  es    │ Spanish        │ Español         │ LTR       │ EUR
  fr    │ French         │ Français        │ LTR       │ EUR
  sw    │ Swahili        │ Kiswahili       │ LTR       │ TZS
  pt    │ Portuguese     │ Português       │ LTR       │ BRL
  ar    │ Arabic         │ العربية         │ RTL       │ SAR
  zh    │ Chinese        │ 中文            │ LTR       │ CNY


BACKEND API ENDPOINTS
═══════════════════════════════════════════════════════════════════

  GET /api/i18n/languages
  └─ Get all supported languages with metadata

  GET /api/i18n/current
  └─ Get current user's language preference

  POST /api/i18n/set-language
  └─ Set user's preferred language
     Body: { "language": "es" }

  GET /api/i18n/translations/:lang
  └─ Get all translations for a language
     Example: /api/i18n/translations/es

  GET /api/i18n/translations/:lang/:namespace
  └─ Get namespace-specific translations
     Example: /api/i18n/translations/es/auth

  GET /api/i18n/language-info/:code
  └─ Get detailed language information


BACKEND USAGE
═══════════════════════════════════════════════════════════════════

1. Import Services:
   ┌─────────────────────────────────────────────────────┐
   │ import { i18nMiddleware } from './middleware/i18n'  │
   │ import {                                            │
   │   getSupportedLanguages,                            │
   │   getTranslations,                                  │
   │   detectLanguage,                                   │
   │   formatCurrency,                                   │
   │ } from './services/i18nService'                     │
   └─────────────────────────────────────────────────────┘

2. Apply Middleware:
   ┌─────────────────────────────────────────────────────┐
   │ app.use(i18nMiddleware())                           │
   │                                                     │
   │ // Now routes have access to:                       │
   │ // - req.language (current language code)           │
   │ // - req.isRTL (is RTL language?)                   │
   │ // - req.textDirection ('ltr' or 'rtl')            │
   │ // - req.t() (async translation function)           │
   └─────────────────────────────────────────────────────┘

3. Use in Routes:
   ┌─────────────────────────────────────────────────────┐
   │ app.get('/data', (req, res) => {                    │
   │   const { language, isRTL } = req as I18nRequest    │
   │   const translation = await req.t('common.loading') │
   │   res.json({ language, isRTL, translation })        │
   │ })                                                  │
   └─────────────────────────────────────────────────────┘

4. Format Data:
   ┌─────────────────────────────────────────────────────┐
   │ import { formatNumber, formatCurrency } from        │
   │   './services/i18nService'                          │
   │                                                     │
   │ const num = formatNumber(1234.56, 'es')             │
   │ const usd = formatCurrency(100, 'en', 'USD')        │
   │ const eur = formatCurrency(100, 'es', 'EUR')        │
   └─────────────────────────────────────────────────────┘


FRONTEND USAGE (Next.js)
═══════════════════════════════════════════════════════════════════

1. Use Translations:
   ┌─────────────────────────────────────────────────────┐
   │ import { useTranslations } from 'next-intl'         │
   │                                                     │
   │ export function Header() {                          │
   │   const t = useTranslations()                       │
   │   return <h1>{t('common.app_name')}</h1>            │
   │ }                                                   │
   └─────────────────────────────────────────────────────┘

2. Language Switcher:
   ┌─────────────────────────────────────────────────────┐
   │ import { LanguageSwitcher } from '@/components'     │
   │                                                     │
   │ <LanguageSwitcher                                   │
   │   variant="dropdown"                                │
   │   size="md"                                         │
   │   showFlags={true}                                  │
   │ />                                                  │
   └─────────────────────────────────────────────────────┘

3. RTL Support:
   ┌─────────────────────────────────────────────────────┐
   │ import { RTLLayout, useIsRTL } from               │
   │   '@/components/RTLLayout'                          │
   │                                                     │
   │ export function MyComponent() {                     │
   │   const isRTL = useIsRTL()                          │
   │   return (                                          │
   │     <RTLLayout>                                     │
   │       <div className={isRTL ? 'text-right' : ''}>  │
   │         Content                                     │
   │       </div>                                        │
   │     </RTLLayout>                                    │
   │   )                                                 │
   │ }                                                   │
   └─────────────────────────────────────────────────────┘

4. Custom Hooks:
   ┌─────────────────────────────────────────────────────┐
   │ import {                                            │
   │   useIsRTL,                                         │
   │   useTextDirection,                                 │
   │   useNumberFormat,                                  │
   │   useCurrencyFormat,                                │
   │   useDateFormat,                                    │
   │ } from '@/hooks/useI18n'                            │
   │                                                     │
   │ export function MyComponent() {                     │
   │   const { format: formatNum } = useNumberFormat()   │
   │   const { format: formatCurr } = useCurrencyFormat()│
   │   const { format: formatD } = useDateFormat()       │
   │                                                     │
   │   return (                                          │
   │     <>                                              │
   │       <p>{formatNum(1234)}</p>                      │
   │       <p>{formatCurr(100)}</p>                      │
   │       <p>{formatD(new Date())}</p>                  │
   │     </>                                             │
   │   )                                                 │
   │ }                                                   │
   └─────────────────────────────────────────────────────┘


ADDING NEW TRANSLATIONS
═══════════════════════════════════════════════════════════════════

1. Add to English (source language):
   File: packages/shared/locales/en/{namespace}.json
   ┌─────────────────────────────────────────────────────┐
   │ {                                                   │
   │   "{namespace}": {                                  │
   │     "new_key": "English text"                       │
   │   }                                                 │
   │ }                                                   │
   └─────────────────────────────────────────────────────┘

2. Translate to all 6 languages:
   Files: packages/shared/locales/{es,fr,sw,pt,ar,zh}/
   └─ Same structure with translations

3. Use in code:
   Frontend: t('{namespace}.new_key')
   Backend: await translateKey('es', '{namespace}.new_key')


TESTING i18n
═══════════════════════════════════════════════════════════════════

Run Tests:
  npm test -- i18nService.test.ts
  npm test -- i18n.test.ts
  npm test -- --coverage i18n

Test Categories:
  • Language detection (10+ tests)
  • Translation loading (5+ tests)
  • RTL support (8+ tests)
  • Formatting functions (12+ tests)
  • Middleware functionality (15+ tests)


COMMON TASKS
═══════════════════════════════════════════════════════════════════

Detect User Language from Header:
  ┌─────────────────────────────────────────────────────┐
  │ import { detectLanguage } from './services/i18n'    │
  │ const lang = detectLanguage('es-ES,es;q=0.9')       │
  │ // Returns: 'es'                                    │
  └─────────────────────────────────────────────────────┘

Format Currency for Locale:
  ┌─────────────────────────────────────────────────────┐
  │ import { formatCurrency } from './services/i18n'    │
  │ const price = formatCurrency(99.99, 'es', 'EUR')    │
  │ // Returns: '99,99 €'                               │
  └─────────────────────────────────────────────────────┘

Check if RTL Language:
  ┌─────────────────────────────────────────────────────┐
  │ import { isRTLLanguage } from './services/i18n'     │
  │ if (isRTLLanguage('ar')) {                          │
  │   // Apply RTL styles                               │
  │ }                                                   │
  └─────────────────────────────────────────────────────┘

Get All Supported Languages:
  ┌─────────────────────────────────────────────────────┐
  │ import { getSupportedLanguages } from './services'  │
  │ const langs = getSupportedLanguages()               │
  │ // Returns: Array of language objects with metadata │
  └─────────────────────────────────────────────────────┘


TROUBLESHOOTING
═══════════════════════════════════════════════════════════════════

Language Not Detected:
  ✓ Check Accept-Language header is sent
  ✓ Verify middleware is applied first
  ✓ Check console for debug logs

RTL Not Applied:
  ✓ Verify dir="rtl" on HTML element
  ✓ Check CSS uses logical properties
  ✓ Ensure RTLLayout wrapper is used

Translations Missing:
  ✓ Check file exists at packages/shared/locales/{lang}/{ns}.json
  ✓ Verify key path is correct (dot notation)
  ✓ Clear translation cache

Performance Issues:
  ✓ Verify translation cache is working
  ✓ Check cache TTL settings
  ✓ Confirm lazy loading is enabled


DOCUMENTATION
═══════════════════════════════════════════════════════════════════

  • docs/I18N_IMPLEMENTATION.md ....... Full implementation guide
  • docs/I18N_ARCHITECTURE.md ........ System architecture diagrams
  • I18N_IMPLEMENTATION_SUMMARY.md ... Project completion summary


USEFUL COMMANDS
═══════════════════════════════════════════════════════════════════

  # Run i18n tests
  npm test -- i18n

  # Generate i18n structure
  bash scripts/generate-i18n-structure.sh

  # Populate translations
  bash scripts/populate-translations.sh

  # Check translation file syntax
  jq . packages/shared/locales/en/common.json

  # View all i18n services
  find backend/src -name "*i18n*" -type f

  # Count translation files
  find packages/shared/locales -name "*.json" | wc -l

  # Search for missing translations
  grep -r "\\[missing\\]" packages/shared/locales/


FILE LOCATIONS
═══════════════════════════════════════════════════════════════════

  Backend:
    • Config: backend/src/config/i18n.config.ts
    • Service: backend/src/services/i18nService.ts
    • Middleware: backend/src/middleware/i18n.ts
    • Routes: backend/src/routes/api/i18n.ts
    • Tests: backend/tests/{services,middleware}/i18n.test.ts

  Frontend:
    • Config: frontend/i18n.config.ts
    • Utils: frontend/src/i18n.ts
    • Middleware: frontend/src/middleware.ts
    • Components: frontend/src/components/{LanguageSwitcher,RTLLayout}.tsx
    • Hooks: frontend/src/hooks/useI18n.ts

  Translations:
    • Root: packages/shared/locales/
    • Structure: {en,es,fr,sw,pt,ar,zh}/{common,auth,groups,...}.json

  Scripts:
    • Generate structure: scripts/generate-i18n-structure.sh
    • Populate translations: scripts/populate-translations.sh


DEPLOYMENT CHECKLIST
═══════════════════════════════════════════════════════════════════

  Before deploying to production:

  ☐ All 70 translation files present
  ☐ No missing translations (no fallbacks in logs)
  ☐ Tests passing (npm test -- i18n)
  ☐ RTL tested with Arabic
  ☐ Language switching works
  ☐ Cache configured correctly
  ☐ Cookies enabled for language persistence
  ☐ Performance benchmarks acceptable
  ☐ Accessibility audit passed
  ☐ Mobile layout tested with RTL
  ☐ Documentation updated


ENVIRONMENT VARIABLES
═══════════════════════════════════════════════════════════════════

  Backend:
    I18N_DEFAULT_LANGUAGE=en
    I18N_CACHE_TTL=300000
    I18N_SUPPORTED_LANGUAGES=en,es,fr,sw,pt,ar,zh

  Frontend:
    NEXT_PUBLIC_I18N_DEFAULT_LOCALE=en
    NEXT_PUBLIC_SUPPORTED_LOCALES=en,es,fr,sw,pt,ar,zh


═══════════════════════════════════════════════════════════════════

For more information, see:
  • docs/I18N_IMPLEMENTATION.md
  • docs/I18N_ARCHITECTURE.md
  • I18N_IMPLEMENTATION_SUMMARY.md

Questions? Check GitHub issues or documentation above.
`)
