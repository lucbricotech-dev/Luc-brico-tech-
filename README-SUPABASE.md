# Connexion Supabase

1. Créer un projet Supabase.
2. Ouvrir SQL Editor et exécuter `schema.sql`.
3. Créer un compte dans Authentication > Users.
4. Rendre ce premier compte administrateur avec la requête indiquée à la fin de `schema.sql`.
5. Copier l'URL du projet et la clé **publishable/anon** dans `config.js`.
6. Ne jamais mettre la clé `service_role` dans `config.js` ou dans le navigateur.
7. Ouvrir `login.html`.

Le système utilise Supabase Auth et PostgreSQL/RLS. Les employés ne voient que leurs propres enregistrements ; managers et administrateurs peuvent superviser les données prévues par les politiques.
