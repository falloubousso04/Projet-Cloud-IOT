/**
 * Script de génération de données de démonstration.
 * Simule plusieurs jours de mesures (avec quelques épisodes d'alerte réalistes)
 * pour pouvoir tester le tableau de bord et les historiques sans l'ESP32.
 *
 * Usage : npm run seed        (dans le dossier api, avec un .env valide)
 *
 * ⚠️  Ce script EFFACE les collections avant de les repeupler.
 *
 * Performance : la logique d'état (hystérésis) est appliquée EN MÉMOIRE, puis
 * les documents sont insérés en masse (insertMany) — rapide même sur Atlas.
 */
const mongoose = require('mongoose');
const { config } = require('../config/env');
const connectDB = require('../config/db');
const Measurement = require('../models/Measurement');
const AlertEvent = require('../models/AlertEvent');
const { computeState } = require('../services/alertService');

const DEVICE = config.deviceId;
const THRESHOLD = config.defaultThreshold;
const HYSTERESIS = config.hysteresis;

// Profil de température moyen selon l'heure (simulation salle informatique)
function baseTemperature(hour) {
  if (hour >= 6 && hour < 12) return 23; // matin
  if (hour >= 12 && hour < 20) return 26; // après-midi/soir (plus chaud)
  return 22; // nuit (plus frais)
}

async function seed() {
  await connectDB();

  console.log('🧹 Nettoyage des collections...');
  await Measurement.deleteMany({});
  await AlertEvent.deleteMany({});

  const now = new Date();
  const DAYS = 7;

  const measurements = [];
  const alertEvents = [];
  let currentState = 'NORMAL';
  let openAlert = null; // évènement d'alerte en cours (en mémoire)

  console.log(`🌱 Génération de ${DAYS} jours de mesures...`);

  for (let d = DAYS - 1; d >= 0; d--) {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const ts = new Date(now);
        ts.setDate(now.getDate() - d);
        ts.setHours(h, m, 0, 0);
        if (ts > now) continue;

        let temp = baseTemperature(h) + Math.round(Math.random() * 4 - 2);
        // Pics de surchauffe réalistes vers 15h certains jours
        if (h === 15 && Math.random() < 0.6) temp = THRESHOLD + Math.floor(Math.random() * 4) + 1;

        const humidity = 45 + Math.round(Math.random() * 20);

        // Machine à états EN MÉMOIRE (même logique que l'API)
        const previous = currentState;
        currentState = computeState(previous, temp, THRESHOLD, HYSTERESIS);

        if (previous === 'NORMAL' && currentState === 'ALERT') {
          openAlert = {
            deviceId: DEVICE, startTime: ts, endTime: null,
            thresholdAtEvent: THRESHOLD, triggerValue: temp, maxValue: temp,
            status: 'ONGOING',
          };
          alertEvents.push(openAlert);
        } else if (previous === 'ALERT' && currentState === 'NORMAL' && openAlert) {
          openAlert.endTime = ts;
          openAlert.status = 'RESOLVED';
          openAlert = null;
        } else if (currentState === 'ALERT' && openAlert && temp > openAlert.maxValue) {
          openAlert.maxValue = temp;
        }

        measurements.push({
          deviceId: DEVICE, temperature: temp, humidity,
          threshold: THRESHOLD, state: currentState, timestamp: ts,
        });
      }
    }
  }

  console.log(`💾 Insertion de ${measurements.length} mesures et ${alertEvents.length} alertes...`);
  await Measurement.insertMany(measurements);
  if (alertEvents.length > 0) await AlertEvent.insertMany(alertEvents);

  console.log(`✅ Terminé : ${measurements.length} mesures, ${alertEvents.length} évènements d'alerte insérés.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erreur seed :', err);
  process.exit(1);
});
