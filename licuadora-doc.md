# 🧃 Licuadora DRC Movil — Documentación técnica

## Índice

1. [Descripción general](#1-descripción-general)
2. [Arquitectura](#2-arquitectura)
3. [Métricas y definiciones](#3-métricas-y-definiciones)
4. [Backend — Orion](#4-backend--orion)
5. [Frontend — Netlify](#5-frontend--netlify)
6. [Gmail API y OAuth2](#6-gmail-api-y-oauth2)
7. [Nginx](#7-nginx)
8. [Flujo de procesamiento](#8-flujo-de-procesamiento)
9. [Procedimientos operativos](#9-procedimientos-operativos)
10. [Mejoras respecto a v1](#10-mejoras-respecto-a-v1)

---

## 1. Descripción general

**Licuadora DRC Movil** es una herramienta web interna del equipo de Control de Red Móvil (DRC Móvil) de Telecom Argentina. Analiza los casos de gestión de American Tower procesando los correos de la casilla corporativa y presenta cuatro métricas operativas clave.

El operador selecciona un rango de fechas, presiona **Procesar** y la herramienta lee, parsea y clasifica los correos automáticamente sin intervención manual.

**URLs:**
- Frontend: `https://licuadoraamtower.netlify.app`
- Backend API: `https://licuadora-at.duckdns.org`

---

## 2. Arquitectura

```
┌─────────────────────┐        HTTPS         ┌──────────────────────────┐
│  Netlify (frontend) │ ──── POST /procesar ─▶│  Orion — Node.js :3005   │
│  index.html         │ ◀─── JSON resultado ──│  /opt/licuadora-api/     │
│  css/estilos.css    │                        │  index.js (PM2)          │
│  js/app.js          │ ──── GET /auth/status ▶│                          │
└─────────────────────┘                        └────────────┬─────────────┘
                                                            │ Gmail API
                                                            ▼
                                               ┌──────────────────────────┐
                                               │  Google Cloud Project    │
                                               │  extended-arcana-473701  │
                                               │  OAuth2 · gmail.readonly │
                                               └──────────────────────────┘
```

**Stack:**
| Componente | Tecnología |
|---|---|
| Frontend | HTML + CSS + JS vanilla (Netlify) |
| Backend | Node.js + Express (PM2, puerto 3005) |
| Proxy | Nginx con SSL (Let's Encrypt / DuckDNS) |
| Autenticación | Google OAuth2 (token persistente en disco) |
| API de datos | Gmail API v1 (`gmail.readonly`) |

---

## 3. Métricas y definiciones

### ⏱️ Demoras
Casos que tienen mail de apertura registrado en el período analizado **pero no tienen mail de cierre**. Se muestra la cantidad de días transcurridos desde la apertura hasta hoy.

**Tags de SLA:**
- `< 3 días` — sin tag
- `≥ 3 días` — naranja
- `≥ 7 días` — rojo
- `≥ 10 días` — rojo intenso

### 🔁 Reiterados (30 días)
CIs (Configuration Items) con **dos o más aperturas de casos distintos** en los últimos 30 días. Indica sitios o equipos con problemas recurrentes.

### 💥 Impacto post reparación (24 hs)
Casos abiertos en un **CI distinto** dentro de las 24 horas siguientes al cierre de otro caso. Detecta fallas colaterales generadas por una reparación.

> **Condiciones:** la apertura debe ser posterior al cierre, pertenecer a un CS diferente y a un CI diferente al que se reparó.

### ✅ Cerrados últimos 7 días
Casos con fecha de cierre registrada en los últimos 7 días. Muestra la duración de resolución de cada caso (desde apertura hasta cierre).

---

## 4. Backend — Orion

### Ubicación y archivos

```
/opt/licuadora-api/
├── index.js        # Servidor Express + lógica de parsing
├── .env            # Variables de entorno (no commitear)
├── token.json      # Token OAuth2 persistente (generado automáticamente)
└── package.json
```

### Variables de entorno (`.env`)

```env
PORT=3005
GOOGLE_CLIENT_ID=402252483185-jqsc0qjcok3j2dnahfbi6gslcf3lav5j.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-*******************
GOOGLE_REDIRECT_URI=https://licuadora-at.duckdns.org/auth/callback
FRONTEND_ORIGIN=https://licuadoraamtower.netlify.app
```

### Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/auth/status` | Devuelve `{"authorized": true/false}` según si hay token guardado |
| `GET` | `/auth/google` | Inicia el flujo OAuth2, redirige a Google |
| `GET` | `/auth/callback` | Recibe el código de Google, guarda el token y muestra confirmación |
| `POST` | `/procesar` | Body: `{ "fecha_desde": "YYYY-MM-DD", "fecha_hasta": "YYYY-MM-DD" }` — ejecuta el análisis y devuelve los 4 resultados |

### Respuesta de `/procesar`

```json
{
  "totalEmails": 312,
  "totalCases": 87,
  "demoras": [ { "cs": "CS1234567", "ci": "BSAS-001", "dias": 12, "openDate": "..." } ],
  "reiterados": [ { "ci": "BSAS-001", "items": [ { "cs": "...", "date": "..." } ] } ],
  "impacto": [ { "cs": "...", "closeDate": "...", "closeCI": "...", "impacts": [...] } ],
  "cerrados7": [ { "cs": "...", "ci": "...", "openDate": "...", "closeDate": "..." } ]
}
```

### Gestión con PM2

```bash
pm2 list                          # Ver estado
pm2 logs licuadora-api            # Ver logs en tiempo real
pm2 restart licuadora-api         # Reiniciar
pm2 restart licuadora-api --update-env  # Reiniciar con nuevas variables de entorno
pm2 save                          # Persistir lista de procesos
```

### Dependencias

```bash
npm install express googleapis dotenv cors
```

---

## 5. Frontend — Netlify

**URL:** `https://licuadoraamtower.netlify.app`  
**Deploy:** manual (drag & drop en el panel de Netlify)

### Estructura de archivos

```
📁 (raíz)
├── index.html
├── 📁 css
│   └── estilos.css
└── 📁 js
    └── app.js
```

### Funcionalidades

- **Splash screen** al cargar: verifica la conexión al backend y el estado de autorización mientras muestra una animación de carga con pasos
- **Estado de conexión**: indicador visual (punto verde/rojo) que muestra si el backend está disponible y autorizado
- **Selector de rango de fechas**: por defecto muestra los últimos 30 días
- **Animación de licuadora**: durante el procesamiento, muestra mails cayendo al vaso, tapa bajando y licuado
- **Resumen ejecutivo (KPIs)**: cuatro tarjetas con los totales de cada métrica
- **Filtro por CI**: filtra en tiempo real todos los resultados por nombre de CI
- **Exportar CSV**: descarga un archivo CSV con todos los resultados, compatible con Excel (UTF-8 BOM)
- **Grupos colapsables**: los reiterados e impactos se muestran agrupados y expandibles

### Configuración del backend en `app.js`

```javascript
const API = "https://licuadora-at.duckdns.org";
```

Cambiar esta línea si el backend se mueve a otro servidor o dominio.

### Desarrollo y prueba local

Para probar cambios en el frontend localmente antes de desplegar a Netlify:

1. Abrir la carpeta del proyecto en VS Code.
2. Servir el archivo `index.html` mediante la extensión **Live Server** o un servidor local HTTP (ej: `npx serve .` o `python -m http.server 8080`).
3. Abrir `http://localhost:8080` (o la URL de Live Server) en el navegador. La aplicación conectará automáticamente con el backend desplegado en `https://licuadora-at.duckdns.org`.

---

## 6. Gmail API y OAuth2

### Proyecto GCP

| Campo | Valor |
|---|---|
| Proyecto | `My First Project` |
| Project ID | `extended-arcana-473701-r1` |
| Estado | Producción (publicada) |
| Scope | `https://www.googleapis.com/auth/gmail.readonly` |
| Redirect URI | `https://licuadora-at.duckdns.org/auth/callback` |

### Token OAuth2

El token se guarda en `/opt/licuadora-api/token.json` y se **auto-renueva** usando el refresh token. Con la app en modo **Producción**, el refresh token no caduca (salvo que no se use por más de 6 meses).

> ⚠️ En modo **Testing**, los tokens caducan a los 7 días. Si la app se pone de nuevo en Testing, hay que reconectar manualmente.

### Reconexión manual (si el token expira)

```bash
rm /opt/licuadora-api/token.json
pm2 restart licuadora-api
```

Luego abrir en el navegador:
```
https://licuadora-at.duckdns.org/auth/google
```

Google va a mostrar una pantalla de advertencia ("app no verificada") — hacer click en **Avanzado** → **Ir a Licuadora AT (no seguro)** → autorizar. Es esperado para apps internas no verificadas.

---

## 7. Nginx

### Archivo de configuración

`/etc/nginx/sites-enabled/licuadora-at` → `/etc/nginx/sites-available/licuadora-at`

```nginx
server {
    listen 80;
    server_name licuadora-at.duckdns.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name licuadora-at.duckdns.org;

    ssl_certificate     /etc/letsencrypt/live/licuadora-at.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/licuadora-at.duckdns.org/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### Certificado SSL

- **Dominio:** `licuadora-at.duckdns.org`
- **Vencimiento:** 1 de septiembre de 2026
- **Renovación:** manual con DNS challenge (el puerto 80 está bloqueado en el router)

```bash
# Renovar certificado (antes del 1 de septiembre de 2026)
sudo certbot certonly --manual --preferred-challenges dns -d licuadora-at.duckdns.org
```

Durante la renovación, actualizar el registro TXT en DuckDNS:
```
https://www.duckdns.org/update?domains=licuadora-at&token=TU_TOKEN_DUCKDNS&txt=VALOR_DEL_CHALLENGE
```

---

## 8. Flujo de procesamiento

```
Usuario abre la app
        │
        ▼
Splash screen (3-4 seg)
  ├── Ping a /auth/status
  └── Si authorized: punto verde, botón Procesar habilitado
        │
        ▼
Usuario selecciona rango de fechas → Procesar
        │
        ▼
POST /procesar { fecha_desde, fecha_hasta }
        │
        ▼
Backend busca en Gmail (query: after:X before:Y)
  └── Pagina hasta 2000 mensajes
        │
        ▼
Descarga cuerpos en lotes de 20 (paralelo)
        │
        ▼
parseGmailMessage() por cada mensaje
  ├── Extrae: CS, CI, tipo (open/close/comment), fechas
  └── Descarta mensajes sin CS identificable
        │
        ▼
buildCases() — agrupa por CS
  ├── opens[], closes[], comments[]
  └── mainCI, isClosed, openDate, closeDate
        │
        ▼
4 análisis en paralelo:
  ├── calcDemoras()     → casos sin cierre
  ├── calcReiterados()  → CI con múltiples aperturas en 30d
  ├── calcImpacto()     → aperturas post-cierre en CI distinto (24hs)
  └── calcCerrados7()   → cierres en últimos 7 días
        │
        ▼
JSON → Frontend → renderAll()
  ├── KPIs actualizados
  ├── 4 secciones con filas y grupos
  └── Filtro por CI + exportación CSV disponibles
```

---

## 9. Procedimientos operativos

### Reiniciar el servicio

```bash
pm2 restart licuadora-api
```

### Ver logs

```bash
pm2 logs licuadora-api --lines 50
```

### Deploy de cambios en el backend

```bash
# Editar el archivo
nano /opt/licuadora-api/index.js

# Reiniciar
pm2 restart licuadora-api --update-env
```

### Deploy de cambios en el frontend

1. Descargar los archivos modificados
2. Ir a `app.netlify.com` → sitio `licuadoraamtower`
3. Pestaña **Deploys** → arrastrar la carpeta con la estructura correcta

### Renovar certificado SSL (antes del 01/09/2026)

```bash
sudo certbot certonly --manual --preferred-challenges dns -d licuadora-at.duckdns.org
```

1. Certbot muestra un valor TXT
2. Actualizar en DuckDNS: `https://www.duckdns.org/update?domains=licuadora-at&token=TOKEN&txt=VALOR`
3. Verificar propagación en: `https://toolbox.googleapps.com/apps/dig/#TXT/_acme-challenge.licuadora-at.duckdns.org`
4. Presionar Enter en certbot
5. `sudo systemctl reload nginx`

### Reconectar Gmail (si el token expira)

```bash
rm /opt/licuadora-api/token.json
pm2 restart licuadora-api
```

Luego abrir `https://licuadora-at.duckdns.org/auth/google` y autorizar.

---

## 10. Mejoras respecto a v1

La versión original (v1) procesaba un archivo TXT exportado manualmente desde Outlook.

| Característica | v1 (TXT) | v2 (Gmail API) |
|---|---|---|
| Fuente de datos | Archivo TXT manual | Gmail API automática |
| Selección de período | No (todo el archivo) | Sí (datepicker) |
| Splash screen | No | Sí |
| KPIs ejecutivos | No | Sí (4 tarjetas) |
| Filtro por CI | No | Sí |
| Exportar CSV | No | Sí |
| Animación loading | SVG básico | Licuadora animada en fases |
| Bug \r\n en split | Sí | N/A (no hay split de TXT) |
| Token OAuth persistente | N/A | Sí (auto-renovable) |

---

*Licuadora DRC Movil v2 — DRC Móvil · Telecom Argentina*
