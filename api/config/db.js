/**
 * Connexion à MongoDB Atlas via Mongoose.
 * Gère les erreurs de connexion (§11 : gestion des erreurs de connexion).
 */
const mongoose = require('mongoose');
const { config } = require('./env');

async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri);
    console.log('✅ MongoDB Atlas connecté');
  } catch (err) {
    console.error('❌ Échec de connexion à MongoDB :', err.message);
    // Sans base de données, l'API ne peut rien faire : on arrête proprement.
    process.exit(1);
  }

  // Surveillance des évènements de connexion après le démarrage
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB déconnecté — tentative de reconnexion...');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnecté');
  });
  mongoose.connection.on('error', (err) => {
    console.error('❌ Erreur MongoDB :', err.message);
  });
}

module.exports = connectDB;
