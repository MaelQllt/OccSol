# Fil conducteur de démonstration

## 1. Problème

Transformer une base surfacique IGN riche mais lourde en une grille hexagonale homogène, plus simple à comparer et à visualiser.

## 2. Source

- OCS GE 2023
- Département 89, Yonne
- Couche utilisée pour le MVP: `OCCUPATION_SOL`

## 3. Pipeline

- Extraction GeoPackage IGN
- Agrégation des polygones par couple couverture / usage
- Reprojection en WGS84
- Conversion vers H3 avec `h3-js`
- Visualisation Leaflet

## 4. Démo

- Commencer par Joigny
- Montrer le changement de coloration couverture / usage
- Ouvrir ensuite la vue Yonne
- Cliquer sur quelques hexagones pour afficher leurs attributs

## 5. Limites

- Joigny est une emprise locale autour de la ville
- Les petites géométries peuvent disparaître à résolution grossière
- Le département entier est plus léger que la donnée source brute

## 6. Suites possibles

- Ajouter le différentiel 2020-2023
- Calculer des statistiques par commune
- Comparer plusieurs résolutions H3
