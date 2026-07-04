# 🔧 API Node.js — Surveillance IoT

API REST de réception, stockage et consultation des mesures du laboratoire.
Technologies : **Node.js · Express · Mongoose · MongoDB Atlas**.

## 📦 Installation

```bash
cd api
npm install
cp .env.example .env      # puis renseignez le fichier .env
npm start                 # ou : npm run dev (rechargement auto avec nodemon)
```

## 🔐 Variables d'environnement (`.env`)

| Variable            | Description                                             |
|---------------------|--------------------------------------------------------|
| `PORT`              | Port d'écoute (défaut 3000)                            |
| `MONGODB_URI`       | Chaîne de connexion MongoDB Atlas                     |
| `API_KEY`           | Clé secrète exigée pour publier une mesure (en-tête `x-api-key`) |
| `CORS_ORIGIN`       | Origine(s) autorisée(s) pour le dashboard (`*` en dev) |
| `DEVICE_ID`         | Identifiant de la salle par défaut                     |
| `DEFAULT_THRESHOLD` | Seuil par défaut (°C)                                  |
| `HYSTERESIS`        | Largeur de la zone morte (°C)                          |

## 🧪 Données de démonstration

```bash
npm run seed     # ⚠️ efface et régénère 1 semaine de mesures + alertes
```

## 📡 Endpoints

> 🔒 = protégé par clé API (en-tête `x-api-key`). Les autres sont publics (lecture).

### Mesures

| Méthode | Route                       | Description                              |
|---------|-----------------------------|------------------------------------------|
| 🔒 POST | `/api/measures`             | Enregistrer une nouvelle mesure          |
| GET     | `/api/measures`             | Lister les mesures (filtres ci-dessous)  |
| GET     | `/api/measures/latest`      | Dernière mesure + état courant           |

**Filtres de `GET /api/measures`** (query params) :
`deviceId`, `date=YYYY-MM-DD`, `from`, `to`, `period=matin|soir|nuit`,
`state=NORMAL|ALERT`, `limit`.

**Corps de `POST /api/measures`** :
```json
{ "deviceId": "LABO-INFO-01", "temperature": 31.5, "humidity": 55, "threshold": 30 }
```

### Alertes

| Méthode | Route                    | Description                          |
|---------|--------------------------|--------------------------------------|
| GET     | `/api/alerts`            | Tous les évènements d'alerte         |
| GET     | `/api/alerts/active`     | Alerte(s) en cours                   |
| GET     | `/api/alerts/resolved`   | Retours à l'état normal (résolues)   |

### Historiques

| Méthode | Route                     | Description                                    |
|---------|---------------------------|------------------------------------------------|
| GET     | `/api/history/daily`      | Par période : matin / soir / nuit (`?date=`)   |
| GET     | `/api/history/weekly`     | Par jour de la semaine (`?week=`)              |
| GET     | `/api/history/monthly`    | Par jour du mois (`?month=`)                   |

### Divers

| Méthode | Route      | Description                          |
|---------|------------|--------------------------------------|
| GET     | `/`        | Infos de l'API + liste des endpoints |
| GET     | `/health`  | Sonde de disponibilité (keep-alive)  |

## 📐 Format des réponses

Succès :
```json
{ "success": true, "data": { ... }, "meta": { ... } }
```
Erreur :
```json
{ "success": false, "error": "message explicite" }
```

Codes utilisés : `200` OK · `201` Créé · `400` Requête invalide ·
`401` Clé manquante · `403` Clé invalide · `404` Introuvable · `500` Erreur serveur.

## 🗂️ Structure

```
api/
├── config/        env.js (config) · db.js (connexion Mongo)
├── models/        Measurement.js · AlertEvent.js
├── services/      alertService.js (machine à états + hystérésis)
├── controllers/   measure · alert · history
├── routes/        measureRoutes · alertRoutes · historyRoutes
├── middleware/    auth (clé API) · errorHandler · asyncHandler
├── utils/         dateUtils.js (périodes matin/soir/nuit)
├── scripts/       seed.js
└── server.js
```

## 🧠 Logique d'alerte (machine à états)

L'API est la **source de vérité** : elle recalcule l'état à partir de l'état
précédent, ce qui garantit **un seul évènement par épisode d'alerte** (§5.2).

```
NORMAL ──(temp ≥ seuil)──────────────► ALERT      (crée un AlertEvent)
ALERT  ──(temp < seuil − hystérésis)─► NORMAL     (clôture l'AlertEvent)
```
