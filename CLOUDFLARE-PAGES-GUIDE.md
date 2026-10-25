# Linker Site’ni Cloudflare Pages’ga ko‘chirish

Ushbu qo‘llanma `ss-diyor/linker-site` repository’sining hozirgi arxitekturasiga mos yozilgan.

## 1. Avval arxitekturani tushunib oling

Bu loyiha server-side backendga ega bo‘lgan Node.js ilova emas. Saytning frontend va admin paneli HTML, CSS va JavaScript fayllaridan iborat.

Ammo u to‘liq statik ham emas: public sahifalar va admin panel ma’lumotlarni Supabase’dan oladi. Supabase quyidagi vazifalarni bajaradi:

- Authentication va admin login;
- PostgreSQL database;
- `books`, `media_items`, `updates`, `about_content` va `now_settings` jadvallari;
- Row Level Security va admin ruxsatlari.

Shuning uchun ko‘chirishda faqat frontend hosting o‘zgaradi:

```text
GitHub repository → Cloudflare Pages → browser
                              ↓
                    Supabase Auth + Database
```

Supabase loyihasini ko‘chirish yoki qayta yaratish shart emas.

## 2. Cloudflare account va Pages loyihasini yaratish

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) saytiga kiring yoki account yarating.
2. **Workers & Pages** bo‘limini oching.
3. **Create application** yoki **Create project** tugmasini tanlang.
4. **Pages** va keyin **Connect to Git** variantini tanlang.
5. GitHub account’ni ulang.
6. `ss-diyor/linker-site` repository’sini tanlang.
7. Production branch sifatida `main` branch’ni belgilang.

## 3. Build sozlamalari

Bu repository uchun quyidagi sozlamalar yetarli:

```text
Framework preset: None
Build command: bo‘sh qoldiring
Build output directory: /
Root directory: /
Production branch: main
```

Agar Cloudflare `Build output directory` uchun qiymat talab qilsa, repository root’ini bildiruvchi `/` yoki `.` qiymatidan foydalaning.

Bu loyihada `package.json` va build bundler yo‘q. HTML fayllar repository root’ida tayyor holatda turibdi. Shuning uchun `npm run build` yoki boshqa build command kerak emas.

**Save and Deploy** tugmasini bosing. Cloudflare vaqtinchalik `*.pages.dev` manzil beradi.

Cloudflare Pages Git integration’da GitHub’ga push qilingan o‘zgarishlar asosida preview yoki production deployment yaratadi. Cloudflare Free limitlarida bir oyga 500 ta build, loyiha uchun 20 000 tagacha fayl va bitta loyiha uchun 100 tagacha custom domain mavjud. [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)

## 4. Netlify routing’ini Cloudflare formatiga o‘tkazish

Hozirgi repository’da routing `netlify.toml` orqali ishlaydi:

```text
/admin → /admin.html
/now   → /now.html
/about → /about.html
```

Cloudflare Pages uchun repository root’ida `_redirects` nomli fayl yarating:

```text
/admin  /admin.html  200
/now    /now.html    200
/about  /about.html  200
/tools  /tools.html  200
/tools/password-generator  /password-generator.html  200
/tools/qr-code-generator  /qr-code-generator.html  200
/*      /404.html    404
```

Muhim: `_redirects` fayli aynan repository root’ida bo‘lishi kerak. U `styles.css` yoki boshqa papkaga qo‘yilmaydi.

Keyin o‘zgarishni GitHub’ga yuboring:

```bash
git add _redirects
git commit -m "Add Cloudflare Pages redirects"
git push origin main
```

Cloudflare yangi commitni avtomatik deploy qiladi.

## 5. Security header’larni ko‘chirish

Netlify’dagi `netlify.toml` ichida security header’lar mavjud. Cloudflare Pages uchun repository root’ida `_headers` faylini yarating:

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/favicon.ico
  Cache-Control: public, max-age=31536000, immutable

/og.png
  Cache-Control: public, max-age=86400
```

`Strict-Transport-Security` header’ini domain Cloudflare’da HTTPS bilan to‘liq ishlayotganini tekshirgandan keyin qo‘shing. Dastlab quyidagisini ishlatmaslik xavfsizroq:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Agar keyinchalik barcha subdomain’lar ham HTTPS bilan ishlashi aniq bo‘lsa, uni `_headers` faylidagi `/*` blokiga qo‘shishingiz mumkin.

Cloudflare `_headers` fayli haqida [rasmiy hujjat](https://developers.cloudflare.com/pages/configuration/headers/) mavjud.

## 6. Preview deployment’ni tekshirish

Custom domainni ulashdan oldin `*.pages.dev` manzilda quyidagilarni tekshiring:

- `/` homepage ochilishi;
- `/about` About sahifasiga olib borishi;
- `/now` Now sahifasini ochishi;
- `/admin` admin login sahifasini ochish;
- `/tools` tools katalogini ochish;
- `/tools/password-generator` password generator sahifasini ochish;
- `/tools/qr-code-generator` QR generator sahifasini ochish;
- noto‘g‘ri URL 404 sahifasini qaytarishi;
- Dark va Light theme ishlashi;
- Mutolaa linki ishlashi;
- loading spinnerlar chiqishi va keyin yashirinishi;
- public `Now` ma’lumotlari Supabase’dan kelishi;
- admin email va parol bilan login qilish;
- About, Now, kitob, media va `Nimadir` ma’lumotlarini tahrirlash;
- admin paneldan chiqish va qayta login qilish.

Admin panelda login ishlamasa, avval quyidagilarni tekshiring:

1. Supabase loyihasi faolmi?
2. `supabase-config.js` dagi URL va publishable key to‘g‘rimi?
3. Supabase schema va RLS migration’lari bajarilganmi?
4. Admin user `admin_users` jadvaliga qo‘shilganmi?
5. Browser Console’da CORS yoki Supabase xatosi bormi?

`supabase-config.js` dagi publishable key frontendda ko‘rinishi mumkin. Bu keyni yashirish emas, Supabase RLS policies’ni to‘g‘ri sozlash muhim. Secret yoki service-role key’ni frontendga qo‘ymang.

## 7. Custom domainni ulash

1. Cloudflare Dashboard’da **Workers & Pages** → loyihangizni oching.
2. **Custom domains** → **Set up a domain** ni tanlang.
3. Yangi domainni kiriting.
4. Agar root domain ishlatilsa, masalan `diyorsultanov.uz`, Cloudflare nameserver’larini domain registrar’da o‘rnating.
5. Agar subdomain ishlatilsa, masalan `www.diyorsultanov.uz`, DNS provider’da CNAME record yarating:

```text
Type:  CNAME
Name:  www
Target: <your-project>.pages.dev
```

Root domain uchun Cloudflare domainni o‘z zone’iga qo‘shishi va nameserver’larni Cloudflare’ga ko‘rsatish talab qilinadi. Subdomain uchun esa CNAME yetarli bo‘lishi mumkin. [Cloudflare custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)

Cloudflare SSL sertifikatini avtomatik beradi. DNS aktivatsiyasi bir necha daqiqa yoki ayrim registrar’larda ko‘proq vaqt olishi mumkin.

## 8. Netlify’dan uzish tartibi

Netlify’ni darhol o‘chirmang. Quyidagi tartib xavfsizroq:

1. Cloudflare Pages loyihasini yarating.
2. `*.pages.dev` preview URL’da hamma narsani tekshiring.
3. Custom domainni Cloudflare Pages’ga ulang.
4. Domain yangi hostingda to‘g‘ri ochilishini tekshiring.
5. DNS propagation tugaganidan keyin bir nechta network’dan tekshiring.
6. Shundan keyingina Netlify project’ni disconnect yoki delete qiling.

Shunday qilsangiz, muammo chiqsa DNS’ni vaqtincha Netlify’ga qaytarishingiz mumkin.

## 9. Har bir commitda build sonini kamaytirish

Cloudflare Pages Netlify’dagi kabi commit asosida avtomatik deploy qiladi. Agar har bir kichik commit production deploy qilinishini xohlamasangiz:

- production branch sifatida faqat `main` branch’ni qoldiring;
- kundalik ish uchun alohida development branch ishlating;
- tayyor bo‘lganda development branch’ni `main` ga merge qiling;
- katta o‘zgarishlarni bitta commitga birlashtiring;
- Cloudflare Pages build limitlarini dashboard’dan kuzatib boring.

Sizning hozirgi repo’da alohida build command yo‘q, shuning uchun har bir build odatda juda yengil bo‘ladi. Ammo Cloudflare Pages baribir har bir production push’ni deployment sifatida hisoblaydi.

Agar production deployment’ni qo‘lda qilish kerak bo‘lsa, Git integration o‘rniga Direct Upload yoki Wrangler workflow ishlatilishi mumkin. Bunda GitHub push avtomatik production deploy qilmaydi, lekin deployni o‘zingiz ishga tushirasiz. [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

## 10. Netlify fayllari bilan nima qilish kerak?

Migration to‘liq ishlaganini tekshirmaguncha `netlify.toml` faylini o‘chirmang. Keyin uni repository’dan olib tashlash mumkin, chunki Cloudflare `_redirects` va `_headers` fayllaridan foydalanadi.

Odatdagi yakuniy root tuzilma quyidagicha bo‘ladi:

```text
_redirects
_headers
index.html
about.html
now.html
404.html
admin.html
styles.css
script.js
admin.js
about-db.js
now-db.js
updates.js
supabase-config.js
assets/
```

`supabase/` papkasi esa database schema va migration fayllari sifatida repository’da qoladi. U Cloudflare Pages tomonidan deploy qilinmaydi.

## 11. Muhim xavfsizlik tekshiruvi

- `supabase-config.js` ichiga service-role key qo‘ymang.
- Admin sahifasini `robots.txt` orqali noindex qilishni saqlang.
- Supabase RLS policies’ni o‘chirmang.
- `admin_users` jadvaliga faqat ishonchli user ID’larni qo‘shing.
- Public query’lar faqat published content’ni qaytarsin.
- Domain HTTPS ishlayotganini tekshirmasdan HSTS preload yoqmang.
- `admin.html` URL’si yashirin emasligini tushuning; himoya login va Supabase RLS orqali amalga oshadi.

## 12. Qisqa yakuniy checklist

- [ ] Cloudflare account tayyor.
- [ ] GitHub repository Pages’ga ulangan.
- [ ] Build command bo‘sh.
- [ ] Output directory repository root.
- [ ] `_redirects` qo‘shilgan.
- [ ] `_headers` qo‘shilgan.
- [ ] `*.pages.dev` URL tekshirilgan.
- [ ] `/`, `/about`, `/now`, `/admin` ishlayapti.
- [ ] Supabase public content yuklanyapti.
- [ ] Admin login va CRUD amallari ishlayapti.
- [ ] Custom domain ulangan.
- [ ] HTTPS ishlayapti.
- [ ] DNS bir nechta tarmoqdan tekshirilgan.
- [ ] Shundan keyin Netlify o‘chirilgan.

## Rasmiy hujjatlar

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Cloudflare Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/)
- [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
