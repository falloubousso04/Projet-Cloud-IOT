/*
 * ══════════════════════════════════════════════════════════════════════
 *  Projet IoT — Surveillance d'un laboratoire informatique
 *  Carte : ESP32   |   Capteur : DHT11 (température + humidité)
 * ──────────────────────────────────────────────────────────────────────
 *  Rôle du programme :
 *   1. Lire la température et l'humidité du DHT11.
 *   2. Afficher les valeurs sur le moniteur série.
 *   3. Comparer la température à un seuil (avec hystérésis) → machine à états.
 *   4. Déclencher/arrêter automatiquement le buzzer et les LEDs (rouge/verte).
 *   5. Transmettre chaque mesure et l'état à l'API Node.js (HTTP POST).
 *   6. Gérer les erreurs de WiFi et de transmission.
 *
 *  Bibliothèques requises (Gestionnaire de bibliothèques Arduino) :
 *   - "DHT sensor library" par Adafruit
 *   - "Adafruit Unified Sensor" (dépendance de la précédente)
 * ══════════════════════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include "config.h"   // Copiez config.example.h en config.h et renseignez-le

// ─── Brochage (GPIO) ──────────────────────────────────────────────────
#define DHT_PIN     23     // Broche DATA du DHT11
#define DHT_TYPE    DHT11  // Type de capteur
#define BUZZER_PIN  19     // Buzzer actif
#define LED_RED     18     // LED rouge  → état d'alerte
#define LED_GREEN   5      // LED verte  → état normal

// ─── Paramètres métier ────────────────────────────────────────────────
const float THRESHOLD   = 30.0;   // Seuil de déclenchement (°C)
const float HYSTERESIS  = 2.0;    // Zone morte : arrêt sous (THRESHOLD - HYSTERESIS)
const unsigned long SEND_INTERVAL = 5000; // Envoi toutes les 5 s

// ─── État global ──────────────────────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
bool inAlert = false;                // false = NORMAL, true = ALERT
unsigned long lastSend = 0;

// ══════════════════════════════════════════════════════════════════════
//  Connexion WiFi (avec gestion d'erreur et reconnexion)
// ══════════════════════════════════════════════════════════════════════
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("Connexion au WiFi \"");
  Serial.print(WIFI_SSID);
  Serial.print("\" ");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" connecté !");
    Serial.print("Adresse IP : ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(" ÉCHEC (nouvelle tentative plus tard).");
  }
}

// ══════════════════════════════════════════════════════════════════════
//  Pilotage des actionneurs selon l'état
// ══════════════════════════════════════════════════════════════════════
void applyActuators() {
  if (inAlert) {
    digitalWrite(BUZZER_PIN, HIGH);  // buzzer ON
    digitalWrite(LED_RED, HIGH);     // LED rouge ON
    digitalWrite(LED_GREEN, LOW);    // LED verte OFF
  } else {
    digitalWrite(BUZZER_PIN, LOW);   // buzzer OFF
    digitalWrite(LED_RED, LOW);      // LED rouge OFF
    digitalWrite(LED_GREEN, HIGH);   // LED verte ON
  }
}

// ══════════════════════════════════════════════════════════════════════
//  Machine à états locale (identique à la logique de l'API)
//   NORMAL → ALERT  si  temp >= THRESHOLD
//   ALERT  → NORMAL si  temp <  (THRESHOLD - HYSTERESIS)
//  Renvoie true si l'état a changé (transition).
// ══════════════════════════════════════════════════════════════════════
bool updateState(float temperature) {
  bool previous = inAlert;
  if (inAlert) {
    if (temperature < THRESHOLD - HYSTERESIS) inAlert = false;
  } else {
    if (temperature >= THRESHOLD) inAlert = true;
  }
  return previous != inAlert;
}

// ══════════════════════════════════════════════════════════════════════
//  Envoi de la mesure à l'API (HTTP POST + clé API)
// ══════════════════════════════════════════════════════════════════════
void sendMeasurement(float temperature, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi non connecté : envoi annulé.");
    connectWiFi();
    return;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);

  // Construction du corps JSON
  String state = inAlert ? "ALERT" : "NORMAL";
  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"temperature\":" + String(temperature, 1) + ",";
  payload += "\"humidity\":" + String(humidity, 1) + ",";
  payload += "\"threshold\":" + String(THRESHOLD, 1) + ",";
  payload += "\"state\":\"" + state + "\"";
  payload += "}";

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    Serial.print("→ API HTTP ");
    Serial.print(httpCode);
    if (httpCode == 201) Serial.println(" (mesure enregistrée)");
    else {
      Serial.print(" — réponse : ");
      Serial.println(http.getString());
    }
  } else {
    // Erreur de transmission (§11 : gestion des erreurs de transmission)
    Serial.print("❌ Échec d'envoi : ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

// ══════════════════════════════════════════════════════════════════════
//  SETUP
// ══════════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== Démarrage — Surveillance labo informatique ===");

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  applyActuators(); // état initial : normal (LED verte)

  dht.begin();
  connectWiFi();
}

// ══════════════════════════════════════════════════════════════════════
//  LOOP
// ══════════════════════════════════════════════════════════════════════
void loop() {
  unsigned long now = millis();
  if (now - lastSend < SEND_INTERVAL) return;
  lastSend = now;

  // 1. Lecture du capteur
  float temperature = dht.readTemperature(); // °C
  float humidity = dht.readHumidity();       // %

  // Gestion d'erreur de lecture (DHT renvoie NaN en cas d'échec)
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("❌ Erreur de lecture du DHT11 (vérifier le câblage).");
    return;
  }

  // 2. Mise à jour de l'état (machine à états + hystérésis)
  bool changed = updateState(temperature);

  // 3. Pilotage buzzer + LEDs
  applyActuators();

  // 4. Affichage moniteur série (§10.2)
  Serial.print("T = ");
  Serial.print(temperature, 1);
  Serial.print(" °C | H = ");
  Serial.print(humidity, 1);
  Serial.print(" % | Seuil = ");
  Serial.print(THRESHOLD, 0);
  Serial.print(" °C | État : ");
  Serial.print(inAlert ? "🔴 ALERTE" : "🟢 NORMAL");
  if (changed) Serial.print(inAlert ? "  (⚠️ DÉCLENCHEMENT)" : "  (✅ RETOUR NORMAL)");
  Serial.println();

  // 5. Transmission à l'API
  sendMeasurement(temperature, humidity);
}
