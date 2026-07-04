/*
 * Configuration du tableau de bord.
 * Modifiez API_BASE selon l'environnement :
 *   - en local  : "http://localhost:3000"
 *   - en Cloud  : "https://votre-api.onrender.com"
 */
const CONFIG = {
  // URL de base de l'API (sans slash final)
  // Local  : 'http://localhost:3000'
  // Cloud  : 'https://projet-cloud-iot.onrender.com'
  API_BASE: 'https://projet-cloud-iot.onrender.com',

  // Identifiant de la salle surveillée
  DEVICE_ID: 'LABO-INFO-01',

  // Fréquence de rafraîchissement du temps réel (ms)
  REFRESH_INTERVAL: 3000,

  // Au-delà de ce délai sans nouvelle mesure, on considère une perte de
  // connexion / capteur hors ligne (en secondes).
  STALE_THRESHOLD_SEC: 20,
};
