/* Generátor bezpečnostních hlaviček pro Vercel.
 *
 * Content-Security-Policy nesmí obsahovat 'unsafe-inline' pro skripty —
 * to by z celé politiky udělalo kulisu. Inline <script> bloky v HTML se
 * proto povolují po jednom, přes SHA-256 otisk jejich přesného obsahu.
 *
 * Důsledek: KDYKOLIV se změní jakýkoli inline <script> v HTML, otisk
 * přestane sedět a prohlížeč ten skript zablokuje. Po každé takové
 * úpravě je nutné spustit:
 *
 *     node tools/csp-hashes.mjs
 *
 * Skript přepíše vercel.json aktuálními otisky. */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

/* Stránky, které se opravdu nasazují (viz .vercelignore). */
const PAGES = [
  'index.html',
  's-cim-pomaham.html',
  'prubeh-a-cenik.html',
  'kraniosakralni-terapie.html',
  'o-mne.html',
  '404.html',
];

/* Inline skript = <script> bez atributu src. Platí i pro
   type="application/ld+json" — CSP hlídá všechny <script> elementy
   bez ohledu na to, jestli je prohlížeč spouští. */
const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

const hashes = new Set();
for (const page of PAGES) {
  const html = readFileSync(page, 'utf8');
  for (const [, attrs, body] of html.matchAll(SCRIPT)) {
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const digest = createHash('sha256').update(body, 'utf8').digest('base64');
    hashes.add(`'sha256-${digest}'`);
  }
}

/* Politika je vědomě těsná: web nenačítá nic zvenčí kromě mapy.
   'unsafe-inline' zůstává jen u stylů — HTML používá style="" atributy
   na desítkách míst a injektáž stylu je řádově menší riziko než skript. */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' ${[...hashes].sort().join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.google.com",
  "media-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  /* Vynutí HTTPS na dva roky včetně subdomén. Hodnota je připravená
     i pro zápis do preload listu (hstspreload.org). */
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: csp },
  /* Prohlížeč nesmí hádat typ souboru podle obsahu. */
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  /* Clickjacking. frame-ancestors v CSP je moderní varianta,
     X-Frame-Options zůstává kvůli starším prohlížečům. */
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  /* Web nepotřebuje kameru, mikrofon, polohu ani platby — vypnout. */
  {
    key: 'Permissions-Policy',
    value: [
      'accelerometer=()', 'autoplay=()', 'camera=()', 'display-capture=()',
      'encrypted-media=()', 'fullscreen=(self "https://www.google.com")',
      'geolocation=()', 'gyroscope=()',
      'magnetometer=()', 'microphone=()', 'midi=()', 'payment=()',
      'picture-in-picture=()', 'publickey-credentials-get=()', 'usb=()',
      'screen-wake-lock=()', 'xr-spatial-tracking=()', 'interest-cohort=()',
    ].join(', '),
  },
  /* Izolace okna proti útokům přes window.opener.
     Cross-Origin-Embedder-Policy se vědomě NENASAZUJE: vyžadovalo by,
     aby vložená Google mapa sama posílala COEP hlavičky, což nedělá —
     mapa na stránce s cenami by přestala fungovat. */
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  /* Vercel na statiku posílá Access-Control-Allow-Origin: *.
     Web nemá žádné API, takže sdílení napříč originy není k čemu. */
  { key: 'Access-Control-Allow-Origin', value: 'https://www.katkajuttnerova.cz' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  headers: [
    { source: '/(.*)', headers: securityHeaders },
    /* Statika s neměnným obsahem — dlouhá cache.
       Při výměně fotky je potřeba změnit název souboru. */
    {
      source: '/assets/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/(fonts|css|js|vendor)/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    /* HTML se nesmí cachovat natvrdo, jinak se změny neprojeví. */
    {
      source: '/(.*).html',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
    },
    {
      source: '/.well-known/security.txt',
      headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }],
    },
  ],
};

writeFileSync('vercel.json', JSON.stringify(config, null, 2) + '\n', 'utf8');
console.log(`vercel.json zapsán — ${hashes.size} otisků inline skriptů z ${PAGES.length} stránek`);
