# 🔌 Programme ESP32 — Surveillance labo informatique

Code embarqué de la carte ESP32 : lecture du DHT11, alerte locale
(buzzer + LEDs), et transmission des mesures à l'API Node.js.

## 📋 Matériel

| Composant                | Rôle                              |
|--------------------------|-----------------------------------|
| Carte ESP32              | Microcontrôleur WiFi              |
| Capteur DHT11            | Température + humidité            |
| Buzzer actif             | Alerte sonore locale             |
| LED rouge                | Indicateur d'alerte              |
| LED verte                | Indicateur d'état normal         |
| 2 résistances 220 Ω      | Protection des LEDs              |
| Breadboard + fils Dupont | Prototypage                      |

## 🔗 Schéma de câblage

```
        ESP32                          Composants
   ┌───────────────┐
   │           3V3 ├──────────────────► DHT11  VCC (+)
   │           GND ├──────┬───────────► DHT11  GND (-)
   │        GPIO23 ├──────│───────────► DHT11  DATA
   │               │      │
   │        GPIO19 ├──────│───────────► Buzzer (+)
   │               │      ├───────────► Buzzer (-)
   │               │      │
   │        GPIO18 ├──[220Ω]──────────► LED ROUGE  (anode +)
   │               │      ├───────────► LED ROUGE  (cathode -)
   │               │      │
   │        GPIO5  ├──[220Ω]──────────► LED VERTE  (anode +)
   │               │      └───────────► LED VERTE  (cathode -)
   └───────────────┘
```

> Toutes les masses (GND) des composants sont reliées à une broche GND
> de l'ESP32 (rail GND de la breadboard).

### Récapitulatif des broches

| Composant       | Broche ESP32 | Remarque                    |
|-----------------|--------------|-----------------------------|
| DHT11 — VCC     | 3V3          | DHT11 stable en 3.3 V       |
| DHT11 — DATA    | GPIO 23      | pull-up 10 kΩ (souvent intégrée au module) |
| DHT11 — GND     | GND          |                             |
| Buzzer (+)      | GPIO 19      | buzzer **actif**            |
| LED rouge       | GPIO 18      | + résistance 220 Ω          |
| LED verte       | GPIO 5       | + résistance 220 Ω          |

## ⚙️ Configuration

1. Copiez le modèle de configuration :
   ```
   config.example.h  →  config.h
   ```
2. Renseignez dans `config.h` : le WiFi, l'URL de l'API et la clé API.
   > `config.h` n'est **jamais** commité (il est dans le `.gitignore`).

## 📚 Bibliothèques Arduino à installer

Dans l'IDE Arduino → *Outils → Gérer les bibliothèques* :

- **DHT sensor library** (par Adafruit)
- **Adafruit Unified Sensor** (dépendance)

Et le support des cartes ESP32 (*Gestionnaire de cartes* → « esp32 » par Espressif).

## ▶️ Téléversement

1. Sélectionnez la carte : *Outils → Type de carte → ESP32 Dev Module*.
2. Sélectionnez le bon port COM.
3. Cliquez sur **Téléverser**.
4. Ouvrez le **Moniteur série** à **115200 bauds** pour voir les mesures.

## 🔎 Fonctionnement

- Lecture toutes les **5 secondes** (`SEND_INTERVAL`).
- **Machine à états** identique à l'API :
  - `NORMAL → ALERT` si température ≥ **30 °C** ;
  - `ALERT → NORMAL` si température < **28 °C** (hystérésis de 2 °C).
- En alerte : buzzer + LED rouge ON, LED verte OFF.
- En normal : LED verte ON, buzzer + LED rouge OFF.
- Chaque mesure est envoyée à l'API en **HTTP POST** avec l'en-tête `x-api-key`.
- Gestion des erreurs : reconnexion WiFi automatique, lecture DHT vérifiée (NaN).

## 🧪 Astuce démonstration

Pour tester facilement sans chauffer jusqu'à 30 °C, baissez temporairement
`THRESHOLD` dans le code, ou soufflez de l'air chaud sur le capteur :
l'humidité et la température montent rapidement.

> ⚠️ **Calibration importante :** le seuil d'arrêt (`THRESHOLD − HYSTERESIS`)
> doit rester **au-dessus de la température ambiante** de la salle. Si la pièce
> est déjà chaude (ex. ~29 °C), l'alerte ne se coupera jamais : relevez le seuil
> (ex. `THRESHOLD = 32`).

## 🛠️ Dépannage (problèmes fréquents)

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Aucun port COM, ou puce **CP2102** en erreur dans le Gestionnaire de périphériques | Pilote USB manquant | Installer le pilote **CP210x** de [Silicon Labs](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers) |
| `Could not open COMx, port busy or doesn't exist` | Mauvais port, ou Moniteur série ouvert | Choisir le **bon port** (celui du CP2102), fermer le Moniteur série |
| `Failed to connect to ESP32: No serial data received` | La carte n'entre pas en mode téléversement | Maintenir le bouton **BOOT** pendant « Connecting… », ou séquence BOOT + EN |
| `Serial data stream stopped: serial noise or corruption` | Vitesse trop élevée / câble | Régler **Upload Speed = 115200**, changer de câble USB |
| L'upload cible un port **virtuel Intel (AMT SOL)** | Confusion de port | Vérifier que le port sélectionné est bien le **Silicon Labs CP210x** |
| Envoi API en échec (HTTPS) | Certificat non géré | Le code utilise `WiFiClientSecure` + `setInsecure()` (déjà en place) |
| WiFi ne se connecte pas | Réseau 5 GHz | L'ESP32 ne capte **que le 2.4 GHz** — utiliser un réseau 2.4 GHz |
