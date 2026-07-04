# ☁️ Guide de déploiement Cloud

Déploiement gratuit de bout en bout : **MongoDB Atlas** (base) →
**Render** (API) → **Vercel/Netlify** (dashboard).

---

## 1️⃣ MongoDB Atlas (base de données)

1. Créer un compte sur [mongodb.com/atlas](https://www.mongodb.com/atlas) et un
   **cluster gratuit M0**.
2. *Database Access* → créer un utilisateur (login + mot de passe).
3. *Network Access* → autoriser l'accès depuis partout : `0.0.0.0/0`
   (nécessaire pour que Render puisse se connecter).
4. *Connect → Drivers* → copier la chaîne de connexion :
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/labo_iot?retryWrites=true&w=majority
   ```
   > Remplacez `<password>` et ajoutez le nom de base `labo_iot` avant le `?`.

---

## 2️⃣ Render (API Node.js)

1. Pousser le code sur **GitHub** (déjà fait ✅).
2. Sur [render.com](https://render.com) → *New → Web Service* → connecter le dépôt.
3. Configuration :
   - **Root Directory** : `api`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
4. *Environment* → ajouter les variables (identiques au `.env`) :
   | Clé                 | Valeur                                   |
   |---------------------|------------------------------------------|
   | `MONGODB_URI`       | la chaîne Atlas de l'étape 1             |
   | `API_KEY`           | une clé secrète de votre choix           |
   | `CORS_ORIGIN`       | l'URL du dashboard (étape 3)             |
   | `DEFAULT_THRESHOLD` | `30`                                     |
   | `HYSTERESIS`        | `2`                                      |
   | `DEVICE_ID`         | `LABO-INFO-01`                           |
5. Déployer → récupérer l'URL publique : `https://votre-api.onrender.com`.

### ⚠️ Piège de l'offre gratuite Render (à connaître pour la démo)

> Le service **s'endort après 15 min d'inactivité** et met **30–60 s** à se
> réveiller à la requête suivante.

**Parades :**
- **Réveiller l'API 5 min avant la démonstration** (ouvrir son URL dans le navigateur).
- Ou créer un « ping » automatique sur [cron-job.org](https://cron-job.org)
  (gratuit) qui appelle `https://votre-api.onrender.com/health` toutes les 10 min.

---

## 3️⃣ Vercel ou Netlify (dashboard)

### Option A — Vercel
1. Sur [vercel.com](https://vercel.com) → *Add New → Project* → importer le dépôt.
2. **Root Directory** : `dashboard`. Framework : *Other* (site statique).
3. Déployer → URL publique du tableau de bord.

### Option B — Netlify
1. Sur [netlify.com](https://netlify.com) → *Add new site → Import from Git*.
2. **Base directory** : `dashboard`. Pas de build. **Publish directory** : `dashboard`.

### Étape finale (indispensable)
Dans `dashboard/config.js`, mettre l'URL réelle de l'API :
```js
API_BASE: 'https://votre-api.onrender.com',
```
Puis recommitter/redéployer. Et vérifier que `CORS_ORIGIN` (sur Render)
contient bien l'URL du dashboard.

---

## 4️⃣ ESP32

Dans `esp32/config.h` :
```c
#define API_URL  "https://votre-api.onrender.com/api/measures"
#define API_KEY  "la-meme-cle-que-sur-render"
```
> ⚠️ L'ESP32 doit contacter l'API en **HTTPS** (URL Render). La bibliothèque
> `HTTPClient` de l'ESP32 gère le HTTPS ; en cas de souci de certificat,
> utiliser `client.setInsecure()` avec `WiFiClientSecure` (acceptable en TP).

---

## ✅ Checklist de mise en ligne

- [ ] Cluster Atlas créé + accès réseau `0.0.0.0/0`
- [ ] API déployée sur Render avec toutes les variables d'environnement
- [ ] `GET /` de l'API répond en ligne
- [ ] Dashboard déployé + `API_BASE` mis à jour
- [ ] `CORS_ORIGIN` = URL du dashboard
- [ ] ESP32 configuré avec l'URL HTTPS + clé API
- [ ] Ping keep-alive configuré (anti-veille Render)
- [ ] Test de bout en bout : ESP32 → API → dashboard
