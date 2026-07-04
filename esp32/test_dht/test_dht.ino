/*
 * TEST 1 — Lecture simple du DHT11 (sans WiFi, sans buzzer, sans LED)
 * ──────────────────────────────────────────────────────────────────
 * Objectif : vérifier que le capteur est bien câblé et lit la
 * température + l'humidité, affichées dans le moniteur série.
 *
 * Câblage :
 *   DHT11 VCC  → 3V3
 *   DHT11 DATA → GPIO 23
 *   DHT11 GND  → GND
 *
 * Bibliothèques : "DHT sensor library" (Adafruit) + "Adafruit Unified Sensor".
 * Moniteur série : 115200 bauds.
 */

#include <DHT.h>

#define DHT_PIN   23
#define DHT_TYPE  DHT11

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== TEST 1 : lecture du DHT11 ===");
  dht.begin();
}

void loop() {
  // Le DHT11 a besoin d'au moins 1 seconde entre deux lectures
  delay(2000);

  float temperature = dht.readTemperature(); // °C
  float humidity = dht.readHumidity();       // %

  // En cas d'échec de lecture, la librairie renvoie NaN
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Echec de lecture du DHT11 -> verifier le cablage (VCC/DATA/GND).");
    return;
  }

  Serial.print("Temperature = ");
  Serial.print(temperature, 1);
  Serial.print(" C   |   Humidite = ");
  Serial.print(humidity, 1);
  Serial.println(" %");
}
