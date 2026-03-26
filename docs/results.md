# Résultats MVP

## Joigny

- Source OCS GE lue dans la couche `OCCUPATION_SOL`
- 12 754 polygones sources dans l'emprise locale
- 70 géométries agrégées par couple couverture / usage
- 2 499 hexagones H3 en résolution 9
- Fichier final: `data/derived/joigny_h3.geojson` pour environ 1,6 Mo

## Yonne

- 257 323 polygones sources sur le département
- 96 géométries agrégées par couple couverture / usage
- 10 908 hexagones H3 en résolution 8
- Fichier final: `data/derived/yonne_h3.geojson` pour environ 7,0 Mo
- 309 collisions détectées pendant l'assignation H3, principalement sur la vue départementale simplifiée

## Interprétation

- Joigny est la vue de démonstration détaillée
- Yonne est une vue bonus plus grossière, pensée pour rester légère
- Les collisions Yonne indiquent une petite perte de fidélité sur les frontières après simplification, acceptable pour un MVP de restitution
