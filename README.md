# КБЖУ AI — облачная версия (Cloudflare)

Структура репозитория:
- `public/index.html` — приложение
- `functions/api/sync.js` — API (Cloudflare Pages Functions)
- `schema.sql` — таблицы базы D1

## Развёртывание
1. Загрузите всё это в репозиторий на GitHub (может быть приватным).
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → выберите репозиторий.
   Framework preset: None. Build command: пусто. Build output directory: `public`.
3. Cloudflare → Storage & Databases → D1 → Create database, имя `kbzhu`. Откройте её → Console, вставьте содержимое `schema.sql`, выполните.
4. Проект Pages → Settings → Bindings → Add → D1 database: Variable name `DB`, база `kbzhu`. Сделайте для Production (и Preview). Затем Deployments → Retry deployment.
5. Закройте сайт входом: Settings → General → Access policy → Enable (создаст приложение Access для сайта и превью-адресов). Затем Zero Trust → Access → Applications → откройте созданное приложение → Policies: Allow, Include → Emails → впишите почты всех пользователей. Вход: одноразовый код на почту.
6. Откройте `https://<проект>.pages.dev`, войдите по почте. В шапке должно появиться «☁️ синхронизировано».
