/*
 * TEST 2 — Validation complète du matériel (SANS WiFi)
 * ─────────────────────────────────────────────────────────────
 * Vérifie : lecture DHT11 + machine à états avec hystérésis
 *           + buzzer + LED rouge (alerte) + LED verte (normal).
 *
 * Brochage (broches sûres, identiques au code final) :
 *   DHT11 VCC  → 3V3        Buzzer (+) → GPIO 19
 *   DHT11 DATA → GPIO 23    LED rouge  → GPIO 18 (+ résistance 220Ω)
 *   DHT11 GND  → GND        LED verte  → GPIO 5  (+ résistance 220Ω)
 *   (buzzer − et cathodes des LEDs → GND)
 *
 * Bibliothèques : "DHT sensor library" (Adafruit) + "Adafruit Unified Sensor".
 * Moniteur série : 115200 bauds.
 */

#include <DHT.h>

// ─── Brochage ─────────────────────────────────────────────────
#define DHT_PIN     23
#define DHT_TYPE    DHT11
#define BUZZER_PIN  19
#define LED_ROUGE   18
#define LED_VERTE   5

// ─── Seuils (hystérésis) ──────────────────────────────────────
// Astuce démo : pour déclencher facilement en soufflant, baissez
// temporairement ces valeurs (ex. SEUIL_HAUT 28 / SEUIL_BAS 26).
const float SEUIL_HAUT = 30.0;  // déclenche l'alerte si temp >= 30
const float SEUIL_BAS  = 28.0;  // arrête l'alerte si temp < 28

DHT dht(DHT_PIN, DHT_TYPE);
bool enAlerte = false; // état courant : false = NORMAL, true = ALERTE

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== TEST 2 : materiel complet (DHT + buzzer + LEDs) ===");

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_ROUGE, OUTPUT);
  pinMode(LED_VERTE, OUTPUT);

  dht.begin();

  // État initial : normal → LED verte allumée
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_ROUGE, LOW);
  digitalWrite(LED_VERTE, HIGH);
}

void loop() {
  delay(2000); // le DHT11 a besoin d'au moins 1 s entre 2 lectures

  float temp = dht.readTemperature();
  float humid = dht.readHumidity();

  if (isnan(temp) || isnan(humid)) {
    Serial.println("Erreur de lecture du DHT11 -> verifier le cablage (VCC/DATA/GND).");
    return;
  }

  // ─── Machine à états avec hystérésis ────────────────────────
  bool avant = enAlerte;
  if (enAlerte) {
    if (temp < SEUIL_BAS) enAlerte = false;   // retour à la normale
  } else {
    if (temp >= SEUIL_HAUT) enAlerte = true;  // déclenchement
  }

  // ─── Pilotage des actionneurs ───────────────────────────────
  if (enAlerte) {
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_ROUGE, HIGH);
    digitalWrite(LED_VERTE, LOW);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_ROUGE, LOW);
    digitalWrite(LED_VERTE, HIGH);
  }

  // ─── Affichage moniteur série ───────────────────────────────
  Serial.print("T = ");
  Serial.print(temp, 1);
  Serial.print(" C | H = ");
  Serial.print(humid, 1);
  Serial.print(" % | Etat : ");
  Serial.print(enAlerte ? "ALERTE" : "NORMAL");
  if (avant != enAlerte) Serial.print(enAlerte ? "  (>> DECLENCHEMENT)" : "  (>> RETOUR NORMAL)");
  Serial.println();
}
