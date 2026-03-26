# Journal des demandes et iterations

Ce document reconstitue, de maniere synthetique, les demandes formulees au cours du developpement du projet et les reponses techniques qui ont ete mises en place.

## 1. Cadrage initial

Demande de depart :

- partir de l'OCS GE 2023 de l'Yonne
- transformer les donnees en entites H3
- proposer une interface de visualisation
- aller le plus loin possible avec un appui fort sur l'IA

Reponse mise en place :

- pipeline de transformation `OCS GE -> H3`
- MVP de visualisation Joigny puis Yonne
- documentation, resumes JSON et fil conducteur de restitution

## 2. Premiere cible : Joigny

Demandes formulees :

- concentrer la demonstration sur une zone autour de Joigny
- pouvoir aussi afficher le departement entier

Reponse mise en place :

- vue `Commune` avec zone d'etude autour d'une commune
- vue `Yonne`
- Joigny utilise comme point d'entree du prototype

## 3. Refonte de l'interface

Demandes formulees :

- refondre le style de fond en comble
- eviter les chevauchements
- alleger le panneau de gauche
- representer les classes avec des hexagones plutot qu'avec des cercles
- adopter un style plus old school / vintage

Reponse mise en place :

- refonte HTML/CSS du viewer
- style cartographique plus vintage
- organisation en panneau lateral + carte
- legende et cartes d'analyse homogenisees

Note :

- une partie de cette phase a inclus une **demande externe a Claude pour la partie CSS / style**, afin d'explorer des variantes visuelles et de nourrir la refonte graphique
- le prompt exact de cette session externe n'est pas conserve dans le depot, mais son objet etait clairement la **refonte CSS, la lisibilite et l'identite visuelle**

## 4. Fonds IGN et clarification metier

Demandes formulees :

- utiliser un fond IGN plutot qu'OSM
- separer proprement `couverture du sol` et `usage du sol`
- remettre des contours sur les hexagones

Reponse mise en place :

- fonds IGN multiples
- logique de coloration clarifiee
- textes et analyses alignees sur la distinction couverture / usage

## 5. Choix de commune et autocompletion

Demandes formulees :

- ne plus rester bloque sur Joigny
- choisir n'importe quelle commune de l'Yonne
- proposer une liste ou une saisie avec autocompletion

Reponse mise en place :

- base locale des communes de l'Yonne
- recherche avec autocompletion
- navigation clavier
- clic sur la carte pour selectionner une commune

## 6. Zone d'etude autour de la commune

Demandes formulees :

- la zone d'etude doit etre une bbox autour de la commune
- cette bbox doit s'adapter a la taille de la commune

Reponse mise en place :

- bbox d'etude dynamique autour de la commune choisie
- recentrage automatique de la carte
- affichage discret de la bbox sur la carte

## 7. Performance

Demandes formulees :

- ameliorer les temps de chargement
- eviter de charger toute l'Yonne pour une simple commune

Reponse mise en place :

- decoupage des couches Yonne en chunks
- chargement spatial partiel en mode commune
- cache et prechargement des resolutions voisines
- annulation des chargements obsoletes

## 8. Qualite des donnees

Demandes formulees :

- expliquer les conflits H3
- remplacer la logique `first come first kept`
- attribuer la classe correspondant a la plus grande intersection de surface
- traiter les trous visibles

Reponse mise en place :

- resolveur de conflits par surface d'intersection dominante
- comblement de trous internes
- indicateurs de fiabilite et de cellules inferees

## 9. Analyse metier

Demandes formulees :

- comparer couverture du sol et usage du sol
- ajouter un mode artificialisation
- calculer :
  - part agricole
  - part forestiere
  - part artificialisee
  - part eau

Reponse mise en place :

- bloc `Couverture / usage`
- mode `Artificialisation`
- indicateurs metier dans la synthese

## 10. UX / cartographie

Demandes formulees :

- clic sur la carte pour choisir une commune
- clavier haut / bas / entree dans la recherche
- bouton `Effacer les filtres`
- mini fiche contexte sur la carte
- surbrillance plus elegante des communes au survol

Reponse mise en place :

- selection carte
- recherche clavier robuste
- fiche contexte
- survol commune avec contour et label

## 11. Comparaison entre deux communes

Demandes formulees :

- comparer deux communes
- pouvoir revenir au mode sans comparaison
- mieux expliquer le sens des ecarts
- colorer les deltas
- voir la commune comparee sur la carte

Reponse mise en place :

- deuxieme champ de commune
- bouton `Retirer`
- comparaison `etudiee - comparee`
- phrase automatique de synthese
- contour de la commune comparee
- affichage des hexagones de comparaison
- cadrage sur les deux emprises

## 12. Rideau couverture / usage

Demande formulee :

- ajouter un slider central type rideau pour faire apparaitre la couverture d'un cote et l'usage de l'autre

Reponse mise en place :

- mode `Rideau`
- barre centrale draggable
- rendu visuel stable avec recoloration des hexagones selon leur position par rapport au rideau

## 13. Corrections fines de fin de projet

Demandes formulees :

- garder le contour de commune au premier plan
- corriger les popups et survols
- nettoyer toutes les traces de debug
- ajuster le curseur et les details UX

Reponse mise en place :

- gestion plus propre des panes Leaflet
- popup des hexagones au survol
- labels de communes au-dessus des contours
- suppression des `console.*` dans notre code

## 14. Ce que le projet montre aujourd'hui

Le projet repond maintenant a la demande initiale en proposant :

- un pipeline de transformation H3
- une visualisation multi-resolution
- une navigation communale sur l'Yonne
- une comparaison entre communes
- une interface exploitable en demonstration orale
