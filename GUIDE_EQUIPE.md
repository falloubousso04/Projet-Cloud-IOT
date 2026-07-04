# 👥 Guide de démarrage pour l'équipe

Ce guide explique comment récupérer le projet et se mettre au même niveau que le
reste du groupe après un `git clone`.

> ℹ️ La solution est **déjà déployée dans le Cloud**. Pour simplement *voir* le
> projet fonctionner, aucune installation n'est nécessaire — ouvrez les liens
> de la section « Accès rapide ». L'installation locale n'est utile que pour
> **développer / modifier** le code.

---

## 🌍 Accès rapide (sans rien installer)

- **Tableau de bord** : https://projet-iot-dashboard.onrender.com
- **API** : https://projet-cloud-iot.onrender.com

> ⏱️ Le premier chargement peut prendre ~50 s (l'hébergement gratuit se met en
> veille après inactivité). Rechargez la page si besoin.

---

## 1. Cloner le dépôt

```bash
git clone https://github.com/serignefalloubousso99-dot/Projet-Cloud-IOT.git
cd Projet-Cloud-IOT
```

---

## 2. Ce qui n'est PAS dans le dépôt (normal)

Pour des raisons de sécurité, ces fichiers **ne sont pas sur GitHub** et doivent
être créés localement :

| Fichier | À obtenir comment |
|---------|-------------------|
| `api/.env` | Copier `.env.example` + demander les vraies valeurs au responsable (en privé) |
| `esp32/config.h` | Copier `config.example.h` + mettre son propre WiFi |
| `api/node_modules/` | Généré par `npm install` |

> 🔒 Les secrets (mot de passe MongoDB, clé API) ne se partagent **jamais** sur
> GitHub. Le responsable les transmet par messagerie privée.

---

## 3. Lancer l'API en local (optionnel)

Nécessaire seulement pour développer l'API. **Node.js** doit être installé.

```bash
cd api
npm install
cp .env.example .env        # puis remplir .env avec les vraies valeurs
npm start
```

L'API démarre sur `http://localhost:3000`. Vous devez voir :
```
✅ MongoDB Atlas connecté
🚀 API démarrée sur le port 3000
```

> Comme tout le monde utilise la **même base Atlas**, vous verrez les mêmes
> données. Pour repartir de données de démo propres : `npm run seed`
> (⚠️ efface et régénère les collections — à ne pas faire pendant que
> quelqu'un d'autre travaille).

---

## 4. Lancer le dashboard en local (optionnel)

Le `dashboard/config.js` pointe déjà vers l'API Cloud, donc il fonctionne
directement. Servez les fichiers statiques :

```bash
cd dashboard
python -m http.server 8080      # ou : npx serve .
```

Puis ouvrez `http://localhost:8080`.

> Pour tester le dashboard contre une API **locale** au lieu du Cloud, changez
> temporairement `API_BASE` dans `config.js` vers `http://localhost:3000`
> (ne pas committer ce changement).

---

## 5. Programmer l'ESP32 (pour celui qui a la carte)

1. Installer le support carte **esp32** (Boards Manager) + les librairies
   **DHT sensor library** et **Adafruit Unified Sensor** (voir
   [`esp32/README.md`](esp32/README.md)).
2. Copier `esp32/config.example.h` → `esp32/config.h`.
3. Renseigner dans `config.h` : le WiFi, `API_URL`
   (`https://projet-cloud-iot.onrender.com/api/measures`) et la clé API.
4. Téléverser et ouvrir le moniteur série (115200 bauds).

---

## ✅ Récapitulatif « au même niveau »

| Pour... | Il faut... |
|---------|-----------|
| Voir la solution en ligne | Rien (juste les liens) |
| Lire / modifier le code | `git clone` |
| Lancer l'API en local | `npm install` + `api/.env` (valeurs privées) |
| Lancer le dashboard en local | un petit serveur statique |
| Flasher l'ESP32 | librairies Arduino + `config.h` |

---

## 🔄 Travailler à plusieurs sans conflits

- Faites `git pull` **avant** de commencer à coder.
- Committez souvent, avec des messages clairs.
- Évitez que deux personnes modifient le même fichier en même temps.
- Poussez régulièrement (`git push`) pour que les autres aient vos changements.
