# LUC BRICO-TECH — V3

Application web de gestion et supervision.

## Modules
- Tableau de bord
- Membres et rôles
- Ventes
- Achats
- Dépenses
- Stock et matériel
- Activités / interventions
- Projets
- Innovations
- Rapports
- Journal d'activité
- Paramètres
- Connexion Supabase
- Mode démo local

## Lancer
Ouvrir `login.html` avec Live Server dans VS Code.

## Production
Configurer Supabase avec `supabase/schema.sql`, puis renseigner `config.js`.
Déployer ensuite le dossier sur Vercel.

## Important
La version fournie contient le socle complet de l'interface et de la sécurité Supabase. Les opérations cloud sont activées progressivement par le module de synchronisation de `script.js`. Ne jamais exposer une clé `service_role`.


## Identité visuelle
La page d’accueil utilise le logo LUC BRICO-TECH et une identité bleu nuit / bleu technique / doré pour éviter l’aspect blanc et neutre.


## Création des comptes employés

La page **Membres** permet à un administrateur de créer directement un compte employé dans Supabase Authentication. Le mot de passe initial est défini par l'administrateur et le compte est créé avec le rôle `employee`.

Le navigateur n'utilise **jamais** la clé `service_role`. La création sécurisée passe par la fonction Supabase Edge `supabase/functions/create-employee/index.ts`, qui vérifie le JWT de l'administrateur avant d'utiliser la clé serveur.

### Déploiement de la fonction
Avec Supabase CLI :

```bash
supabase functions deploy create-employee
```

Les secrets Supabase nécessaires à la fonction doivent être disponibles côté serveur. **Ne mettez jamais `SUPABASE_SERVICE_ROLE_KEY` dans `config.js`, GitHub ou le navigateur.**

Après avoir exécuté `supabase/schema.sql`, connectez-vous avec le compte administrateur, ouvrez **Membres → Créer un compte employé**, puis renseignez le nom, l'e-mail, le téléphone et le mot de passe initial.

## Accès selon le rôle

- **Administrateur** : accès complet, gestion des membres, rôles, journal et paramètres.
- **Manager** : accès aux opérations, au stock et à la consultation des membres ; pas de création de comptes ni d'accès au journal/paramètres.
- **Employé** : accès au tableau de bord, ventes, achats, dépenses, stock en consultation, activités, projets, innovations et rapports. Les menus Membres, Journal et Paramètres sont masqués.

La restriction de l'interface est complétée par les politiques RLS Supabase : masquer un menu n'est pas considéré comme une mesure de sécurité suffisante à lui seul.
