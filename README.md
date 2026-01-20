#  Festivals de Jeux - Application de Gestion

## C'est quoi cette application?

Une plateforme complète pour organiser et gérer un festival de jeux de société. Depuis la création du festival, la mise en place des tarifs, jusqu'à la gestion des réservations des éditeurs et la génération des factures. C'est l'outil idéal pour un organisateur de festival qui a besoin de tout gérer au même endroit.

---

##  Lancer l'application en local

### Prérequis
- Docker et Docker Compose installés sur votre ordinateur
- Les ports 8080, 4000, 5432 doivent être libres

### Étapes pour démarrer

**1. Préparer le projet**
```bash
git checkout ahmed
```

**2. Lancer l'application**
```bash
docker compose -f docker-compose.dev.yml down -v

docker compose -f docker-compose.dev.yml up --build
```

### Accéder à l'application

Une fois lancée, ouvrez dans votre navigateur :
- **L'application** : https://localhost:8080
- **Les API** : https://localhost:4000/api
- **Gérer la base de données** : http://localhost:8081 (Adminer)
- identifiants pour adminer : 
Utilisateur	 : secureapp
Mot de passe : secureapp
Base de données : secureapp

### Se connecter

Utilisez ces identifiants par défaut :
```
Login: admin
Mot de passe: admin
```

---

## Accéder à l'application déployée (sur le serveur de l'école)

Si vous etes à l'ecole (connecté avec le reseau de l'ecole) ou si vous êtes connecté au VPN de Polytech, vous pouvez y accéder directement :

**Application** : https://162.38.111.34:8080

**Gérer la base de données** : http://162.38.111.34:8081 (mêmes identifiants)


---

## Comment ça marche? 

### 1. La page d'accueil

Quand vous vous connectez, vous arrivez sur la page d'accueil. Vous voyez:

À gauche, il y a un **menu latéral** avec tous les accès aux différentes sections de l'app.

### 2. Créer un festival

**Où aller** : Sidebar → Festivals → Cliquer sur "Créer"

**Ce qu'on fait** :
- Vous donnez un **nom** au festival (ex: "Festival Ludis 2026")
- Vous indiquez le **nombre total de tables disponibles** (ex: 100)
- Vous définissez la **date de début** et la **date de fin** du festival
- Vous ajoutez une **description** (optionnelle)
- Vous remplissez les **stocks de mobilier** :
  - Tables standard, Tables grandes, Tables mairie
  - Chaises standard, Chaises mairie
- Vous indiquez le **prix d'une prise électrique** (ex: 5€)

**Après la création** :
- Le festival apparaît automatiquement en premier (marqué avec une étoile ⭐ "courant")
- Les anciens festivals ne sont plus "courants"
- Vous voyez le nouveau festival sur la page vue publique (si vous etes visiteur ou benevole)

**Essayer de supprimer un festival** : Si vous créez d'autres réservations ou zones, vous ne pourrez plus le supprimer (l'app refuse pour éviter de perdre des données)

### 3. Créer des zones tarifaires (les différents prix)

**Où aller** : Dans le détail d'un festival → Bouton "Créer zone tarifaires"

**Ce qu'on fait** :
- Vous donnez un **nom** à la zone (ex: "Premium", "Standard", "Budget", ...)
- Vous dites **combien de tables** cette zone contient
- Vous mettez le **prix par table** (ex: 50€ par table)
- Le **prix au m²** se calcule automatiquement

**Important** : La somme de toutes les zones ne peut pas dépasser le total du festival!
- Si le festival a 100 tables et vous créez une zone avec 50 tables, vous pouvez créer une autre avec max 50 tables.
- Si vous essayez de créer plus, l'app refuse et dit combien il reste disponible.

### 4. Créer une réservation 

**Où aller** : Cliquez sur "Festivals" dans la Sidebar → Trouvez le festival qui vous intéresse → Cliquez sur le bouton "Réservations" de la carte → Cliquez sur le bouton "Nouvelle Réservation"

**Ce qu'on remplit dans le formulaire** :
- **Réservant** : Sélectionnez qui réserve (un éditeur, association, etc.)
- **Nombre de prises électriques** : Combien de prises électriques ils veulent (chacune coûte le prix du festival)
- **Viendra animer** : Cochez si le réservant va venir animer ses jeux sur place
- **Notes** : Vous pouvez ajouter des notes internes (optionnel)
- **Tables réservées par zone** : Pour chaque zone tarifaire (Premium, Standard, etc.), indiquez combien de tables ils veulent
- Le prix se **calcule automatiquement**
Vous pouvez ajouter plusieurs zones pour la même réservation.

**Après création** :
- La réservation apparaît avec l'état "pas contacté"
- Vous pouvez maintenant ajouter ou modifier les informations de la réservation


### 5. Appliquer des remises (optionnel)

**Dans la réservation** : Deux champs pour les remises

Vous pouvez appliquer jusqu'à deux types de réductions :

**Remise montant** : Une réduction fixe en euros

**Remise tables** : Un pourcentage sur les tables seulement


### 6. Ajouter des jeux à la réservation

**Dans le détail** : Bouton "Ajouter un jeu"

**Ce qu'on fait** :
- Vous **choisissez un jeu** dans la liste (ex: Catan, Ticket to Ride)
- Le jeu s'ajoute à la réservation
- Vous voyez le **statut du jeu** : "Jeux non reçus" et vous pouvez le cocher pour qu'il soit recu par ex 


### 7. Générer la facture 

**Dans le détail de la réservation** : Bouton "Générer facture"

**Qu'il se passe** :
- vous voyez : Tables + Prises - Remises = Montant final
- vous cliquez sur "Générer"

**Après génération** :
- Une **facture unique** est créée avec un numéro (FAC-20260120-00001)
- La facture est marquée "non payé"
- **Important** : Tu ne peux pas créer deux factures pour la même réservation! par contre on peut la modifier si on modifie les lignes de paiement


### 10. Marquer la facture comme payée

**Dans le détail de la réservation** : Section "Workflow" → Bouton "Payer"

**Qu'on fait** :
- Vous cliquez pour dire que le client a payé
- La facture passe de "non payé" à "payé" et donc on peut ni la modifier ou la supprimer (sauf si on reviens a l'etat non payé )
- La date de paiement est enregistrée

### 11. Organiser le plan et placer les jeux (zones du plan)

**Où aller** : Cliquez sur "Festivals" dans la Sidebar → Trouvez votre festival → Cliquez sur le bouton "Plan & Placement" → Vous arrivez sur la page de gestion des zones du plan

**Créer une zone du plan** :
- Cliquez sur le bouton "Nouvelle Zone Plan" en haut de la page
- Vous donnez un **nom** à la zone (ex: "Allée A", "Espace Jeunesse", "Zone VIP")
- Vous indiquez le **nombre de tables disponibles** dans cette zone 
- Cliquez "Créer"

**Placer les jeux dans les zones** :
- Sur chaque zone, vous voyez un bouton "Placer un jeu"
- Cliquez dessus → sélectionnez le jeu que vous voulez placer
- Le jeu s'ajoute à la zone et vous voyez le **taux d'occupation** (% de tables utilisées)
- Les jeux sont groupés par **réservation** pour voir qui a posé quoi
- on peut placer les jeux de l'onglet placer jeux egalement.

**Vue d'ensemble** :
- L'onglet "Vue d'ensemble" montre toutes les zones avec les jeux placés
- L'onglet "Stocks de matériel" affiche les tables et chaises restantes du festival

### 12. Gérer les éditeurs

**Où aller** : Cliquez sur "Éditeurs" dans la Sidebar

**Créer un éditeur** :
- Vous donnez le **nom** de l'éditeur 
- Vous pouvez ajouter des **contacts** pour l'éditeur:
  - **Nom** du contact
  - **Email** (optionnel)
  - **Téléphone** (optionnel)
  - **Rôle / fonction** (ex: "Responsable commercial")
- Vous pouvez ajouter plusieurs contacts

**Voir et modifier un éditeur** :
- Cliquez sur un éditeur dans la liste
- Vous voyez ses **jeux** et ses **contacts**
- Vous pouvez modifier ou supprimer l'éditeur

### 12B. Gérer les jeux

**Où aller** : Cliquez sur "Jeux" dans la Sidebar

**Créer un jeu** :
- Cliquez sur "+ Ajouter un jeu"
- Vous remplissez:
  - **Nom du jeu** 
  - **Éditeur** - **obligatoire**
  - **Type de jeu** (ex: "Stratégie", "Coopératif")
  - **Âge minimum et maximum**
  - **Nombre minimum et maximum de joueurs**
  - **Durée moyenne** (en minutes)
  - **Taille de table** (petite, grande)
  - **Auteurs**
- Vous pouvez modifier ou supprimer un jeu en cliquant dessus puis le bouton correspondant

### 13. Gérer les réservants

**Où aller** : Cliquez sur "Réservants" dans la Sidebar

**Créer un réservant** :
- Vous donnez le **nom** du réservant (ex: "Association des Jeux", "Distributeur XYZ")
- Vous choisissez le **type**:
  - **Éditeur** : Une maison d'édition
  - **Distributeur** : Un distributeur de jeux
  - **Association** : Une association de joueurs
  - **Autre** : Autre type
- Si c'est un éditeur, vous pouvez le **lier à un éditeur existant** (optionnel)
- Vous pouvez ajouter des **contacts**:
  - **Nom** du contact
  - **Email**
  - **Téléphone**
  - **Rôle / fonction**

### Données initiales (CSV import)

À la première installation, la base de données est remplie avec les données provenant des fichiers CSV:
- **editeur.csv** → Liste des éditeurs
- **jeu.csv** → Liste des jeux avec leurs propriétés
- **typeJeu.csv** → Types de jeux disponibles

Ces données sont importées automatiquement via le script **02_seed.sql** lors de l'initialisation Docker. Cela vous permet de commencer avec un catalogue de jeux et d'éditeurs pré-existants.

### 14. Vue publique (pour les visiteurs et bénévoles)

**Où aller** : Cliquez sur "Vues publiques" dans la Sidebar

**Qu'on voit** :
- Les jeux du **festival courant** avec tous leurs détails:
  - Nom, type, âges recommandés, nombre de joueurs
  - Durée, éditeur, auteurs
  - Zone du plan (où le jeu est placé)
- Les **éditeurs** du festival courant
- Vous pouvez basculer entre la vue "Jeux" et la vue "Éditeurs"

**Qui peut voir** : tous les roles , mais puisque les autres roles sauf visiteurs et benevoles peuvent voir les festivals et festival courant dasn festivals , on mets le noms du festival courant et quelques infos limitées pour que les visiteurs et benevoles voient 

### 15. Les rôles et permissions

**Admin** : Peut tout faire
- Créer et gérer festivals, zones tarifaires, réservations
- Générer toutes les factures
- Voir toutes les réservations
- Gérer les utilisateurs
- Gérer les jeux et éditeurs
- Accéder à la vue publique

**Super Organisateur** : Presque Admin (sauf gestion des utilisateurs)
- Créer et gérer festivals, zones tarifaires, réservations
- Générer toutes les factures
- Voir toutes les réservations
- Gérer les jeux et éditeurs
- Accéder à la vue publique
- **Ne peut pas** : Gérer les utilisateurs (création, modification, suppression)

**Organisateur** : Peut gérer son festival
- Créer zones tarifaires
- Créer et gérer ses réservations
- Générer ses factures
- Voir uniquement ses réservations
- Accéder à la vue publique

**Bénévole et visiteurs** : Peut regarder
- Voir le festival courant
- Voir le plan du festival (zones et jeux placés)
- Voir la vue publique (jeux et éditeurs)
- Rien créer

**user** : 
- attends la validation de son compte par l'admin donc il ne voit rien 
---

