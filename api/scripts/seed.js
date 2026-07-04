/**
 * Script de génération de données de démonstration.
 * Simule plusieurs jours de mesures (avec quelques épisodes d'alerte réalistes)
 * pour pouvoir tester le tableau de bord et les historiques sans l'ESP32.
 *
 * Usage : npm run seed        (dans le dossier api, avec un .env valide)
 *
 * ⚠️  Ce script EFFACE les collections avant de les repeupler.
 */
const mongoose = require('mongoose');
const { config } = require('../config/env');
const connectDB = require('../config/db');
const Measurement = require('../models/Measurement');
const AlertEvent = require('../models/AlertEvent');
const { processMeasurement } = require('../services/alertService');

const DEVICE = config.deviceId;
const THRESHOLD = config.defaultThreshold;

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
  const DAYS = 7; // une semaine d'historique
  let inserted = 0;

  console.log(`🌱 Génération de ${DAYS} jours de mesures...`);

  for (let d = DAYS - 1; d >= 0; d--) {
    for (let h = 0; h < 24; h++) {
      // Une mesure toutes les 30 min
      for (let m = 0; m < 60; m += 30) {
        const ts = new Date(now);
        ts.setDate(now.getDate() - d);
        ts.setHours(h, m, 0, 0);
        if (ts > now) continue; // ne pas générer dans le futur

        let temp = baseTemperature(h) + Math.round((Math.random() * 4 - 2));

        // Injecter des pics de surchauffe réalistes à certaines heures
        // (ex : chaque jour vers 15h, montée au-dessus du seuil)
        if (h === 15 && Math.random() < 0.6) temp = THRESHOLD + Math.floor(Math.random() * 4) + 1;

        const humidity = 45 + Math.round(Math.random() * 20);

        // Passer par la vraie logique métier pour générer des évènements cohérents
        const { state } = await processMeasurement({
          deviceId: DEVICE,
          temperature: temp,
          threshold: THRESHOLD,
          timestamp: ts,
        });

        await Measurement.create({
          deviceId: DEVICE,
          temperature: temp,
          humidity,
          threshold: THRESHOLD,
          state,
          timestamp: ts,
        });
        inserted++;
      }
    }
  }

  const alerts = await AlertEvent.countDocuments({});
  console.log(`✅ Terminé : ${inserted} mesures, ${alerts} évènements d'alerte insérés.`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erreur seed :', err);
  process.exit(1);
});
