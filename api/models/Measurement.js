/**
 * Modèle « Measurement » — une entrée par mesure envoyée par l'ESP32.
 * Collection principale, matière première des historiques et des moyennes.
 *
 * Couvre les exigences §5.1 et §7 du brief :
 *  - identifiant de la salle, valeur mesurée, date/heure, seuil, état.
 */
const mongoose = require('mongoose');

const measurementSchema = new mongoose.Schema(
  {
    // Identifiant de l'équipement ou de la salle (§5.1)
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      default: 'LABO-INFO-01',
    },

    // Valeur mesurée : température en °C (§5.1)
    temperature: {
      type: Number,
      required: true,
    },

    // Seconde grandeur du DHT11 : humidité en %
    humidity: {
      type: Number,
      default: null,
    },

    // Seuil défini au moment de la mesure (§5.1)
    threshold: {
      type: Number,
      required: true,
    },

    // État du système lors de la mesure (§5.1)
    state: {
      type: String,
      enum: ['NORMAL', 'ALERT'],
      required: true,
      default: 'NORMAL',
      index: true,
    },

    // Horodatage de la mesure (§11 : données obligatoirement horodatées).
    // Indexé pour accélérer les requêtes d'historiques par date/période.
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    // createdAt / updatedAt automatiques en complément
    timestamps: true,
  }
);

// Index composé optimisant les requêtes « par salle et par plage de dates »
measurementSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('Measurement', measurementSchema);
