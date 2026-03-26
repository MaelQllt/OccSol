# OCS GE 2023 Yonne -> H3

Mini-projet de visualisation pour transformer l'OCS GE 2023 de l'Yonne en entités H3 et l'explorer dans une interface web orientée analyse.

## Documentation

- [Synthese de soutenance](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/synthese-soutenance.md)
- [Documentation projet](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/documentation-projet.md)
- [Journal des demandes](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/journal-demandes.md)
- [Journal IA](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/ai-log.md)
- [Fil conducteur de soutenance](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/presentation-outline.md)
- [Résultats synthétiques](/Users/maelquillat/Documents/Travail/ING3/OccSol/docs/results.md)

## Pré requis

- Python 3.11 avec `geopandas`, `pyogrio`, `shapely`, `pyproj`, `pandas`
- Node.js 25+
- Archive IGN déjà téléchargée dans `data/raw/`

## Installation

```bash
npm install
```

## Génération des données

Joigny:

```bash
npm run build:joigny
```

Yonne entière:

```bash
npm run build:yonne
```

Tout reconstruire:

```bash
npm run build:all
```

## Lancer la visualisation

```bash
npm run serve
```

Puis ouvrir [viewer/index.html](/Users/maelquillat/Documents/Travail/ING3/OccSol/viewer/index.html) via `http://localhost:8000/viewer/`.

Le viewer propose notamment:

- un basculement Joigny / Yonne
- une coloration par couverture ou par usage
- un filtre interactif par classe
- une inspection au survol des hexagones
- des métriques de synthèse sur la qualité du maillage et la distribution des classes

## Sorties

- `data/intermediate/joigny_ocs_pair.geojson`
- `data/intermediate/yonne_ocs_pair.geojsonl`
- `data/derived/joigny_h3.geojson`
- `data/derived/yonne_h3.geojson`

## Notes de méthode

- La vue Joigny est centrée sur une emprise autour de la ville et non sur la limite communale exacte.
- Les polygones OCS GE sont agrégés par couple `code_cs` / `code_us` avant conversion H3 pour alléger le traitement.
- La couverture H3 repose sur `polygonToCells`, donc les cellules retenues sont celles dont le centre tombe dans les polygones sources.
