/**
 * Modèle « AlertEvent » — une entrée par ÉVÈNEMENT (changement d'état).
 * Créé au passage NORMAL → ALERT, mis à jour au retour ALERT → NORMAL.
 *
 * Répond aux exigences :
 *  - §5.2 : éviter plusieurs alertes identiques (un seul évènement par épisode) ;
 *  - §7   : heures de début et de fin d'une alerte ;
 *  - §6   : consulter les alertes / consulter les retours à l'état normal.
 */
const mongoose = require('mongoose');

const alertEventSchema = new mongoose.Schema(
  {
    // Salle concernée par l'alerte
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      default: 'LABO-INFO-01',
    },

    // Heure de début de l'alerte (§7)
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // Heure de fin de l'alerte (§7). null tant que l'alerte est en cours.
    endTime: {
      type: Date,
      default: null,
    },

    // Seuil qui a déclenché l'alerte
    thresholdAtEvent: {
      type: Number,
      required: true,
    },

    // Valeur ayant déclenché l'alerte (température au moment du dépassement)
    triggerValue: {
      type: Number,
      required: true,
    },

    // Pic de température atteint pendant l'épisode d'alerte (mis à jour en continu)
    maxValue: {
      type: Number,
      required: true,
    },

    // Statut de l'évènement : en cours ou résolu
    status: {
      type: String,
      enum: ['ONGOING', 'RESOLVED'],
      required: true,
      default: 'ONGOING',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Durée de l'alerte en secondes (champ virtuel calculé, non stocké).
 * Pratique pour l'affichage sur le tableau de bord.
 */
alertEventSchema.virtual('durationSeconds').get(function () {
  if (!this.endTime) return null;
  return Math.round((this.endTime - this.startTime) / 1000);
});

// Inclure les champs virtuels lors de la sérialisation JSON
alertEventSchema.set('toJSON', { virtuals: true });
alertEventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AlertEvent', alertEventSchema);
