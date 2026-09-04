# Deploy su Linode

Guida per un Linode Ubuntu/Debian con un solo processo Next.js, Nginx davanti e
SQLite su disco persistente. Sostituisci i valori tra `<...>`.

## 1. Prerequisiti

Installa sul server Git, Nginx, SQLite, Certbot, strumenti di compilazione, Node.js
22 o successivo e Corepack. Abilita Corepack come amministratore, poi crea un
utente di servizio e le directory persistenti:

```bash
sudo corepack enable
sudo useradd --system --create-home --shell /bin/bash nextsmash
sudo mkdir -p /srv/nextsmash /var/lib/nextsmash
sudo chown -R nextsmash:nextsmash /srv/nextsmash /var/lib/nextsmash
sudo -u nextsmash git clone <URL_GIT> /srv/nextsmash/app
cd /srv/nextsmash/app
sudo -u nextsmash pnpm install --frozen-lockfile
sudo -u nextsmash cp .env.example .env
```

Imposta in `/srv/nextsmash/app/.env` almeno:

```dotenv
DATABASE_PATH=/var/lib/nextsmash/next-smash.sqlite
PUC_API_URL=https://dp-myfit-test-function-v2.azurewebsites.net/api/v3/tornei/puc/list
SYNC_HORIZON_DAYS=400
TOURNAMENT_REFRESH_AFTER_HOURS=12
```

Prepara dati e build:

```bash
cd /srv/nextsmash/app
sudo -u nextsmash pnpm db:migrate
sudo -u nextsmash pnpm sync:tournaments
sudo -u nextsmash pnpm build
```

## 2. Servizio systemd

Crea `/etc/systemd/system/nextsmash.service`:

```ini
[Unit]
Description=NextSmash web app
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=nextsmash
Group=nextsmash
WorkingDirectory=/srv/nextsmash/app
EnvironmentFile=/srv/nextsmash/app/.env
Environment=NODE_ENV=production
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3000
ExecStart=/usr/bin/env pnpm start
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/lib/nextsmash /srv/nextsmash/app/.next

[Install]
WantedBy=multi-user.target
```

Attiva il servizio:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nextsmash
sudo systemctl status nextsmash
```

## 3. Sincronizzazione pianificata (fallback)

L’app avvia già una sincronizzazione non bloccante quando una persona apre tornei
o calendario e i dati completi hanno più di 12 ore. Il timer seguente resta utile
come fallback, così i dati vengono aggiornati anche nei periodi senza visite.

Crea `/etc/systemd/system/nextsmash-sync.service`:

```ini
[Unit]
Description=Sincronizza tornei NextSmash
After=network-online.target

[Service]
Type=oneshot
User=nextsmash
Group=nextsmash
WorkingDirectory=/srv/nextsmash/app
EnvironmentFile=/srv/nextsmash/app/.env
ExecStart=/usr/bin/env pnpm sync:tournaments
```

Crea `/etc/systemd/system/nextsmash-sync.timer`:

```ini
[Unit]
Description=Sincronizza NextSmash due volte al giorno

[Timer]
OnCalendar=*-*-* 05,17:00:00
Persistent=true
RandomizedDelaySec=10m

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nextsmash-sync.timer
sudo systemctl list-timers nextsmash-sync.timer
```

## 4. Nginx e HTTPS

Crea `/etc/nginx/sites-available/nextsmash`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name <DOMINIO>;

    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/nextsmash /etc/nginx/sites-enabled/nextsmash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d <DOMINIO>
```

## 5. Aggiornamenti

```bash
cd /srv/nextsmash/app
sudo -u nextsmash git pull --ff-only
sudo -u nextsmash pnpm install --frozen-lockfile
sudo -u nextsmash pnpm db:migrate
sudo -u nextsmash pnpm build
sudo systemctl restart nextsmash
sudo -u nextsmash pnpm sync:tournaments
```

Prima di aggiornamenti importanti, salva il database:

```bash
sudo -u nextsmash sqlite3 /var/lib/nextsmash/next-smash.sqlite ".backup '/var/lib/nextsmash/backup.sqlite'"
```

Verifica finale: home, filtri, calendario, preferenze, link ufficiali, certificato TLS,
log di `nextsmash.service` e ultimo esito di `nextsmash-sync.service`.
