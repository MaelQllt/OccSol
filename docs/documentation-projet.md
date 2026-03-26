# Documentation du projet

## 1. Objet

Ce projet transforme une partie des donnees IGN **OCS GE 2023** du departement de l'Yonne en **entites H3**, puis les expose dans une interface web de visualisation et de comparaison.

Le projet a ete mene avec deux objectifs :

- produire un pipeline de transformation robuste `OCS GE -> H3`
- produire un viewer lisible pour une restitution orale courte

Le cas d'usage principal est une **zone d'etude autour d'une commune de l'Yonne**, avec un focus initial sur **Joigny**, puis une extension au **departement entier**.

## 2. Source de donnees

- Producteur : IGN
- Jeu de donnees : OCS GE 2023
- Territoire : departement 89, Yonne
- Couche source exploitee : `OCCUPATION_SOL`
- Nomenclature : couleurs et libelles issus de `NomenclatureOCSGE.csv`

Chemins principaux :

- [data/raw/OCS-GE_2-0__GPKG_LAMB93_D089_2023-01-01](/Users/maelquillat/Documents/Travail/ING3/OccSol/data/raw/OCS-GE_2-0__GPKG_LAMB93_D089_2023-01-01)
- [scripts/extract_ocsge.py](/Users/maelquillat/Documents/Travail/ING3/OccSol/scripts/extract_ocsge.py)

## 3. Architecture technique

### 3.1 Pipeline donnees

1. lecture du GeoPackage IGN
2. filtrage spatial selon l'emprise souhaitee
3. dissolution des polygones par couple `code_cs` / `code_us`
4. reprojection en WGS84
5. conversion en cellules H3
6. resolution des conflits d'affectation
7. comblement de trous internes
8. ecriture des GeoJSON derives et des resumes JSON

Scripts principaux :

- [scripts/extract_ocsge.py](/Users/maelquillat/Documents/Travail/ING3/OccSol/scripts/extract_ocsge.py)
- [scripts/build_h3.mjs](/Users/maelquillat/Documents/Travail/ING3/OccSol/scripts/build_h3.mjs)
- [scripts/resolve_h3_conflicts.py](/Users/maelquillat/Documents/Travail/ING3/OccSol/scripts/resolve_h3_conflicts.py)
- [scripts/lib/h3_fill.mjs](/Users/maelquillat/Documents/Travail/ING3/OccSol/scripts/lib/h3_fill.mjs)
- [scripts/fill_h3_holes.mjs](/Users/maelquillat/Documents/Travail/ING3/OccSol/scripts/fill_h3_holes.mjs)
- [scripts/reframe_h3_to_study_area.mjs](/Users/maelquillat/Documents/Travail/ING3/OccSol/scripts/reframe_h3_to_study_area.mjs)
- [scripts/fill_h3_boundary_gaps.mjs](/Users/maelquillat/Documents/Travail/ING3/OccSol/scripts/fill_h3_boundary_gaps.mjs)
- [scripts/chunk_h3_dataset.mjs](/Users/maelquillat/Documents/Travail/ING3/OccSol/scripts/chunk_h3_dataset.mjs)

### 3.2 Viewer

Le viewer repose sur :

- Leaflet pour la carte
- des GeoJSON H3 derives
- un chargement spatial par chunks pour les couches departementales
- une interface HTML/CSS/JS locale

Fichiers principaux :

- [viewer/index.html](/Users/maelquillat/Documents/Travail/ING3/OccSol/viewer/index.html)
- [viewer/styles.css](/Users/maelquillat/Documents/Travail/ING3/OccSol/viewer/styles.css)
- [viewer/main.js](/Users/maelquillat/Documents/Travail/ING3/OccSol/viewer/main.js)

## 4. Choix de methode

### 4.1 Pourquoi H3

H3 fournit une grille hexagonale reguliere, pratique pour :

- homogeniser la lecture spatiale
- comparer des zones entre elles
- simplifier la visualisation de donnees surfaciques complexes

### 4.2 Conflits H3

Un conflit H3 apparait lorsque plusieurs polygones source se projettent sur une meme cellule H3.

Dans la version actuelle, la cellule conserve la classe correspondant a la **plus grande surface d'intersection polygone/hexagone**.

Implementation :

- [scripts/build_h3.mjs](/Users/maelquillat/Documents/Travail/ING3/OccSol/scripts/build_h3.mjs)
- [scripts/resolve_h3_conflicts.py](/Users/maelquillat/Documents/Travail/ING3/OccSol/scripts/resolve_h3_conflicts.py)

### 4.3 Cellules inferees

Certaines cellules ne viennent pas directement du calcul brut mais d'un post-traitement.

Types utilises :

- `inferred_fill` : cellule ajoutee pour combler un trou interne
- `inferred_study_fill` : cellule ajoutee pour completer une emprise d'etude

### 4.4 Fiabilite

La fiabilite affichee dans le viewer est une lecture simple basee sur le taux de cellules inferees dans la zone visible :

- moins de 2 % : tres elevee
- de 2 % a moins de 8 % : elevee
- de 8 % a moins de 20 % : bonne
- 20 % et plus : moderee

Il s'agit d'un **indicateur de lecture** pour la restitution, pas d'une certification scientifique officielle.

## 5. Zone d'etude

Le projet ne se limite plus a Joigny.

Deux niveaux existent :

- **Commune** : zone d'etude construite comme une bbox elargie autour d'une commune de l'Yonne
- **Yonne** : vue departementale

La vue `Commune` permet :

- de choisir une commune de l'Yonne
- de garder un contexte autour de la commune
- de comparer deux communes a resolution identique

## 6. Fonctionnalites actuelles du viewer

### 6.1 Visualisation

- fond IGN selectionnable
- choix commune / Yonne
- choix couverture / usage
- mode `Artificialisation`
- filtre de classe
- opacite des hexagones
- rideau comparatif couverture / usage
- contour de la commune d'etude
- bbox d'etude discrete

### 6.2 UX / cartographie

- autocompletion des communes
- navigation clavier dans les suggestions
- clic sur la carte pour choisir une commune
- survol des communes avec contour et label
- popup au survol des hexagones
- mini fiche contexte sur la carte
- bouton `Effacer les filtres`

### 6.3 Analyse metier

- indicateurs :
  - part agricole
  - part forestiere
  - part artificialisee
  - part eau
- comparaison couverture / usage
- comparaison entre deux communes
- phrase automatique de comparaison

### 6.4 Performance

- chunking des couches Yonne
- chargement spatial localise en mode commune
- prechargement des resolutions adjacentes
- annulation des chargements obsoletes

## 7. Commandes utiles

Installation :

```bash
npm install
```

Extraction / construction :

```bash
npm run build:joigny
npm run build:yonne
npm run build:all
```

Serveur local :

```bash
npm run serve
```

## 8. Structure des sorties

Intermediaires :

- [data/intermediate/joigny_ocs_pair.geojson](/Users/maelquillat/Documents/Travail/ING3/OccSol/data/intermediate/joigny_ocs_pair.geojson)
- [data/intermediate/yonne_ocs_pair.geojsonl](/Users/maelquillat/Documents/Travail/ING3/OccSol/data/intermediate/yonne_ocs_pair.geojsonl)

Donnees derivees :

- [data/derived/joigny_h3.geojson](/Users/maelquillat/Documents/Travail/ING3/OccSol/data/derived/joigny_h3.geojson)
- [data/derived/yonne_h3.geojson](/Users/maelquillat/Documents/Travail/ING3/OccSol/data/derived/yonne_h3.geojson)
- [data/derived/chunks](/Users/maelquillat/Documents/Travail/ING3/OccSol/data/derived/chunks)

Resumes :

- [docs/joigny_summary.json](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/joigny_summary.json)
- [docs/yonne_summary.json](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/yonne_summary.json)
- [docs/joigny_h3_summary.json](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/joigny_h3_summary.json)
- [docs/yonne_h3_summary.json](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/yonne_h3_summary.json)

## 9. Limites actuelles

- la comparaison de communes est tres utile visuellement, mais elle reste basee sur des indicateurs synthetiques simples
- certaines cellules sont inferees pour combler des trous ou stabiliser une emprise
- le rideau couverture / usage est un rendu visuel, pas une double couche analytique independante
- le pipeline reste specialise sur le departement de l'Yonne et l'OCS GE 2023

## 10. Documents complementaires

- [docs/journal-demandes.md](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/journal-demandes.md)
- [docs/ai-log.md](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/ai-log.md)
- [docs/presentation-outline.md](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/presentation-outline.md)
- [docs/results.md](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/results.md)
