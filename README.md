# 🌡️ Projet IoT — Surveillance intelligente d'un laboratoire informatique

Solution IoT complète de surveillance de la température et de l'humidité d'un
laboratoire informatique, basée sur une carte **ESP32**, une API **Node.js**,
une base **MongoDB** et un tableau de bord Web déployé dans le Cloud.

> Projet évalué — Module Cloud Computing & IoT — Licence 3 Informatique

---

## 🎯 Problématique

Les serveurs et ordinateurs d'un laboratoire informatique dégagent beaucoup de
chaleur. En cas de panne de climatisation ou de début de surchauffe électrique,
le matériel risque d'être endommagé. Ce système surveille en continu la
température, déclenche une **alerte locale (buzzer + LED rouge)** et **distante
(tableau de bord)** dès qu'un seuil critique est atteint, enregistre toutes les
données dans le Cloud et présente des historiques par période.

## 🏗️ Architecture

```
┌─────────┐   HTTP POST   ┌──────────────┐   Mongoose   ┌───────────────┐
│  ESP32  │ ────────────► │  API Node.js │ ───────────► │ MongoDB Atlas │
│ +DHT11  │   (WiFi)      │  (Express)   │              │   (Cloud)     │
│ +Buzzer │               └──────┬───────┘              └───────────────┘
│ +LEDs   │                      │ HTTP (polling)
└─────────┘                      ▼
                          ┌──────────────┐
                          │  Dashboard   │
                          │ HTML/CSS/JS  │
                          │  + Chart.js  │
                          └──────────────┘
```

## 📦 Stack technique

| Couche       | Technologies                                             |
|--------------|----------------------------------------------------------|
| Embarqué     | ESP32, C/C++ (Arduino IDE), DHT sensor library (Adafruit)|
| Backend      | Node.js, Express.js, Mongoose, dotenv, cors              |
| Base données | MongoDB Atlas (Cloud)                                    |
| Frontend     | HTML5 / CSS3 / JavaScript (Vanilla) + Chart.js           |
| Déploiement  | Render (API), Vercel/Netlify (Dashboard)                 |
| Outils       | Git/GitHub, Postman                                      |

## ⚙️ Paramètres du système

| Paramètre                    | Valeur                                  |
|------------------------------|-----------------------------------------|
| Grandeur surveillée          | Température (+ humidité)                 |
| Identifiant de la salle      | `LABO-INFO-01`                          |
| Seuil critique               | **30 °C** (configurable)                |
| Seuil de déclenchement alerte| température ≥ 30 °C                      |
| Seuil d'arrêt alerte         | température < 28 °C (hystérésis de 2 °C) |
| Plage « Matin »              | 06h00 – 12h00                           |
| Plage « Soir »               | 12h00 – 20h00                           |
| Plage « Nuit »               | 20h00 – 06h00                           |

### Justification du seuil

Une salle informatique en fonctionnement normal se situe autour de 20–25 °C.
Au-delà de **30 °C**, on considère qu'il y a une surchauffe anormale
(climatisation en panne ou échauffement électrique) mettant en danger le
matériel. Une **hystérésis de 2 °C** évite le clignotement de l'alerte lorsque
la valeur oscille autour du seuil.

## 📁 Structure du dépôt

```
.
├── esp32/          Code Arduino de la carte ESP32
├── api/            API Node.js / Express + modèles Mongoose
├── dashboard/      Interface Web (tableau de bord)
├── docs/           Schéma de câblage, captures, collection Postman
└── README.md
```

## 🚀 Démarrage rapide

> 👥 **Membres de l'équipe** : voir le [**Guide de démarrage équipe**](GUIDE_EQUIPE.md)
> pour cloner et se mettre au même niveau (étapes + valeurs à récupérer en privé).

Voir aussi les README détaillés dans chaque dossier :

- [`api/`](api/) — installation et lancement de l'API
- [`esp32/`](esp32/) — câblage et téléversement du programme ESP32
- [`dashboard/`](dashboard/) — lancement du tableau de bord

### Accès en ligne (solution déployée)

- Tableau de bord : https://projet-iot-dashboard.onrender.com
- API : https://projet-cloud-iot.onrender.com

## 📋 Fonctionnalités

- [x] Lecture température + humidité (DHT11)
- [x] Affichage moniteur série
- [x] Seuil configurable + détection de dépassement
- [x] Alerte locale automatique (buzzer + LED rouge)
- [x] Arrêt automatique au retour à la normale (LED verte)
- [x] Anti-répétition d'alerte (machine à états + hystérésis)
- [x] Transmission des mesures et de l'état à l'API
- [x] Enregistrement dans MongoDB
- [x] Tableau de bord temps réel
- [x] Historiques matin / soir / nuit + hebdomadaire
- [x] Déploiement Cloud

## 👥 Auteurs

Projet de groupe — Licence 3 Informatique.
