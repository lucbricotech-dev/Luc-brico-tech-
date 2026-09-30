
LUC BRICO-TECH — V2 Clients / Devis / Factures / Paiements

Cette version ajoute l'interface des modules déjà créés dans Supabase :
- Clients
- Devis
- Factures
- Paiements

Le code conserve Supabase, les rôles et les modules existants.

À remplacer dans ton projet GitHub :
1. index.html
2. script.js

Ne supprime pas :
- logo-luc-bricotech.png
- config.js
- style.css
- login.html
- vercel.json

Aucune nouvelle table SQL n'est nécessaire si le SQL Clients/Devis/Factures/Paiements a déjà été exécuté dans Supabase.

Calculs intégrés :
- total devis/facture = sous-total - remise + taxe
- reste facture = total - montant payé
- enregistrement d'un paiement met à jour automatiquement le montant payé et le statut de la facture.

Important : cette étape prépare l'interface. Les lignes détaillées quote_items / invoice_items, PDF professionnel et partage WhatsApp seront ajoutés à l'étape suivante.
