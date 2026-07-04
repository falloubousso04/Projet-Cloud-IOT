# 📄 Documentation & livrables

Ce dossier regroupe la documentation transverse et les livrables du projet.

| Fichier / dossier            | Contenu                                              |
|------------------------------|------------------------------------------------------|
| `DEPLOIEMENT.md`             | Guide de déploiement Cloud (Atlas · Render · Vercel) |
| `Postman_Collection.json`    | Collection Postman de test de l'API (à importer)     |
| `captures/`                  | Captures d'écran (tableau de bord, alertes, historiques) |

## Autres documents dans le dépôt

- **Schéma de câblage** → [`../esp32/README.md`](../esp32/README.md)
- **Documentation de l'API** (endpoints) → [`../api/README.md`](../api/README.md)
- **Guide du tableau de bord** → [`../dashboard/README.md`](../dashboard/README.md)
- **Modèle `.env`** → [`../api/.env.example`](../api/.env.example)

## Importer la collection Postman

1. Ouvrir Postman → *Import* → sélectionner `Postman_Collection.json`.
2. Onglet *Variables* de la collection → renseigner `base_url` et `api_key`.
3. Lancer les requêtes (commencer par les `POST mesure` pour créer des données).
