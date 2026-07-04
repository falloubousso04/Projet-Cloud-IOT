# 📊 Tableau de bord Web

Interface de visualisation temps réel des mesures et des historiques.
Technologies : **HTML5 / CSS3 / JavaScript (Vanilla)** + **Chart.js**.

## ⚙️ Configuration

Ouvrez [`config.js`](config.js) et renseignez l'URL de l'API :

```js
const CONFIG = {
  // Cloud : 'https://projet-cloud-iot.onrender.com' — Local : 'http://localhost:3000'
  API_BASE: 'https://projet-cloud-iot.onrender.com',
  DEVICE_ID: 'LABO-INFO-01',
  REFRESH_INTERVAL: 3000,        // rafraîchissement temps réel (ms)
  STALE_THRESHOLD_SEC: 20,       // délai avant « signal perdu »
};
```

## ▶️ Lancer en local

Aucune compilation nécessaire. Servez simplement les fichiers statiques :

```bash
# Option 1 : avec Python
python -m http.server 8080

# Option 2 : avec Node (npx)
npx serve .
```

Puis ouvrez `http://localhost:8080`.

> Ouvrir `index.html` directement (`file://`) peut poser des soucis de CORS
> selon le navigateur : préférez un petit serveur statique.

## 🖥️ Fonctionnalités

- **Temps réel** (§9) : température, humidité, seuil, date/heure de la dernière
  mesure, rafraîchis automatiquement par *polling*.
- **Distinction claire des états** (§9) :
  - 🟢 **Normal** · 🔴 **Alerte** (bandeau qui pulse) · 🟠 **Signal perdu**
    (mesure périmée) · ⚪ **Aucune donnée** · 🔌 **Connexion perdue** (API injoignable).
- **Compteurs d'alertes** : nombre d'alertes **aujourd'hui**, **cette semaine**
  et **au total** (en rouge dès qu'il y en a).
- **Graphique temps réel** de la température avec ligne de seuil.
- **Historique journalier** par période : Matin · Soir · Nuit
  (nombre de mesures, moyenne, min/max, nombre d'alertes).
- **Historique hebdomadaire** : moyennes journalières + nombre d'alertes (barres).
- **Tableau des dernières alertes** (début, fin, pic, durée, statut).
- **Responsive mobile** : barre de navigation fixe en bas d'écran
  (État · Temps réel · Historique · Alertes) avec onglet actif au défilement.

## ☁️ Déploiement

Déployable tel quel sur **Vercel**, **Netlify** ou **Render (site statique)**.
Pensez à mettre à jour `API_BASE` dans `config.js` avec l'URL publique de l'API,
et à autoriser l'origine du dashboard dans la variable `CORS_ORIGIN` de l'API.
