/*
 * config.example.h — Modèle de configuration de l'ESP32
 * ─────────────────────────────────────────────────────────────
 * Copiez ce fichier en « config.h » et renseignez vos propres valeurs.
 * NE JAMAIS committer « config.h » (il contient le mot de passe WiFi et la
 * clé API). Le fichier config.h est ignoré par Git (voir .gitignore).
 */
#ifndef CONFIG_H
#define CONFIG_H

// ─── Réseau WiFi ─────────────────────────────────────────────
#define WIFI_SSID       "Nom_De_Votre_WiFi"
#define WIFI_PASSWORD   "Mot_De_Passe_WiFi"

// ─── API ─────────────────────────────────────────────────────
// URL de la route de réception des mesures.
// En local  : "http://192.168.1.10:3000/api/measures" (IP du PC qui héberge l'API)
// En Cloud  : "https://votre-api.onrender.com/api/measures"
#define API_URL         "https://votre-api.onrender.com/api/measures"

// Clé API secrète (doit être identique à API_KEY dans le .env de l'API)
#define API_KEY         "change-moi-par-une-cle-secrete"

// ─── Identité de l'équipement ────────────────────────────────
#define DEVICE_ID       "LABO-INFO-01"

#endif // CONFIG_H
