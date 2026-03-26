const DATASETS = {
  joigny: {
    label: "Autour de Joigny",
    defaultResolution: "9",
    resolutions: {
      "8": {
        dataUrl: "../data/derived/joigny_h3_r8.geojson",
        summaryUrl: "../docs/joigny_h3_r8_summary.json",
        uiLabel: "Résolution 8 · synthèse"
      },
      "9": {
        dataUrl: "../data/derived/joigny_h3.geojson",
        summaryUrl: "../docs/joigny_h3_summary.json",
        uiLabel: "Résolution 9 · équilibre"
      },
      "10": {
        dataUrl: "../data/derived/joigny_h3_r10.geojson",
        summaryUrl: "../docs/joigny_h3_r10_summary.json",
        uiLabel: "Résolution 10 · détail"
      }
    }
  },
  yonne: {
    label: "Département de l'Yonne",
    defaultResolution: "8",
    resolutions: {
      "7": {
        dataUrl: "../data/derived/yonne_h3_r7.geojson",
        summaryUrl: "../docs/yonne_h3_r7_summary.json",
        chunkIndexUrl: "../data/derived/chunks/yonne_h3_r7/index.json",
        uiLabel: "Résolution 7 · synthèse"
      },
      "8": {
        dataUrl: "../data/derived/yonne_h3.geojson",
        summaryUrl: "../docs/yonne_h3_summary.json",
        chunkIndexUrl: "../data/derived/chunks/yonne_h3_r8/index.json",
        uiLabel: "Résolution 8 · détail"
      },
      "9": {
        dataUrl: "../data/derived/yonne_h3_r9.geojson",
        summaryUrl: "../docs/yonne_h3_r9_summary.json",
        chunkIndexUrl: "../data/derived/chunks/yonne_h3_r9/index.json",
        uiLabel: "Résolution 9 · fin"
      },
      "10": {
        dataUrl: "../data/derived/yonne_h3_r10.geojson",
        summaryUrl: "../docs/yonne_h3_r10_summary.json",
        chunkIndexUrl: "../data/derived/chunks/yonne_h3_r10/index.json",
        uiLabel: "Résolution 10 · très fin"
      }
    }
  }
};

const BASEMAPS = {
  plan: {
    label: "Plan IGN",
    type: "wmts",
    layer: "GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2",
    tileMatrixSet: "PM",
    format: "image/png",
    attribution: '&copy; <a href="https://geoservices.ign.fr/planign">IGN</a>'
  },
  ortho: {
    label: "Photos aériennes",
    type: "wmts",
    layer: "ORTHOIMAGERY.ORTHOPHOTOS",
    tileMatrixSet: "PM_0_19",
    format: "image/jpeg",
    attribution: '&copy; <a href="https://geoservices.ign.fr/">IGN</a>'
  },
  etatmajor: {
    label: "Etat-major",
    type: "wms",
    layer: "GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40",
    format: "image/png",
    attribution: '&copy; <a href="https://geoservices.ign.fr/">IGN</a>'
  },
  cassini: {
    label: "Cassini",
    type: "wms",
    layer: "AN-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI",
    format: "image/png",
    attribution: '&copy; <a href="https://geoservices.ign.fr/">IGN</a>'
  }
};

function buildIgnUrl({ layer, tileMatrixSet, format }) {
  return `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&TILEMATRIXSET=${tileMatrixSet}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${format}`;
}

const IGN_WMS_RASTER_URL = "https://data.geopf.fr/wms-r/wms";
const COMMUNES_URL = "../data/derived/yonne_communes.geojson";
const JOIGNY_CODE = "89206";
const COMMUNE_RESOLUTIONS = ["8", "9", "10"];
const DEPARTMENT_RESOLUTIONS = ["7", "8"];
const COMMUNE_DEFAULT_RESOLUTION = "9";
const DEPARTMENT_DEFAULT_RESOLUTION = "8";
const STUDY_MARGIN_RATIO = 0.22;
const MIN_COMMUNE_MARGIN_LAT = 0.006;
const MIN_COMMUNE_MARGIN_LNG = 0.008;

const state = {
  scope: "commune",
  colorMode: "coverage",
  focusMode: "all",
  resolution: "9",
  classFilter: null,
  layerVisible: true,
  curtainMode: false,
  curtainRatio: 0.5,
  basemap: "plan",
  selectedCommuneCode: JOIGNY_CODE,
  compareCommuneCode: null
};

const scopeButtons = Array.from(document.querySelectorAll("[data-scope]"));
const colorModeButtons = Array.from(document.querySelectorAll("[data-color-mode]"));
const focusModeButtons = Array.from(document.querySelectorAll("[data-focus-mode]"));
const communeField = document.querySelector("#commune-field");
const communeSearchInput = document.querySelector("#commune-search");
const communeMetaNode = document.querySelector("#commune-meta");
const communeSuggestionsNode = document.querySelector("#commune-suggestions");
const compareCommuneField = document.querySelector("#compare-commune-field");
const compareCommuneSearchInput = document.querySelector("#compare-commune-search");
const compareCommuneMetaNode = document.querySelector("#compare-commune-meta");
const compareCommuneSuggestionsNode = document.querySelector("#compare-commune-suggestions");
const clearCompareButton = document.querySelector("#clear-compare-button");
const visibilityToggle = document.querySelector("#visibility-toggle");
const visibilityLabelNode = document.querySelector("#visibility-label");
const curtainToggle = document.querySelector("#curtain-toggle");
const curtainLabelNode = document.querySelector("#curtain-label");
const basemapButton = document.querySelector("#basemap-button");
const basemapLabelNode = document.querySelector("#basemap-label");
const basemapMenu = document.querySelector("#basemap-menu");
const resolutionButton = document.querySelector("#resolution-button");
const resolutionLabelNode = document.querySelector("#resolution-label");
const resolutionMenu = document.querySelector("#resolution-menu");
const zoomSuggestionNode = document.querySelector("#zoom-suggestion");
const zoomSuggestionTextNode = document.querySelector("#zoom-suggestion-text");
const zoomSuggestionButton = document.querySelector("#zoom-suggestion-button");
const classFilterButton = document.querySelector("#class-filter-button");
const classFilterLabelNode = document.querySelector("#class-filter-label");
const classFilterMenu = document.querySelector("#class-filter-menu");
const legendResetButton = document.querySelector("#legend-reset-button");
const opacityRange = document.querySelector("#opacity-range");
const opacityValueNode = document.querySelector("#opacity-value");
const reloadButton = document.querySelector("#reload-button");
const fitButton = document.querySelector("#fit-button");
const clearFiltersButton = document.querySelector("#clear-filters-button");
const legendNode = document.querySelector("#legend");
const rankingNode = document.querySelector("#ranking");
const rankingTitleNode = document.querySelector("#ranking-title");
const rankingBadgeNode = document.querySelector("#ranking-badge");
const rankingNoteNode = document.querySelector("#ranking-note");
const scopeSummaryNode = document.querySelector("#scope-summary");
const analysisSummaryNode = document.querySelector("#analysis-summary");
const qualityScoreNode = document.querySelector("#quality-score");
const inferredRateNode = document.querySelector("#inferred-rate");
const compareSectionNode = document.querySelector("#commune-compare-section");
const compareBadgeNode = document.querySelector("#compare-badge");
const compareSummaryNode = document.querySelector("#compare-summary");
const comparePrimaryNameNode = document.querySelector("#compare-primary-name");
const comparePrimaryMetaNode = document.querySelector("#compare-primary-meta");
const compareSecondaryNameNode = document.querySelector("#compare-secondary-name");
const compareSecondaryMetaNode = document.querySelector("#compare-secondary-meta");
const compareDeltasNode = document.querySelector("#compare-deltas");
const agricultureIndicatorNode = document.querySelector("#indicator-agriculture");
const forestIndicatorNode = document.querySelector("#indicator-forest");
const artificialIndicatorNode = document.querySelector("#indicator-artificial");
const waterIndicatorNode = document.querySelector("#indicator-water");
const comparisonCoverageNode = document.querySelector("#comparison-coverage");
const comparisonUsageNode = document.querySelector("#comparison-usage");
const scopeBadgeNode = document.querySelector("#scope-badge");
const statusNode = document.querySelector("#status");
const mapLoadingNode = document.querySelector("#map-loading");
const mapLoadingTitleNode = document.querySelector("#map-loading-title");
const mapLoadingDetailNode = document.querySelector("#map-loading-detail");
const curtainOverlayNode = document.querySelector("#curtain-overlay");
const curtainDividerNode = document.querySelector("#curtain-divider");
const curtainHandleNode = document.querySelector("#curtain-handle");
const mapShellNode = document.querySelector(".map-shell");
const mapContextCommuneNode = document.querySelector("#map-context-commune");
const mapContextResolutionNode = document.querySelector("#map-context-resolution");
const mapContextCountNode = document.querySelector("#map-context-count");
const mapContextQualityNode = document.querySelector("#map-context-quality");
const hexCountNode = document.querySelector("#hex-count");
const hexCountMetaNode = document.querySelector("#hex-count-meta");
const resolutionNode = document.querySelector("#hex-resolution");
const visibleClassCountNode = document.querySelector("#visible-class-count");
const collisionCountNode = document.querySelector("#collision-count");
const collisionMetaNode = document.querySelector("#collision-meta");
const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

const numberFormatter = new Intl.NumberFormat("fr-FR");
const percentFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

const FOREST_COVER_LABELS = new Set([
  "Peuplements de conifères",
  "Peuplements de feuillus",
  "Peuplements mixtes",
  "Autres formations ligneuses",
  "Formations arbustives et sous-arbrisseaux"
]);

const ARTIFICIAL_COVER_LABELS = new Set([
  "Zones bâties",
  "Zones non bâties",
  "Zones à matériaux minéraux",
  "Sols nus"
]);

const ARTIFICIAL_USAGE_LABELS = new Set([
  "Usage résidentiel",
  "Production secondaire",
  "Production tertiaire",
  "Réseaux routiers",
  "Réseaux ferrés",
  "Réseaux aériens",
  "Réseaux d'utilité publique",
  "Activités d'extraction"
]);

const cache = new Map();

const map = L.map("map", {
  preferCanvas: true,
  zoomControl: true
}).setView([47.98, 3.4], 11);

map.createPane("boundaryPane");
map.getPane("boundaryPane").style.zIndex = "460";
map.getPane("boundaryPane").style.pointerEvents = "none";
map.createPane("compareBoundaryPane");
map.getPane("compareBoundaryPane").style.zIndex = "455";
map.getPane("compareBoundaryPane").style.pointerEvents = "none";
map.createPane("hoverPane");
map.getPane("hoverPane").style.zIndex = "470";
map.getPane("hoverPane").style.pointerEvents = "none";
map.createPane("hoverTooltipPane");
map.getPane("hoverTooltipPane").style.zIndex = "475";
map.getPane("hoverTooltipPane").style.pointerEvents = "none";
map.createPane("coveragePane");
map.getPane("coveragePane").style.zIndex = "405";
map.createPane("usagePane");
map.getPane("usagePane").style.zIndex = "406";
map.createPane("compareHexPane");
map.getPane("compareHexPane").style.zIndex = "407";
map.createPane("studyPane");
map.getPane("studyPane").style.zIndex = "430";
map.getPane("studyPane").style.pointerEvents = "none";

const coverageRenderer = L.canvas({ pane: "coveragePane" }).addTo(map);
const usageRenderer = L.canvas({ pane: "usagePane" }).addTo(map);

function createBasemapLayer(key) {
  const config = BASEMAPS[key];
  if (config.type === "wms") {
    return L.tileLayer.wms(IGN_WMS_RASTER_URL, {
      layers: config.layer,
      format: config.format,
      transparent: false,
      version: "1.3.0",
      attribution: config.attribution
    });
  }

  return L.tileLayer(buildIgnUrl(config), {
    maxZoom: 19,
    attribution: config.attribution
  });
}

let currentBasemapLayer = createBasemapLayer(state.basemap).addTo(map);
let currentLayer = null;
let currentCoverageLayer = null;
let currentUsageLayer = null;
let currentCompareHexLayer = null;
let currentData = null;
let currentSummary = null;
let currentVisibleFeatures = [];
let currentStudyFeatures = [];
let currentFocusFeatures = [];
let currentCompareStudyFeatures = [];
let currentCompareVisibleFeatures = [];
let currentBounds = null;
let currentFilterOptions = [];
let currentCommuneOptions = [];
let currentCommuneFeature = null;
let currentCommuneLayer = null;
let currentCompareCommuneLayer = null;
let currentStudyLayer = null;
let currentHoverCommuneCode = null;
let currentHoverLayer = null;
let currentHoverTooltip = null;
let currentHexPopup = null;
let currentHoveredHexIndex = null;
let currentHoveredHexLayer = null;
let currentLayerByIndex = new Map();
let isHexHoverActive = false;
let isCurtainDragging = false;
let loadRequestId = 0;
let activeLoadController = null;
let currentSuggestionFeatures = [];
let currentSuggestionIndex = -1;
let currentCompareSuggestionFeatures = [];
let currentCompareSuggestionIndex = -1;
let compareRequestId = 0;
const compareMetricsCache = new Map();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value) {
  return numberFormatter.format(Number(value ?? 0));
}

function formatPercent(value) {
  return `${percentFormatter.format(value)}%`;
}

function stopMapToolbarEventPropagation() {
  const toolbar = document.querySelector(".map-toolbar");
  if (!toolbar) {
    return;
  }
  L.DomEvent.disableClickPropagation(toolbar);
  L.DomEvent.disableScrollPropagation(toolbar);
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function getCurrentCommuneName() {
  return currentCommuneFeature?.properties?.nom ?? "Commune";
}

function getCommuneByCode(communeCode) {
  return currentCommuneOptions.find((feature) => feature.properties.code === communeCode) ?? null;
}

function getFeatureBounds(feature) {
  if (!feature.__leafletBounds) {
    feature.__leafletBounds = L.geoJSON(feature).getBounds();
  }

  return feature.__leafletBounds;
}

function getFeatureCenter(feature) {
  if (!feature.__leafletCenter) {
    feature.__leafletCenter = getFeatureBounds(feature).getCenter();
  }

  return feature.__leafletCenter;
}

function getStudyBoundsForFeature(feature) {
  if (!feature) {
    return null;
  }

  const rawBounds = getFeatureBounds(feature);
  const latMargin = Math.max((rawBounds.getNorth() - rawBounds.getSouth()) * STUDY_MARGIN_RATIO, MIN_COMMUNE_MARGIN_LAT);
  const lngMargin = Math.max((rawBounds.getEast() - rawBounds.getWest()) * STUDY_MARGIN_RATIO, MIN_COMMUNE_MARGIN_LNG);

  return L.latLngBounds(
    [rawBounds.getSouth() - latMargin, rawBounds.getWest() - lngMargin],
    [rawBounds.getNorth() + latMargin, rawBounds.getEast() + lngMargin]
  );
}

function getCurrentCommuneBounds() {
  return getStudyBoundsForFeature(currentCommuneFeature);
}

function getCurrentStudyBounds() {
  if (state.scope !== "commune") {
    return null;
  }

  return getCurrentCommuneBounds();
}

function getCompareStudyBounds() {
  if (state.scope !== "commune" || !state.compareCommuneCode) {
    return null;
  }

  return getStudyBoundsForFeature(getCommuneByCode(state.compareCommuneCode));
}

function getDisplayBounds() {
  const primaryBounds = getCurrentStudyBounds();
  const compareBounds = getCompareStudyBounds();

  if (!primaryBounds) {
    return compareBounds;
  }

  if (!compareBounds) {
    return primaryBounds;
  }

  return L.latLngBounds(primaryBounds.getSouthWest(), primaryBounds.getNorthEast()).extend(compareBounds);
}

function filterFeaturesByBounds(features, bounds) {
  if (!bounds) {
    return features;
  }

  return features.filter((feature) => isFeatureInsideBounds(feature, bounds));
}

function isFeatureInsideBounds(feature, bounds) {
  return bounds.contains(getFeatureCenter(feature));
}

function getCurrentDatasetKey() {
  return "yonne";
}

function getScopeConfig() {
  return DATASETS[getCurrentDatasetKey()];
}

function getAvailableResolutions() {
  const resolutions = state.scope === "commune" ? COMMUNE_RESOLUTIONS : DEPARTMENT_RESOLUTIONS;
  return resolutions.map((resolution) => [resolution, DATASETS.yonne.resolutions[resolution]]);
}

function getCurrentDatasetConfig() {
  return getScopeConfig().resolutions[state.resolution];
}

function getActiveMode() {
  return state.colorMode;
}

function getModeLabel(mode) {
  return mode === "coverage" ? "couverture du sol" : "usage du sol";
}

function isArtificializedFeature(feature) {
  return ARTIFICIAL_COVER_LABELS.has(feature.properties.label_cs) || ARTIFICIAL_USAGE_LABELS.has(feature.properties.label_us);
}

function isArtificializedFeatureForMode(feature, mode = state.colorMode) {
  return mode === "coverage"
    ? ARTIFICIAL_COVER_LABELS.has(feature.properties.label_cs)
    : ARTIFICIAL_USAGE_LABELS.has(feature.properties.label_us);
}

function getFocusFeatures(features, mode = state.colorMode) {
  if (state.focusMode !== "artificialization") {
    return features;
  }

  return features.filter((feature) => isArtificializedFeatureForMode(feature, mode));
}

function getScopeStatusLabel() {
  return state.scope === "commune" ? getCurrentCommuneName() : "Yonne";
}

function getLabelForMode(feature, mode) {
  return mode === "coverage" ? feature.properties.label_cs : feature.properties.label_us;
}

function getColorForMode(feature, mode) {
  return mode === "coverage" ? feature.properties.color_cs : feature.properties.color_us;
}

function getCurrentLabel(feature) {
  return getLabelForMode(feature, state.colorMode);
}

function getCurrentColor(feature) {
  return getColorForMode(feature, state.colorMode);
}

function getCurtainSideMode(feature) {
  const center = getFeatureCenter(feature);
  const point = map.latLngToContainerPoint(center);
  const splitX = map.getSize().x * state.curtainRatio;
  return point.x <= splitX ? "coverage" : "usage";
}

function getColorForRenderMode(feature, mode) {
  if (mode === "curtain") {
    return getColorForMode(feature, getCurtainSideMode(feature));
  }
  return getColorForMode(feature, mode);
}

function isInferredFeature(feature) {
  return Boolean(feature.properties.inferred_fill || feature.properties.inferred_study_fill);
}

function getSelectedFilter() {
  return state.classFilter;
}

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.dataset.error = isError ? "true" : "false";
}

function setMapLoading(isLoading, detail = "") {
  mapLoadingNode.hidden = !isLoading;
  mapLoadingTitleNode.textContent = isLoading ? "Chargement de la couche" : "";
  mapLoadingDetailNode.textContent = isLoading ? detail : "";
}

function updateOpacityLabel() {
  opacityValueNode.textContent = `${Math.round(Number(opacityRange.value) * 100)}%`;
}

function updateVisibilityLabel() {
  visibilityLabelNode.textContent = state.layerVisible ? "Affichés" : "Masqués";
}

function updateCurtainLabel() {
  curtainLabelNode.textContent = state.curtainMode ? "Actif" : "Désactivé";
  curtainToggle.checked = state.curtainMode;
}

function updateBasemapLabel() {
  basemapLabelNode.textContent = BASEMAPS[state.basemap]?.label ?? "Fond IGN";
}

function calculateBounds(features) {
  if (!features.length) {
    return null;
  }
  return L.geoJSON({
    type: "FeatureCollection",
    features
  }).getBounds();
}

function applyCurtainClip() {
  if (!state.curtainMode || !state.layerVisible || !currentLayer) {
    curtainOverlayNode.hidden = true;
    return;
  }

  const split = Math.max(0, Math.min(1, state.curtainRatio));
  const splitPercent = split * 100;
  curtainDividerNode.style.left = `${splitPercent}%`;
  curtainOverlayNode.hidden = false;
}

function updateCurtainRatioFromClientX(clientX) {
  const rect = mapShellNode?.getBoundingClientRect();
  if (!rect || rect.width <= 0) {
    return;
  }

  const ratio = (clientX - rect.left) / rect.width;
  state.curtainRatio = Math.max(0.04, Math.min(0.96, ratio));
  updateRenderedLayerStyles();
}

function startCurtainDrag(event) {
  if (!state.curtainMode || !state.layerVisible) {
    return;
  }

  isCurtainDragging = true;
  map.dragging.disable();
  document.body.style.cursor = "ew-resize";
  updateCurtainRatioFromClientX(event.clientX);
  event.preventDefault();
  event.stopPropagation();
}

function stopCurtainDrag() {
  if (!isCurtainDragging) {
    return;
  }

  isCurtainDragging = false;
  map.dragging.enable();
  document.body.style.cursor = "";
}

function boundsToPlainObject(bounds) {
  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth()
  };
}

function doBoundsIntersect(left, right) {
  return !(
    left.east < right.west ||
    left.west > right.east ||
    left.north < right.south ||
    left.south > right.north
  );
}

function mergeChunkCollections(collections) {
  const featureByIndex = new Map();

  for (const collection of collections) {
    for (const feature of collection.features ?? []) {
      featureByIndex.set(feature.properties.h3_index, feature);
    }
  }

  return {
    type: "FeatureCollection",
    features: Array.from(featureByIndex.values()),
    studyScoped: true
  };
}

function buildPopup(feature, mode = state.curtainMode ? getCurtainSideMode(feature) : state.colorMode) {
  const props = feature.properties;
  const provenance = isInferredFeature(feature) ? "Cellule inférée" : "Cellule source";
  const swatchColor = getColorForMode(feature, mode);
  const headline = getLabelForMode(feature, mode);
  const headlineLabel = mode === "coverage" ? "Couverture dominante" : "Usage dominant";
  return `
    <div style="display:grid; gap:8px; min-width:220px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="width:18px; height:18px; display:inline-block; clip-path:polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%); background:${escapeHtml(swatchColor)}; border:1px solid rgba(0,0,0,0.2);"></span>
        <strong>${escapeHtml(headline)}</strong>
      </div>
      <div><strong>${headlineLabel}</strong>: ${escapeHtml(headline)}</div>
      <div><strong>Qualité</strong>: ${provenance}</div>
      <div><strong>Couverture</strong>: ${escapeHtml(props.label_cs)}</div>
      <div><strong>Usage</strong>: ${escapeHtml(props.label_us)}</div>
      <div><strong>Hexagone H3</strong>: résolution ${escapeHtml(props.resolution)}</div>
      <div><strong>Surface source agrégée</strong>: ${formatNumber(props.surface_ha)} ha</div>
      <div><strong>Polygones source</strong>: ${formatNumber(props.source_feature_count)}</div>
    </div>
  `;
}

function styleFeature(feature, mode = state.colorMode) {
  const zoom = map.getZoom();
  const featureCount = currentData?.features.length ?? 0;
  const inferred = isInferredFeature(feature);
  const baseFillOpacity = Number(opacityRange.value);
  let strokeOpacity = 0.5;
  let strokeWeight = 0.6;

  if ((Number(state.resolution) >= 10 || featureCount > 15000) && zoom <= 10) {
    strokeOpacity = 0.18;
    strokeWeight = 0.18;
  } else if ((Number(state.resolution) >= 10 || featureCount > 15000) && zoom <= 12) {
    strokeOpacity = 0.24;
    strokeWeight = 0.28;
  } else if (featureCount > 10000 && zoom <= 9) {
    strokeOpacity = 0.22;
    strokeWeight = 0.24;
  }

  return {
    stroke: true,
    color: inferred ? "#8b5a2b" : "#5f4b37",
    opacity: strokeOpacity,
    weight: inferred ? strokeWeight + 0.08 : strokeWeight,
    dashArray: inferred ? "3 2" : null,
    lineJoin: "round",
    lineCap: "round",
    fillColor: getColorForRenderMode(feature, mode),
    fillOpacity: inferred ? Math.max(0.24, baseFillOpacity - 0.14) : baseFillOpacity
  };
}

function fitCurrentLayer() {
  const displayBounds = getDisplayBounds();
  if (displayBounds) {
    map.fitBounds(displayBounds.pad(0.02));
    return;
  }
  if (!currentBounds || !currentBounds.isValid()) {
    return;
  }
  map.fitBounds(currentBounds.pad(0.05));
}

function groupFeatures(features, mode) {
  const groups = new Map();
  for (const feature of features) {
    const label = getLabelForMode(feature, mode);
    const color = getColorForMode(feature, mode);
    const existing = groups.get(label) ?? { label, color, count: 0 };
    existing.count += 1;
    groups.set(label, existing);
  }
  return Array.from(groups.values()).sort((left, right) => right.count - left.count);
}

function syncToggleButtons() {
  for (const button of scopeButtons) {
    button.classList.toggle("active", button.dataset.scope === state.scope);
  }
  for (const button of colorModeButtons) {
    button.classList.toggle("active", button.dataset.colorMode === state.colorMode);
  }
  for (const button of focusModeButtons) {
    button.classList.toggle("active", button.dataset.focusMode === state.focusMode);
  }
  visibilityToggle.checked = state.layerVisible;
  updateVisibilityLabel();
  updateCurtainLabel();
  updateBasemapLabel();
  resolutionLabelNode.textContent = getCurrentDatasetConfig()?.uiLabel ?? `Résolution ${state.resolution}`;
  communeField.hidden = state.scope !== "commune";
  compareCommuneField.hidden = state.scope !== "commune";
  communeSearchInput.value = state.scope === "commune" ? getCurrentCommuneName() : "";
  compareCommuneSearchInput.value = state.scope === "commune" && state.compareCommuneCode
    ? getCommuneByCode(state.compareCommuneCode)?.properties?.nom ?? ""
    : "";
  clearCompareButton.hidden = !(state.scope === "commune" && state.compareCommuneCode);
  updateZoomSuggestion();
  applyCurtainClip();
}

function closeBasemapMenu() {
  basemapMenu.hidden = true;
  basemapButton.setAttribute("aria-expanded", "false");
}

function openBasemapMenu() {
  basemapMenu.hidden = false;
  basemapButton.setAttribute("aria-expanded", "true");
}

function toggleBasemapMenu() {
  if (basemapMenu.hidden) {
    openBasemapMenu();
  } else {
    closeBasemapMenu();
  }
}

function closeFilterMenu() {
  classFilterMenu.hidden = true;
  classFilterButton.setAttribute("aria-expanded", "false");
}

function openFilterMenu() {
  classFilterMenu.hidden = false;
  classFilterButton.setAttribute("aria-expanded", "true");
}

function toggleFilterMenu() {
  if (classFilterMenu.hidden) {
    openFilterMenu();
  } else {
    closeFilterMenu();
  }
}

function closeResolutionMenu() {
  resolutionMenu.hidden = true;
  resolutionButton.setAttribute("aria-expanded", "false");
}

function openResolutionMenu() {
  resolutionMenu.hidden = false;
  resolutionButton.setAttribute("aria-expanded", "true");
}

function toggleResolutionMenu() {
  if (resolutionMenu.hidden) {
    openResolutionMenu();
  } else {
    closeResolutionMenu();
  }
}

function closeCommuneSuggestions() {
  communeSuggestionsNode.hidden = true;
  currentSuggestionFeatures = [];
  currentSuggestionIndex = -1;
}

function closeCompareCommuneSuggestions() {
  compareCommuneSuggestionsNode.hidden = true;
  currentCompareSuggestionFeatures = [];
  currentCompareSuggestionIndex = -1;
}

function openCommuneSuggestions() {
  communeSuggestionsNode.hidden = false;
}

function openCompareCommuneSuggestions() {
  compareCommuneSuggestionsNode.hidden = false;
}

function prepareCommuneInputForTyping() {
  if (communeSearchInput.value === getCurrentCommuneName()) {
    communeSearchInput.value = "";
  }
}

function prepareCompareCommuneInputForTyping() {
  const currentValue = state.compareCommuneCode ? getCommuneByCode(state.compareCommuneCode)?.properties?.nom ?? "" : "";
  if (compareCommuneSearchInput.value === currentValue) {
    compareCommuneSearchInput.value = "";
  }
}

function getFilteredCommunes(query, { excludeCodes = [] } = {}) {
  const normalizedQuery = normalizeText(query);
  const excluded = new Set(excludeCodes);
  if (!normalizedQuery) {
    return currentCommuneOptions.filter((feature) => !excluded.has(feature.properties.code)).slice(0, 12);
  }

  return currentCommuneOptions
    .filter((feature) => !excluded.has(feature.properties.code))
    .filter((feature) => normalizeText(feature.properties.nom).includes(normalizedQuery))
    .sort((left, right) => {
      const leftName = normalizeText(left.properties.nom);
      const rightName = normalizeText(right.properties.nom);
      const leftStarts = leftName.startsWith(normalizedQuery) ? 0 : 1;
      const rightStarts = rightName.startsWith(normalizedQuery) ? 0 : 1;
      if (leftStarts !== rightStarts) {
        return leftStarts - rightStarts;
      }
      return left.properties.nom.localeCompare(right.properties.nom, "fr");
    })
    .slice(0, 12);
}

function setActiveCommuneSuggestion(nextIndex, { ensureVisible = true } = {}) {
  const options = Array.from(communeSuggestionsNode.querySelectorAll(".dropdown-option"));

  currentSuggestionIndex = nextIndex;
  options.forEach((option, index) => {
    option.dataset.highlighted = index === currentSuggestionIndex ? "true" : "false";
  });

  if (!ensureVisible || currentSuggestionIndex < 0 || currentSuggestionIndex >= options.length) {
    return;
  }

  options[currentSuggestionIndex].scrollIntoView({ block: "nearest" });
}

function setActiveCompareCommuneSuggestion(nextIndex, { ensureVisible = true } = {}) {
  const options = Array.from(compareCommuneSuggestionsNode.querySelectorAll(".dropdown-option"));

  currentCompareSuggestionIndex = nextIndex;
  options.forEach((option, index) => {
    option.dataset.highlighted = index === currentCompareSuggestionIndex ? "true" : "false";
  });

  if (!ensureVisible || currentCompareSuggestionIndex < 0 || currentCompareSuggestionIndex >= options.length) {
    return;
  }

  options[currentCompareSuggestionIndex].scrollIntoView({ block: "nearest" });
}

function renderCommuneSuggestions(query = communeSearchInput.value, { showAll = false, highlightedCode = null } = {}) {
  communeSuggestionsNode.innerHTML = "";

  if (state.scope !== "commune" || !currentCommuneOptions.length) {
    closeCommuneSuggestions();
    return;
  }

  const matches = showAll
    ? currentCommuneOptions.slice(0, 12)
    : getFilteredCommunes(query);
  if (!matches.length) {
    currentSuggestionFeatures = [];
    currentSuggestionIndex = -1;
    communeSuggestionsNode.innerHTML = `<div class="dropdown-empty">Aucune commune trouvée.</div>`;
    openCommuneSuggestions();
    return;
  }

  currentSuggestionFeatures = matches;

  let nextHighlightedIndex = -1;
  if (highlightedCode) {
    nextHighlightedIndex = matches.findIndex((feature) => feature.properties.code === highlightedCode);
  }
  if (nextHighlightedIndex === -1 && !showAll && query.trim()) {
    nextHighlightedIndex = 0;
  }
  if (nextHighlightedIndex === -1) {
    nextHighlightedIndex = matches.findIndex((feature) => feature.properties.code === state.selectedCommuneCode);
  }
  if (nextHighlightedIndex === -1) {
    nextHighlightedIndex = 0;
  }

  for (const [index, feature] of matches.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `dropdown-option${feature.properties.code === state.selectedCommuneCode ? " active" : ""}`;
    button.dataset.highlighted = index === nextHighlightedIndex ? "true" : "false";
    button.dataset.code = feature.properties.code;
    button.innerHTML = `
      <span class="legend-swatch" style="background:linear-gradient(135deg, #b9a689, #6e563f)"></span>
      <span class="dropdown-option-label">${escapeHtml(feature.properties.nom)}</span>
      <span class="dropdown-option-count">${formatNumber(feature.properties.population ?? 0)} hab.</span>
    `;
    button.addEventListener("mouseenter", () => {
      setActiveCommuneSuggestion(index, { ensureVisible: false });
    });
    button.addEventListener("click", () => {
      selectCommune(feature.properties.code);
      closeCommuneSuggestions();
    });
    communeSuggestionsNode.appendChild(button);
  }

  currentSuggestionIndex = nextHighlightedIndex;
  openCommuneSuggestions();
}

function renderCompareCommuneSuggestions(query = compareCommuneSearchInput.value, { showAll = false, highlightedCode = null } = {}) {
  compareCommuneSuggestionsNode.innerHTML = "";

  if (state.scope !== "commune" || !currentCommuneOptions.length) {
    closeCompareCommuneSuggestions();
    return;
  }

  const matches = showAll
    ? currentCommuneOptions.filter((feature) => feature.properties.code !== state.selectedCommuneCode).slice(0, 12)
    : getFilteredCommunes(query, { excludeCodes: [state.selectedCommuneCode] });

  if (!matches.length) {
    currentCompareSuggestionFeatures = [];
    currentCompareSuggestionIndex = -1;
    compareCommuneSuggestionsNode.innerHTML = `<div class="dropdown-empty">Aucune commune trouvée.</div>`;
    openCompareCommuneSuggestions();
    return;
  }

  currentCompareSuggestionFeatures = matches;

  let nextHighlightedIndex = -1;
  if (highlightedCode) {
    nextHighlightedIndex = matches.findIndex((feature) => feature.properties.code === highlightedCode);
  }
  if (nextHighlightedIndex === -1 && !showAll && query.trim()) {
    nextHighlightedIndex = 0;
  }
  if (nextHighlightedIndex === -1 && state.compareCommuneCode) {
    nextHighlightedIndex = matches.findIndex((feature) => feature.properties.code === state.compareCommuneCode);
  }
  if (nextHighlightedIndex === -1) {
    nextHighlightedIndex = 0;
  }

  for (const [index, feature] of matches.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `dropdown-option${feature.properties.code === state.compareCommuneCode ? " active" : ""}`;
    button.dataset.highlighted = index === nextHighlightedIndex ? "true" : "false";
    button.dataset.code = feature.properties.code;
    button.innerHTML = `
      <span class="legend-swatch" style="background:linear-gradient(135deg, #d7c1a4, #8b5a2b)"></span>
      <span class="dropdown-option-label">${escapeHtml(feature.properties.nom)}</span>
      <span class="dropdown-option-count">${formatNumber(feature.properties.population ?? 0)} hab.</span>
    `;
    button.addEventListener("mouseenter", () => {
      setActiveCompareCommuneSuggestion(index, { ensureVisible: false });
    });
    button.addEventListener("click", () => {
      selectCompareCommune(feature.properties.code);
      closeCompareCommuneSuggestions();
    });
    compareCommuneSuggestionsNode.appendChild(button);
  }

  currentCompareSuggestionIndex = nextHighlightedIndex;
  openCompareCommuneSuggestions();
}

function pointInRing(lng, lat, ring) {
  let inside = false;

  for (let index = 0, previousIndex = ring.length - 1; index < ring.length; previousIndex = index++) {
    const [lngA, latA] = ring[index];
    const [lngB, latB] = ring[previousIndex];
    const intersects =
      ((latA > lat) !== (latB > lat)) &&
      (lng < ((lngB - lngA) * (lat - latA)) / ((latB - latA) || Number.EPSILON) + lngA);

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointInPolygonCoordinates(lng, lat, polygonCoordinates) {
  if (!polygonCoordinates.length || !pointInRing(lng, lat, polygonCoordinates[0])) {
    return false;
  }

  for (let index = 1; index < polygonCoordinates.length; index += 1) {
    if (pointInRing(lng, lat, polygonCoordinates[index])) {
      return false;
    }
  }

  return true;
}

function isPointInsideFeature(latlng, feature) {
  if (!getFeatureBounds(feature).contains(latlng)) {
    return false;
  }

  const lat = latlng.lat;
  const lng = latlng.lng;

  if (feature.geometry.type === "Polygon") {
    return isPointInPolygonCoordinates(lng, lat, feature.geometry.coordinates);
  }

  if (feature.geometry.type === "MultiPolygon") {
    return feature.geometry.coordinates.some((polygonCoordinates) =>
      isPointInPolygonCoordinates(lng, lat, polygonCoordinates)
    );
  }

  return false;
}

function findCommuneAtLatLng(latlng) {
  return currentCommuneOptions.find((feature) => isPointInsideFeature(latlng, feature)) ?? null;
}

function resetFilters() {
  state.classFilter = null;
  state.focusMode = "all";
  classFilterLabelNode.textContent = "Toutes les classes";
  syncToggleButtons();
  renderFilterMenu();
  closeFilterMenu();
  refreshView();
}

function updateMapContext(visibleFeatures) {
  mapContextCommuneNode.textContent = state.scope === "commune" ? getCurrentCommuneName() : "Yonne";
  mapContextResolutionNode.textContent = `R${state.resolution}`;
  mapContextCountNode.textContent = formatNumber(visibleFeatures.length);
  mapContextQualityNode.textContent = getQualityMetrics().reliabilityLabel;
}

function getSuggestedResolution() {
  const zoom = map.getZoom();

  if (state.scope === "commune") {
    if (zoom <= 11) {
      return "8";
    }
    if (zoom <= 13) {
      return "9";
    }
    return "10";
  }

  return zoom <= 8 ? "7" : "8";
}

function updateZoomSuggestion() {
  const suggestedResolution = getSuggestedResolution();
  const available = new Set(getAvailableResolutions().map(([resolution]) => resolution));

  if (!available.has(suggestedResolution) || suggestedResolution === state.resolution) {
    zoomSuggestionNode.hidden = true;
    return;
  }

  zoomSuggestionTextNode.textContent = `Zoom actuel : R${suggestedResolution} serait plus adapté.`;
  zoomSuggestionButton.textContent = `Appliquer R${suggestedResolution}`;
  zoomSuggestionButton.dataset.resolution = suggestedResolution;
  zoomSuggestionNode.hidden = false;
}

function clearHoverCommune() {
  currentHoverCommuneCode = null;

  if (currentHoverLayer) {
    currentHoverLayer.remove();
    currentHoverLayer = null;
  }

  if (currentHoverTooltip) {
    currentHoverTooltip.remove();
    currentHoverTooltip = null;
  }
}

function clearHexHover() {
  isHexHoverActive = false;
  map.getContainer().style.cursor = "";

  if (currentHoveredHexLayer?.feature) {
    const mode = state.curtainMode ? "curtain" : state.colorMode;
    const baseStyle = styleFeature(currentHoveredHexLayer.feature, mode);
    currentHoveredHexLayer.options.__baseStyle = baseStyle;
    currentHoveredHexLayer.setStyle(baseStyle);
  }

  currentHoveredHexIndex = null;
  currentHoveredHexLayer = null;

  if (currentHexPopup) {
    map.closePopup(currentHexPopup);
    currentHexPopup = null;
  }
}

function getHoveredFeatureAtLatLng(latlng) {
  for (const feature of currentVisibleFeatures) {
    if (isPointInsideFeature(latlng, feature)) {
      return feature;
    }
  }

  for (const feature of currentCompareVisibleFeatures) {
    if (isPointInsideFeature(latlng, feature)) {
      return feature;
    }
  }

  return null;
}

function updateHexHover(latlng) {
  if (!state.layerVisible || !currentLayer) {
    clearHexHover();
    return false;
  }

  const feature = getHoveredFeatureAtLatLng(latlng);
  if (!feature) {
    clearHexHover();
    return false;
  }

  const featureIndex = feature.properties.h3_index;
  const mode = state.curtainMode ? "curtain" : state.colorMode;
  const popupMode = state.curtainMode ? getCurtainSideMode(feature) : state.colorMode;
  const layer = currentLayerByIndex.get(featureIndex) ?? null;

  if (currentHoveredHexIndex === featureIndex) {
    if (currentHexPopup) {
      currentHexPopup.setLatLng(latlng);
    }
    return true;
  }

  clearHoverCommune();
  clearHexHover();
  isHexHoverActive = true;
  map.getContainer().style.cursor = "default";
  currentHoveredHexIndex = featureIndex;
  currentHoveredHexLayer = layer;

  if (layer) {
    const currentStyle = layer.options.__baseStyle ?? styleFeature(feature, mode);
    layer.setStyle({
      color: "#3f2c1d",
      opacity: Math.min(0.82, currentStyle.opacity + 0.34),
      weight: Math.max(0.72, currentStyle.weight + 0.42),
      dashArray: currentStyle.dashArray,
      fillOpacity: Math.min(1, Number(opacityRange.value) + 0.1)
    });
  }

  currentHexPopup = L.popup({
    maxWidth: 320,
    autoClose: true,
    closeButton: false,
    offset: [0, -4]
  })
    .setLatLng(latlng)
    .setContent(buildPopup(feature, popupMode))
    .openOn(map);

  const hoveredCommune = findCommuneAtLatLng(latlng);
  if (hoveredCommune && hoveredCommune.properties.code !== state.selectedCommuneCode) {
    updateHoverCommune(hoveredCommune, latlng, { showTooltip: false, allowHexHover: true });
  }

  return true;
}

function updateHoverCommune(feature, latlng, { showTooltip = true, allowHexHover = false } = {}) {
  const hoveredCode = feature?.properties?.code ?? null;
  if (!hoveredCode || (isHexHoverActive && !allowHexHover)) {
    clearHoverCommune();
    return;
  }

  if (hoveredCode === state.selectedCommuneCode && state.scope === "commune") {
    clearHoverCommune();
    return;
  }

  if (currentHoverCommuneCode === hoveredCode && currentHoverLayer) {
    if (showTooltip && currentHoverTooltip) {
      currentHoverTooltip.setLatLng(latlng);
    }
    return;
  }

  if (currentHoverLayer) {
    currentHoverLayer.remove();
    currentHoverLayer = null;
  }

  currentHoverCommuneCode = hoveredCode;
  currentHoverLayer = L.geoJSON(
    {
      type: "FeatureCollection",
      features: [feature]
    },
    {
      pane: "hoverPane",
      style: {
        color: "#8b5a2b",
        weight: 2.3,
        opacity: 0.88,
        fill: true,
        fillColor: "#d7c1a4",
        fillOpacity: 0.08
      },
      interactive: false
    }
  ).addTo(map);

  if (currentHoverTooltip) {
    currentHoverTooltip.remove();
    currentHoverTooltip = null;
  }

  if (showTooltip) {
    currentHoverTooltip = L.tooltip({
      permanent: false,
      direction: "top",
      offset: [0, -10],
      opacity: 0.96,
      className: "commune-hover-tooltip",
      pane: "hoverTooltipPane"
    })
      .setLatLng(latlng)
      .setContent(feature.properties.nom)
      .addTo(map);
  }
}

function renderFilterMenu() {
  classFilterMenu.innerHTML = "";
  const selectedFilter = getSelectedFilter();

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = `dropdown-option${selectedFilter === null ? " active" : ""}`;
  allButton.innerHTML = `
    <span class="legend-swatch" style="background:linear-gradient(135deg, #d8d0b8, #6e563f)"></span>
    <span class="dropdown-option-label">Toutes les classes</span>
    <span class="dropdown-option-count">${formatNumber(currentFocusFeatures.length)}</span>
  `;
  allButton.addEventListener("click", () => {
    state.classFilter = null;
    classFilterLabelNode.textContent = "Toutes les classes";
    closeFilterMenu();
    refreshView();
  });
  classFilterMenu.appendChild(allButton);

  for (const entry of currentFilterOptions) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `dropdown-option${selectedFilter === entry.label ? " active" : ""}`;
    option.innerHTML = `
      <span class="legend-swatch" style="background:${escapeHtml(entry.color)}"></span>
      <span class="dropdown-option-label">${escapeHtml(entry.label)}</span>
      <span class="dropdown-option-count">${formatNumber(entry.count)}</span>
    `;
    option.addEventListener("click", () => {
      state.classFilter = entry.label;
      classFilterLabelNode.textContent = entry.label;
      closeFilterMenu();
      refreshView();
    });
    classFilterMenu.appendChild(option);
  }
}

function renderBasemapMenu() {
  basemapMenu.innerHTML = "";

  for (const [key, config] of Object.entries(BASEMAPS)) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `dropdown-option${state.basemap === key ? " active" : ""}`;
    option.innerHTML = `
      <span class="legend-swatch" style="background:linear-gradient(135deg, #d8d0b8, #6e563f)"></span>
      <span class="dropdown-option-label">${escapeHtml(config.label)}</span>
      <span class="dropdown-option-count">IGN</span>
    `;
    option.addEventListener("click", () => {
      if (state.basemap === key) {
        closeBasemapMenu();
        return;
      }
      state.basemap = key;
      updateBasemapLayer();
      updateBasemapLabel();
      renderBasemapMenu();
      closeBasemapMenu();
    });
    basemapMenu.appendChild(option);
  }
}

function renderResolutionMenu() {
  resolutionMenu.innerHTML = "";

  for (const [resolution, config] of getAvailableResolutions()) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `dropdown-option${state.resolution === resolution ? " active" : ""}`;
    option.innerHTML = `
      <span class="legend-swatch" style="background:linear-gradient(135deg, #b9a689, #6e563f)"></span>
      <span class="dropdown-option-label">${escapeHtml(config.uiLabel)}</span>
      <span class="dropdown-option-count">R${resolution}</span>
    `;
    option.addEventListener("click", () => {
      if (state.resolution === resolution) {
        closeResolutionMenu();
        return;
      }
      state.resolution = resolution;
      syncToggleButtons();
      closeResolutionMenu();
      loadDataset({ fitBounds: true });
    });
    resolutionMenu.appendChild(option);
  }
}

async function loadCommunes() {
  const collection = await fetchJson(COMMUNES_URL);
  currentCommuneOptions = [...collection.features].sort((left, right) =>
    left.properties.nom.localeCompare(right.properties.nom, "fr")
  );
  currentCommuneFeature =
    getCommuneByCode(state.selectedCommuneCode) ??
    currentCommuneOptions[0] ??
    null;
  state.selectedCommuneCode = currentCommuneFeature?.properties.code ?? state.selectedCommuneCode;
  communeMetaNode.textContent = currentCommuneFeature
    ? `${currentCommuneFeature.properties.nom} • ${formatNumber(currentCommuneFeature.properties.population ?? 0)} habitants`
    : "Aucune commune disponible.";
  compareCommuneMetaNode.textContent = "Aucune comparaison active.";
}

function ensureResolutionForCurrentScope() {
  const availableResolutions = getAvailableResolutions().map(([resolution]) => resolution);
  if (availableResolutions.includes(state.resolution)) {
    return false;
  }
  state.resolution = state.scope === "commune" ? COMMUNE_DEFAULT_RESOLUTION : DEPARTMENT_DEFAULT_RESOLUTION;
  return true;
}

function selectCommune(communeCode, { fitBounds = true } = {}) {
  const nextFeature = getCommuneByCode(communeCode);
  if (!nextFeature) {
    return;
  }

  const communeChanged = state.selectedCommuneCode !== communeCode;
  state.selectedCommuneCode = communeCode;
  currentCommuneFeature = nextFeature;
  if (state.compareCommuneCode === communeCode) {
    state.compareCommuneCode = null;
    compareCommuneSearchInput.value = "";
    compareCommuneMetaNode.textContent = "Aucune comparaison active.";
  }
  clearHoverCommune();
  communeSearchInput.value = nextFeature.properties.nom;
  communeMetaNode.textContent = `${nextFeature.properties.nom} • ${formatNumber(nextFeature.properties.population ?? 0)} habitants`;

  const resolutionChanged = ensureResolutionForCurrentScope();
  syncToggleButtons();
  renderResolutionMenu();
  updateStudyAreaLayer();
  updateCommuneBoundaryLayer();
  updateCompareCommuneLayer();

  if (communeChanged || resolutionChanged) {
    loadDataset({ fitBounds });
    return;
  }

  populateClassFilter();
  refreshView({ fitBounds });
}

function selectCompareCommune(communeCode) {
  if (!communeCode || communeCode === state.selectedCommuneCode) {
    state.compareCommuneCode = null;
    compareCommuneSearchInput.value = "";
    compareCommuneMetaNode.textContent = "Aucune comparaison active.";
    syncToggleButtons();
    updateCompareCommuneLayer();
    renderCompareSection();
    fitCurrentLayer();
    return;
  }

  const nextFeature = getCommuneByCode(communeCode);
  if (!nextFeature) {
    return;
  }

  state.compareCommuneCode = communeCode;
  compareCommuneSearchInput.value = nextFeature.properties.nom;
  compareCommuneMetaNode.textContent = `${nextFeature.properties.nom} • ${formatNumber(nextFeature.properties.population ?? 0)} habitants`;
  syncToggleButtons();
  updateCompareCommuneLayer();
  renderCompareSection();
}

function updateLegendResetButton() {
  legendResetButton.dataset.active = state.classFilter ? "true" : "false";
}

function getQualityMetrics(features = currentStudyFeatures) {
  const total = features.length;
  const inferredCount = features.filter(isInferredFeature).length;
  const inferredRate = total ? (inferredCount / total) * 100 : 0;

  let reliabilityLabel = "Fiabilité élevée";
  if (inferredRate >= 20) {
    reliabilityLabel = "Fiabilité modérée";
  } else if (inferredRate >= 8) {
    reliabilityLabel = "Fiabilité bonne";
  } else if (inferredRate < 2) {
    reliabilityLabel = "Fiabilité très élevée";
  }

  return {
    inferredCount,
    inferredRate,
    reliabilityLabel
  };
}

function computeKeyShares(features) {
  if (!features.length) {
    return {
      agriculture: 0,
      forest: 0,
      artificial: 0,
      water: 0
    };
  }

  const total = features.length;
  return {
    agriculture: (features.filter((feature) => feature.properties.label_us === "Agriculture").length / total) * 100,
    forest: (features.filter((feature) => FOREST_COVER_LABELS.has(feature.properties.label_cs)).length / total) * 100,
    artificial: (features.filter(isArtificializedFeature).length / total) * 100,
    water: (features.filter((feature) => feature.properties.label_cs === "Surfaces d'eau").length / total) * 100
  };
}

function buildCommuneMetrics(communeFeature, features) {
  const keyShares = computeKeyShares(features);
  const coverageTop = groupFeatures(features, "coverage")[0] ?? null;
  const usageTop = groupFeatures(features, "usage")[0] ?? null;
  const quality = getQualityMetrics(features);

  return {
    code: communeFeature.properties.code,
    name: communeFeature.properties.nom,
    population: communeFeature.properties.population ?? 0,
    hexCount: features.length,
    studyBounds: getStudyBoundsForFeature(communeFeature),
    features,
    quality,
    keyShares,
    coverageTop,
    usageTop
  };
}

async function getCommuneMetrics(communeCode) {
  const communeFeature = getCommuneByCode(communeCode);
  if (!communeFeature) {
    return null;
  }

  const cacheKey = `${communeCode}|${state.resolution}`;
  if (compareMetricsCache.has(cacheKey)) {
    return compareMetricsCache.get(cacheKey);
  }

  let features;
  if (state.scope === "commune" && communeCode === state.selectedCommuneCode && currentData) {
    features = getStudyFeatures();
  } else {
    const bounds = getStudyBoundsForFeature(communeFeature);
    const dataset = getCurrentDatasetConfig();
    const data = await loadDatasetData(dataset, {
      studyBounds: bounds,
      showLoading: false
    });
    features = filterFeaturesByBounds(data.features, bounds);
  }

  const metrics = buildCommuneMetrics(communeFeature, features);
  compareMetricsCache.set(cacheKey, metrics);
  return metrics;
}

function formatSignedPercent(value) {
  const rounded = percentFormatter.format(Math.abs(value));
  if (value > 0) {
    return `+${rounded} pts`;
  }
  if (value < 0) {
    return `-${rounded} pts`;
  }
  return `0 pt`;
}

function getCompareDeltaTone(deltaValue) {
  if (Math.abs(deltaValue) < 0.05) {
    return "neutral";
  }
  return deltaValue > 0 ? "positive" : "negative";
}

function buildCompareNarrative(primaryMetrics, secondaryMetrics, deltas) {
  const positive = deltas
    .filter(([, , value]) => value > 0.05)
    .sort((left, right) => right[2] - left[2]);
  const negative = deltas
    .filter(([, , value]) => value < -0.05)
    .sort((left, right) => left[2] - right[2]);

  const secondaryWins = positive
    .slice(0, 2)
    .map(([label, , value]) => `${label.toLowerCase()} (${formatSignedPercent(value)})`);
  const primaryWins = negative
    .slice(0, 2)
    .map(([label, , value]) => `${label.toLowerCase()} (${formatSignedPercent(Math.abs(value))})`);

  if (!secondaryWins.length && !primaryWins.length) {
    return `${primaryMetrics.name} et ${secondaryMetrics.name} présentent un profil très proche à cette résolution.`;
  }

  const parts = [];
  if (primaryWins.length) {
    parts.push(`${primaryMetrics.name} est devant sur ${primaryWins.join(" et ")}`);
  }
  if (secondaryWins.length) {
    parts.push(`${secondaryMetrics.name} reste devant sur ${secondaryWins.join(" et ")}`);
  }

  return `${parts.join(". ")}.`;
}

function renderCompareDeltaRow(label, description, deltaValue, primaryName, secondaryName) {
  const tone = getCompareDeltaTone(deltaValue);
  const leaderText =
    tone === "neutral"
      ? "Profils proches"
      : deltaValue > 0
        ? `Avantage ${primaryName}`
        : `Avantage ${secondaryName}`;

  const row = document.createElement("div");
  row.className = `compare-delta-row compare-delta-row-${tone}`;
  row.innerHTML = `
    <div class="compare-delta-metric">
      <span class="stat-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(description)}</strong>
    </div>
    <div class="compare-delta-value compare-delta-value-${tone}">
      <strong>${escapeHtml(formatSignedPercent(deltaValue))}</strong>
      <span class="compare-delta-direction">${escapeHtml(leaderText)}</span>
    </div>
  `;
  return row;
}

async function renderCompareSection() {
  const requestId = ++compareRequestId;

  if (state.scope !== "commune" || !state.compareCommuneCode) {
    compareSectionNode.hidden = true;
    currentCompareStudyFeatures = [];
    currentCompareVisibleFeatures = [];
    updateCompareHexLayer();
    compareSummaryNode.textContent = "Sélectionne une deuxième commune pour comparer les profils.";
    comparePrimaryNameNode.textContent = "-";
    comparePrimaryMetaNode.textContent = "-";
    compareSecondaryNameNode.textContent = "-";
    compareSecondaryMetaNode.textContent = "-";
    compareDeltasNode.innerHTML = "";
    return;
  }

  compareSectionNode.hidden = false;
  compareBadgeNode.textContent = `Même résolution H3 • R${state.resolution}`;
  compareSummaryNode.textContent = "Chargement de la comparaison…";
  compareDeltasNode.innerHTML = "";

  const primaryMetrics = buildCommuneMetrics(currentCommuneFeature, currentStudyFeatures);
  comparePrimaryNameNode.textContent = primaryMetrics.name;
  comparePrimaryMetaNode.textContent = `${formatNumber(primaryMetrics.hexCount)} hexagones • ${primaryMetrics.coverageTop?.label ?? "Sans donnée"} / ${primaryMetrics.usageTop?.label ?? "Sans donnée"}`;

  try {
    const secondaryMetrics = await getCommuneMetrics(state.compareCommuneCode);
    if (requestId !== compareRequestId || !secondaryMetrics) {
      return;
    }

    compareSecondaryNameNode.textContent = secondaryMetrics.name;
    compareSecondaryMetaNode.textContent = `${formatNumber(secondaryMetrics.hexCount)} hexagones • ${secondaryMetrics.coverageTop?.label ?? "Sans donnée"} / ${secondaryMetrics.usageTop?.label ?? "Sans donnée"}`;

    const deltas = [
      ["Agriculture", "Part agricole", primaryMetrics.keyShares.agriculture - secondaryMetrics.keyShares.agriculture],
      ["Forêt", "Part forestière", primaryMetrics.keyShares.forest - secondaryMetrics.keyShares.forest],
      ["Artificialisation", "Part artificialisée", primaryMetrics.keyShares.artificial - secondaryMetrics.keyShares.artificial],
      ["Eau", "Part eau", primaryMetrics.keyShares.water - secondaryMetrics.keyShares.water]
    ];

    compareDeltasNode.innerHTML = "";
    currentCompareStudyFeatures = secondaryMetrics.features;
    updateCompareHexLayer();
    fitCurrentLayer();
    for (const [label, description, deltaValue] of deltas) {
      compareDeltasNode.appendChild(
        renderCompareDeltaRow(label, description, deltaValue, primaryMetrics.name, secondaryMetrics.name)
      );
    }

    compareSummaryNode.textContent =
      `${primaryMetrics.name} sert de référence. Un écart positif signifie que ${primaryMetrics.name} a une part plus élevée que ${secondaryMetrics.name}. ${buildCompareNarrative(primaryMetrics, secondaryMetrics, deltas)}`;
  } catch (error) {
    if (requestId !== compareRequestId) {
      return;
    }

    compareSummaryNode.textContent = "Impossible de charger la comparaison communale.";
    compareSecondaryNameNode.textContent = "-";
    compareSecondaryMetaNode.textContent = "-";
    compareDeltasNode.innerHTML = "";
    currentCompareStudyFeatures = [];
    currentCompareVisibleFeatures = [];
    updateCompareHexLayer();
  }
}

function getStudyFeatures() {
  if (!currentData) {
    return [];
  }

  const bounds = getCurrentStudyBounds();
  if (!bounds) {
    return currentData.features;
  }

  return currentData.features.filter((feature) => isFeatureInsideBounds(feature, bounds));
}

function populateClassFilter() {
  if (!currentData) {
    return;
  }

  currentStudyFeatures = getStudyFeatures();
  currentFocusFeatures = getFocusFeatures(currentStudyFeatures, state.colorMode);
  currentFilterOptions = groupFeatures(currentFocusFeatures, state.colorMode);
  if (state.classFilter && !currentFilterOptions.some((entry) => entry.label === state.classFilter)) {
    state.classFilter = null;
  }
  classFilterLabelNode.textContent = state.classFilter ?? "Toutes les classes";
  renderFilterMenu();
}

function renderLegend(allFeatures) {
  legendNode.innerHTML = "";

  const totalCount = allFeatures.length;
  const activeFilter = getSelectedFilter();
  const entries = groupFeatures(allFeatures, getActiveMode());

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = "legend-button";
  allButton.dataset.active = activeFilter ? "false" : "true";
  allButton.innerHTML = `
    <span class="legend-swatch" style="background:linear-gradient(135deg, #d8d0b8, #6e563f)"></span>
    <span class="legend-label">Toutes les classes</span>
    <span class="legend-count">${formatNumber(totalCount)}</span>
  `;
  allButton.addEventListener("click", () => {
    state.classFilter = null;
    classFilterLabelNode.textContent = "Toutes les classes";
    renderFilterMenu();
    refreshView();
  });
  legendNode.appendChild(allButton);

  for (const entry of entries) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "legend-button";
    button.dataset.active = activeFilter === entry.label ? "true" : "false";
    button.innerHTML = `
      <span class="legend-swatch" style="background:${escapeHtml(entry.color)}"></span>
      <span class="legend-label">${escapeHtml(entry.label)}</span>
      <span class="legend-count">${formatNumber(entry.count)}</span>
    `;
    button.addEventListener("click", () => {
      state.classFilter = entry.label;
      classFilterLabelNode.textContent = entry.label;
      renderFilterMenu();
      refreshView();
    });
    legendNode.appendChild(button);
  }

  updateLegendResetButton();
}

function renderRanking(visibleFeatures) {
  rankingNode.innerHTML = "";

  if (!visibleFeatures.length) {
    rankingTitleNode.textContent = "Répartition dominante";
    rankingBadgeNode.textContent = "Aucune donnée";
    rankingNoteNode.textContent = "Aucun hexagone ne correspond au filtre en cours.";
    return;
  }

  const entries = groupFeatures(visibleFeatures, state.colorMode).slice(0, 6);
  const total = visibleFeatures.length;

  rankingTitleNode.textContent = "Répartition dominante";
  rankingBadgeNode.textContent = `Top ${entries.length}`;
  rankingNoteNode.textContent =
    state.focusMode === "artificialization"
      ? `Part des hexagones artificialisés par ${getModeLabel(state.colorMode)} dans la zone affichée.`
      : `Part des hexagones par ${getModeLabel(state.colorMode)} dans la zone affichée.`;

  for (const entry of entries) {
    const share = (entry.count / total) * 100;
    const row = document.createElement("div");
    row.className = "ranking-row";
    row.innerHTML = `
      <div class="ranking-head">
        <div class="ranking-label">
          <span class="legend-swatch" style="background:${escapeHtml(entry.color)}"></span>
          <span>${escapeHtml(entry.label)}</span>
        </div>
        <strong>${formatPercent(share)}</strong>
      </div>
      <div class="ranking-track">
        <div class="ranking-fill" style="width:${share}%; background:${escapeHtml(entry.color)}"></div>
      </div>
    `;
    rankingNode.appendChild(row);
  }
}

function renderIndicator(valueNode, share) {
  valueNode.textContent = formatPercent(share);
}

function renderIndicators(features) {
  if (!features.length) {
    renderIndicator(agricultureIndicatorNode, 0);
    renderIndicator(forestIndicatorNode, 0);
    renderIndicator(artificialIndicatorNode, 0);
    renderIndicator(waterIndicatorNode, 0);
    return;
  }

  const total = features.length;
  const agricultureShare = (features.filter((feature) => feature.properties.label_us === "Agriculture").length / total) * 100;
  const forestShare = (features.filter((feature) => FOREST_COVER_LABELS.has(feature.properties.label_cs)).length / total) * 100;
  const artificialShare = (features.filter(isArtificializedFeature).length / total) * 100;
  const waterShare = (features.filter((feature) => feature.properties.label_cs === "Surfaces d'eau").length / total) * 100;

  renderIndicator(agricultureIndicatorNode, agricultureShare);
  renderIndicator(forestIndicatorNode, forestShare);
  renderIndicator(artificialIndicatorNode, artificialShare);
  renderIndicator(waterIndicatorNode, waterShare);
}

function renderComparisonColumn(node, features, mode) {
  node.innerHTML = "";

  if (!features.length) {
    node.innerHTML = `<p class="hint">Aucune donnée disponible.</p>`;
    return;
  }

  const entries = groupFeatures(features, mode).slice(0, 3);
  const total = features.length;

  for (const entry of entries) {
    const share = (entry.count / total) * 100;
    const row = document.createElement("div");
    row.className = "comparison-row";
    row.innerHTML = `
      <div class="comparison-row-head">
        <div class="comparison-row-label">
          <span class="legend-swatch" style="background:${escapeHtml(entry.color)}"></span>
          <span>${escapeHtml(entry.label)}</span>
        </div>
        <strong>${formatPercent(share)}</strong>
      </div>
      <div class="comparison-row-track">
        <div class="comparison-row-fill" style="width:${share}%; background:${escapeHtml(entry.color)}"></div>
      </div>
    `;
    node.appendChild(row);
  }
}

function renderCoverageUsageComparison(features) {
  renderComparisonColumn(comparisonCoverageNode, features, "coverage");
  renderComparisonColumn(comparisonUsageNode, features, "usage");
}

function renderScopeSummary() {
  const dataset = getScopeConfig();
  const summary = currentSummary;
  const featureCount = currentStudyFeatures.length;
  const resolution = currentData?.features[0]?.properties?.resolution ?? summary?.resolution ?? "-";
  const dissolvedCount = summary?.source_feature_count ?? "-";
  const polygonCount = summary?.source_polygon_count ?? "-";
  const collisions = summary?.collisions ?? null;
  const conflictCells = summary?.conflict_cells ?? null;
  const conflictResolution = summary?.conflict_resolution ?? null;
  const inferredFillCount = summary?.inferred_fill_count ?? summary?.inferred_study_fill_count ?? null;
  const quality = getQualityMetrics();

  scopeBadgeNode.textContent = state.scope === "commune" ? `Commune: ${getCurrentCommuneName()}` : dataset.label;

  if (!summary) {
    scopeSummaryNode.textContent = "Métadonnées indisponibles pour cette couche.";
    qualityScoreNode.textContent = "-";
    inferredRateNode.textContent = "-";
    return;
  }

  const collisionSentence =
    collisions > 0
      ? `${formatNumber(conflictCells ?? collisions)} cellules ont nécessité un arbitrage H3, résolu par surface dominante${conflictResolution === "max_intersection_area" ? " dans l'hexagone" : ""}.`
      : "Aucun conflit d'affectation n'a été détecté.";
  const fillSentence =
    inferredFillCount > 0
      ? `${formatNumber(inferredFillCount)} cellules internes ont ensuite ete comblees pour limiter les trous visibles.`
      : "";

  qualityScoreNode.textContent = quality.reliabilityLabel;
  inferredRateNode.textContent =
    quality.inferredCount > 0
      ? `${formatPercent(quality.inferredRate)} (${formatNumber(quality.inferredCount)})`
      : "0%";

  scopeSummaryNode.textContent =
    `${state.scope === "commune" ? `Emprise autour de ${getCurrentCommuneName()}` : dataset.label} • ${formatNumber(featureCount)} hexagones en résolution ${resolution}, issus de ${formatNumber(dissolvedCount)} couples couverture/usage et de ${formatNumber(polygonCount)} polygones sources. ${collisionSentence} ${fillSentence}`.trim();
}

function renderAnalysis(visibleFeatures) {
  if (!visibleFeatures.length) {
    analysisSummaryNode.textContent = "Aucun hexagone ne correspond au filtre actif.";
    return;
  }

  const mode = state.colorMode;
  const entries = groupFeatures(visibleFeatures, mode);
  const total = visibleFeatures.length;
  const top = entries[0];
  const second = entries[1] ?? null;
  const topShare = (top.count / total) * 100;
  const secondShare = second ? (second.count / total) * 100 : 0;

  if (mode === "coverage") {
    const builtCount = visibleFeatures.filter((feature) =>
      ["Zones bâties", "Zones non bâties"].includes(feature.properties.label_cs)
    ).length;
    const waterCount = visibleFeatures.filter((feature) => feature.properties.label_cs === "Surfaces d'eau").length;
    const builtShare = (builtCount / total) * 100;
    const waterShare = (waterCount / total) * 100;
    const secondSentence = second
      ? `La deuxième composante est ${second.label.toLowerCase()} (${formatPercent(secondShare)}).`
      : "";
    const builtSentence =
      builtCount > 0
        ? `Les classes bâties ou artificialisées représentent ${formatPercent(builtShare)} des hexagones visibles.`
        : "Les classes bâties restent absentes de la sélection courante.";
    const waterSentence =
      waterCount > 0
        ? `L'eau représente ${formatPercent(waterShare)} de la zone visible.`
        : "L'eau reste très marginale dans cette vue.";

    analysisSummaryNode.textContent =
      `${state.focusMode === "artificialization" ? "Dans le focus artificialisation, " : "En couverture du sol, "}la zone affichée est dominée par ${top.label.toLowerCase()} (${formatPercent(topShare)}). ${secondSentence} ${builtSentence} ${waterSentence}`.trim();
    return;
  }

  const residentialCount = visibleFeatures.filter((feature) => feature.properties.label_us === "Usage résidentiel").length;
  const roadCount = visibleFeatures.filter((feature) => feature.properties.label_us === "Réseaux routiers").length;
  const residentialShare = (residentialCount / total) * 100;
  const roadShare = (roadCount / total) * 100;
  const secondSentence = second
    ? `Le second usage visible est ${second.label.toLowerCase()} (${formatPercent(secondShare)}).`
    : "";
  const residentialSentence =
    residentialCount > 0
      ? `L'usage résidentiel occupe ${formatPercent(residentialShare)} des hexagones visibles.`
      : "L'usage résidentiel reste négligeable dans cette vue.";
  const roadSentence =
    roadCount > 0
      ? `Les réseaux routiers représentent ${formatPercent(roadShare)} de la sélection.`
      : "Les réseaux routiers restent discrets dans cette sélection.";

  analysisSummaryNode.textContent =
    `${state.focusMode === "artificialization" ? "Dans le focus artificialisation, " : "En usage du sol, "}la zone affichée est dominée par ${top.label.toLowerCase()} (${formatPercent(topShare)}). ${secondSentence} ${residentialSentence} ${roadSentence}`.trim();
}

function updateStats(visibleFeatures) {
  const total = currentFocusFeatures.length;
  const visible = visibleFeatures.length;
  const visibleClassCount = new Set(visibleFeatures.map((feature) => getCurrentLabel(feature))).size;
  const resolution = currentData?.features[0]?.properties?.resolution ?? currentSummary?.resolution ?? "-";
  const collisions = currentSummary?.collisions ?? null;
  const conflictCells = currentSummary?.conflict_cells ?? null;
  const inferredFillCount = currentSummary?.inferred_fill_count ?? currentSummary?.inferred_study_fill_count ?? null;
  const quality = getQualityMetrics();

  hexCountNode.textContent = formatNumber(visible);
  hexCountMetaNode.textContent =
    visible === total
      ? `${formatNumber(total)} ${state.focusMode === "artificialization" ? "dans le focus" : "dans la couche"}`
      : `${formatNumber(total)} au total`;
  resolutionNode.textContent = String(resolution);
  visibleClassCountNode.textContent = formatNumber(visibleClassCount);
  collisionCountNode.textContent = collisions == null ? "-" : formatNumber(collisions);
  collisionMetaNode.textContent =
    collisions == null
      ? "Métadonnées non chargées"
      : collisions > 0
        ? inferredFillCount > 0
          ? `${formatNumber(conflictCells ?? collisions)} arbitrages • ${formatNumber(inferredFillCount)} comblements`
          : `${formatNumber(conflictCells ?? collisions)} arbitrages par surface`
        : "Aucun conflit détecté";
}

function getVisibleFeatures() {
  if (!state.classFilter) {
    return currentFocusFeatures;
  }
  return currentFocusFeatures.filter((feature) => getCurrentLabel(feature) === state.classFilter);
}

function bindFeatureInteraction(feature, layer, mode) {
  currentLayerByIndex.set(feature.properties.h3_index, layer);
}

function updateBasemapLayer() {
  if (currentBasemapLayer) {
    currentBasemapLayer.remove();
  }
  currentBasemapLayer = createBasemapLayer(state.basemap).addTo(map);
}

function updateStudyAreaLayer() {
  if (currentStudyLayer) {
    currentStudyLayer.remove();
    currentStudyLayer = null;
  }

  const bounds = getCurrentStudyBounds();
  if (!bounds) {
    return;
  }

  currentStudyLayer = L.rectangle(bounds, {
    pane: "studyPane",
    color: "#7c654c",
    weight: 1.2,
    opacity: 0.5,
    fill: false,
    dashArray: "4 6",
    interactive: false
  }).addTo(map);
}

function updateCommuneBoundaryLayer() {
  if (currentCommuneLayer) {
    currentCommuneLayer.remove();
    currentCommuneLayer = null;
  }

  if (state.scope !== "commune" || !currentCommuneFeature) {
    return;
  }

  currentCommuneLayer = L.geoJSON(
    {
      type: "FeatureCollection",
      features: [currentCommuneFeature]
    },
    {
    pane: "boundaryPane",
    style: {
      color: "#5e3d23",
      weight: 2.2,
      opacity: 0.9,
      fill: false,
      dashArray: "5 4"
    },
      interactive: false
    }
  ).addTo(map);

  currentCommuneLayer.bringToFront();
}

function updateCompareCommuneLayer() {
  if (currentCompareCommuneLayer) {
    currentCompareCommuneLayer.remove();
    currentCompareCommuneLayer = null;
  }

  if (state.scope !== "commune" || !state.compareCommuneCode || state.compareCommuneCode === state.selectedCommuneCode) {
    return;
  }

  const compareFeature = getCommuneByCode(state.compareCommuneCode);
  if (!compareFeature) {
    return;
  }

  currentCompareCommuneLayer = L.geoJSON(
    {
      type: "FeatureCollection",
      features: [compareFeature]
    },
    {
      pane: "compareBoundaryPane",
      style: {
        color: "#2f628d",
        weight: 2,
        opacity: 0.82,
        fill: true,
        fillColor: "#8db6d9",
        fillOpacity: 0.05,
        dashArray: "7 5"
      },
      interactive: false
    }
  ).addTo(map);
}

function getCompareDisplayFeatures(features) {
  const focusFeatures = getFocusFeatures(features, state.colorMode);
  if (!state.classFilter) {
    return focusFeatures;
  }

  return focusFeatures.filter((feature) => getCurrentLabel(feature) === state.classFilter);
}

function styleCompareFeature(feature) {
  const baseStyle = styleFeature(feature, state.curtainMode ? "curtain" : state.colorMode);
  return {
    ...baseStyle,
    color: "#2f628d",
    opacity: Math.max(baseStyle.opacity, 0.5),
    weight: Math.max(baseStyle.weight, 0.8),
    dashArray: "4 2",
    fillOpacity: Math.max(0.18, baseStyle.fillOpacity - 0.22)
  };
}

function updateCompareHexLayer() {
  if (currentCompareHexLayer) {
    currentCompareHexLayer.remove();
    currentCompareHexLayer = null;
  }

  currentCompareVisibleFeatures = [];

  if (state.scope !== "commune" || !state.compareCommuneCode || state.compareCommuneCode === state.selectedCommuneCode) {
    return;
  }

  const compareMetrics = compareMetricsCache.get(`${state.compareCommuneCode}|${state.resolution}`);
  if (!compareMetrics?.features?.length) {
    return;
  }

  currentCompareStudyFeatures = compareMetrics.features;
  currentCompareVisibleFeatures = getCompareDisplayFeatures(compareMetrics.features);

  if (!state.layerVisible || !currentCompareVisibleFeatures.length) {
    return;
  }

  currentCompareHexLayer = L.geoJSON(
    {
      type: "FeatureCollection",
      features: currentCompareVisibleFeatures
    },
    {
      pane: "compareHexPane",
      style: styleCompareFeature,
      onEachFeature: (feature, layer) => {
        layer.options.__baseStyle = styleCompareFeature(feature);
        bindFeatureInteraction(feature, layer, state.curtainMode ? "curtain" : state.colorMode);
      }
    }
  ).addTo(map);
}

function clearRenderedLayers() {
  currentLayerByIndex = new Map();
  clearHexHover();
  currentCompareVisibleFeatures = [];
  if (currentLayer) {
    currentLayer.remove();
    currentLayer = null;
  }
  if (currentCoverageLayer) {
    currentCoverageLayer.remove();
    currentCoverageLayer = null;
  }
  if (currentUsageLayer) {
    currentUsageLayer.remove();
    currentUsageLayer = null;
  }
  if (currentCompareHexLayer) {
    currentCompareHexLayer.remove();
    currentCompareHexLayer = null;
  }
}

function updateLayerStyles(layerGroup, mode) {
  if (!layerGroup) {
    return;
  }

  layerGroup.eachLayer((layer) => {
    if (!layer.feature || typeof layer.setStyle !== "function") {
      return;
    }
    const baseStyle = styleFeature(layer.feature, mode);
    layer.options.__baseStyle = baseStyle;
    layer.setStyle(baseStyle);
  });
}

function updateRenderedLayerStyles() {
  updateLayerStyles(currentLayer, state.curtainMode ? "curtain" : state.colorMode);
  updateLayerStyles(currentCompareHexLayer, state.curtainMode ? "curtain" : state.colorMode);
  applyCurtainClip();
}

function renderGeoJsonLayer(features, mode, { renderer = null } = {}) {
  const layer = L.geoJSON(
    {
      type: "FeatureCollection",
      features
    },
    {
      renderer,
      style: (feature) => {
        const baseStyle = styleFeature(feature, mode);
        return baseStyle;
      },
      onEachFeature: (feature, layer) => {
        layer.options.__baseStyle = styleFeature(feature, mode);
        bindFeatureInteraction(feature, layer, mode);
      }
    }
  ).addTo(map);

  return layer;
}

function renderLayer(features, { fitBounds = false } = {}) {
  clearRenderedLayers();

  if (!features.length) {
    currentBounds = null;
    applyCurtainClip();
    setStatus("Aucun hexagone ne correspond à ce filtre.");
    return;
  }

  currentBounds = calculateBounds(features);

  if (!state.layerVisible) {
    applyCurtainClip();
    if (fitBounds) {
      fitCurrentLayer();
    }
    return;
  }

  if (state.curtainMode) {
    currentLayer = renderGeoJsonLayer(features, "curtain");
    applyCurtainClip();
  } else {
    currentLayer = renderGeoJsonLayer(features, state.colorMode);
  }

  updateCompareHexLayer();

  if (fitBounds) {
    fitCurrentLayer();
  }
}

function refreshView({ fitBounds = false } = {}) {
  if (!currentData) {
    return;
  }

  currentStudyFeatures = getStudyFeatures();
  currentFocusFeatures = getFocusFeatures(currentStudyFeatures);
  currentVisibleFeatures = getVisibleFeatures();
  updateMapContext(currentVisibleFeatures);
  renderLayer(currentVisibleFeatures, { fitBounds });
  updateStats(currentVisibleFeatures);
  renderLegend(currentFocusFeatures);
  renderIndicators(currentStudyFeatures);
  renderCoverageUsageComparison(currentStudyFeatures);
  renderRanking(currentVisibleFeatures);
  renderScopeSummary();
  renderAnalysis(currentVisibleFeatures);
  renderCompareSection();
  renderFilterMenu();
  updateLegendResetButton();
  updateZoomSuggestion();

  const filterLabel = state.classFilter;
  const visibilityMessage = state.layerVisible ? "couche visible" : "couche masquée";
  const scopeStatusLabel = getScopeStatusLabel();
  const readyMessage = filterLabel
    ? `Affichage prêt: ${scopeStatusLabel} • ${visibilityMessage} • filtre ${filterLabel}`
    : `Affichage prêt: ${scopeStatusLabel} • ${visibilityMessage}`;
  setStatus(currentVisibleFeatures.length ? readyMessage : "Aucun résultat pour ce filtre.");
}

async function fetchJson(url, { force = false, signal } = {}) {
  if (!force && cache.has(url)) {
    return cache.get(url);
  }

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} sur ${url}`);
  }

  const data = await response.json();
  cache.set(url, data);
  return data;
}

async function loadDatasetData(dataset, { force = false, signal, studyBounds = getCurrentStudyBounds(), showLoading = false } = {}) {
  if (state.scope !== "commune" || !studyBounds || !dataset.chunkIndexUrl) {
    return fetchJson(dataset.dataUrl, { force, signal });
  }

  const manifest = await fetchJson(dataset.chunkIndexUrl, { force, signal });
  const plainBounds = boundsToPlainObject(studyBounds);
  const matchingChunks = manifest.chunks.filter((chunk) => doBoundsIntersect(chunk.bbox, plainBounds));

  if (!matchingChunks.length) {
    return {
      type: "FeatureCollection",
      features: [],
      studyScoped: true
    };
  }

  const manifestUrl = new URL(dataset.chunkIndexUrl, window.location.href);
  if (showLoading) {
    setMapLoading(true, `${matchingChunks.length} tuiles spatiales chargees pour ${getCurrentCommuneName()} en resolution ${state.resolution}.`);
  }

  const collections = await Promise.all(
    matchingChunks.map((chunk) => fetchJson(new URL(chunk.path, manifestUrl).toString(), { force, signal }))
  );

  return mergeChunkCollections(collections);
}

function getAdjacentResolutions() {
  const available = getAvailableResolutions().map(([resolution]) => resolution);
  const currentIndex = available.indexOf(state.resolution);
  if (currentIndex === -1) {
    return [];
  }

  return [available[currentIndex - 1], available[currentIndex + 1]].filter(Boolean);
}

function prefetchAdjacentDatasetData() {
  if (state.scope !== "commune") {
    return;
  }

  const studyBounds = getCurrentStudyBounds();
  if (!studyBounds) {
    return;
  }

  for (const resolution of getAdjacentResolutions()) {
    const dataset = DATASETS.yonne.resolutions[resolution];
    if (!dataset) {
      continue;
    }

    loadDatasetData(dataset, { studyBounds }).catch(() => {
      // Silent prefetch: the active request should remain the only visible source of truth.
    });
  }
}

async function loadDataset({ force = false, fitBounds = true } = {}) {
  if (force) {
    compareMetricsCache.clear();
  }

  const requestId = ++loadRequestId;
  activeLoadController?.abort();
  activeLoadController = new AbortController();
  const scopeConfig = getScopeConfig();
  const dataset = getCurrentDatasetConfig();
  const loadingLabel = state.scope === "commune" ? `la zone autour de ${getCurrentCommuneName()}` : scopeConfig.label.toLowerCase();
  const loadingDetail = `Chargement en resolution ${state.resolution}${state.scope === "commune" ? ` autour de ${getCurrentCommuneName()}` : " sur l'Yonne"}.`;
  setStatus(`Chargement de ${loadingLabel}...`);
  setMapLoading(true, loadingDetail);

  try {
    const [data, summary] = await Promise.all([
      loadDatasetData(dataset, { force, signal: activeLoadController.signal, showLoading: true }),
      fetchJson(dataset.summaryUrl, { force, signal: activeLoadController.signal }).catch(() => null)
    ]);

    if (requestId !== loadRequestId) {
      return;
    }

    currentData = data;
    currentSummary = summary;
    clearHoverCommune();
    renderResolutionMenu();
    populateClassFilter();
    updateStudyAreaLayer();
    refreshView({ fitBounds });
    updateCommuneBoundaryLayer();
    updateCompareCommuneLayer();
    prefetchAdjacentDatasetData();
  } catch (error) {
    if (requestId !== loadRequestId) {
      return;
    }
    if (error?.name === "AbortError") {
      return;
    }
    currentData = null;
    currentSummary = null;
    currentBounds = null;
    currentFilterOptions = [];
    if (currentLayer) {
      currentLayer.remove();
      currentLayer = null;
    }
    legendNode.innerHTML = "";
    rankingNode.innerHTML = "";
    resolutionMenu.innerHTML = "";
    classFilterMenu.innerHTML = "";
    scopeSummaryNode.textContent = "Impossible de charger le dataset demandé.";
    analysisSummaryNode.textContent = "Impossible de produire l'analyse de zone.";
    setStatus(`Impossible de charger ${state.scope}. Génère d'abord le dataset.`, true);
  } finally {
    if (requestId === loadRequestId) {
      activeLoadController = null;
      setMapLoading(false);
    }
  }
}

function activateTab(tabName) {
  for (const button of tabButtons) {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  }

  for (const panel of tabPanels) {
    const isActive = panel.dataset.tabPanel === tabName;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  }
}

for (const button of scopeButtons) {
  button.addEventListener("click", () => {
    if (state.scope === button.dataset.scope) {
      return;
    }
    state.scope = button.dataset.scope;
    ensureResolutionForCurrentScope();
    syncToggleButtons();
    closeFilterMenu();
    closeResolutionMenu();
    closeCommuneSuggestions();
    updateStudyAreaLayer();
    updateCommuneBoundaryLayer();
    loadDataset({ fitBounds: true });
  });
}

for (const button of colorModeButtons) {
  button.addEventListener("click", () => {
    if (state.colorMode === button.dataset.colorMode) {
      return;
    }
    state.colorMode = button.dataset.colorMode;
    syncToggleButtons();
    populateClassFilter();
    closeFilterMenu();
    refreshView();
  });
}

for (const button of focusModeButtons) {
  button.addEventListener("click", () => {
    if (state.focusMode === button.dataset.focusMode) {
      return;
    }
    state.focusMode = button.dataset.focusMode;
    syncToggleButtons();
    populateClassFilter();
    closeFilterMenu();
    refreshView();
  });
}

visibilityToggle.addEventListener("change", () => {
  state.layerVisible = visibilityToggle.checked;
  updateVisibilityLabel();
  refreshView();
});

communeSearchInput.addEventListener("focus", () => {
  prepareCommuneInputForTyping();
  renderCommuneSuggestions("", {
    showAll: true,
    highlightedCode: state.selectedCommuneCode
  });
});

communeSearchInput.addEventListener("click", () => {
  prepareCommuneInputForTyping();
  renderCommuneSuggestions("", {
    showAll: true,
    highlightedCode: state.selectedCommuneCode
  });
});

communeSearchInput.addEventListener("input", () => {
  renderCommuneSuggestions(communeSearchInput.value);
});

communeSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();

    if (communeSuggestionsNode.hidden) {
      renderCommuneSuggestions(communeSearchInput.value, {
        showAll: !communeSearchInput.value.trim(),
        highlightedCode: state.selectedCommuneCode
      });
    }

    if (!currentSuggestionFeatures.length) {
      return;
    }

    const direction = event.key === "ArrowDown" ? 1 : -1;
    const optionsCount = currentSuggestionFeatures.length;
    const nextIndex =
      currentSuggestionIndex === -1
        ? direction > 0 ? 0 : optionsCount - 1
        : (currentSuggestionIndex + direction + optionsCount) % optionsCount;

    setActiveCommuneSuggestion(nextIndex);
    return;
  }

  if (event.key === "Escape") {
    closeCommuneSuggestions();
    communeSearchInput.value = getCurrentCommuneName();
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  const activeSuggestion = currentSuggestionFeatures[currentSuggestionIndex];
  const [firstMatch] = getFilteredCommunes(communeSearchInput.value);
  const selectedSuggestion = activeSuggestion ?? firstMatch;
  if (selectedSuggestion) {
    selectCommune(selectedSuggestion.properties.code);
    closeCommuneSuggestions();
  }
});

communeSearchInput.addEventListener("blur", () => {
  window.setTimeout(() => {
    if (!communeSearchInput.value.trim()) {
      communeSearchInput.value = getCurrentCommuneName();
    }
    closeCommuneSuggestions();
  }, 120);
});

compareCommuneSearchInput.addEventListener("focus", () => {
  prepareCompareCommuneInputForTyping();
  renderCompareCommuneSuggestions("", {
    showAll: true,
    highlightedCode: state.compareCommuneCode
  });
});

compareCommuneSearchInput.addEventListener("click", () => {
  prepareCompareCommuneInputForTyping();
  renderCompareCommuneSuggestions("", {
    showAll: true,
    highlightedCode: state.compareCommuneCode
  });
});

compareCommuneSearchInput.addEventListener("input", () => {
  renderCompareCommuneSuggestions(compareCommuneSearchInput.value);
});

compareCommuneSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();

    if (compareCommuneSuggestionsNode.hidden) {
      renderCompareCommuneSuggestions(compareCommuneSearchInput.value, {
        showAll: !compareCommuneSearchInput.value.trim(),
        highlightedCode: state.compareCommuneCode
      });
    }

    if (!currentCompareSuggestionFeatures.length) {
      return;
    }

    const direction = event.key === "ArrowDown" ? 1 : -1;
    const optionsCount = currentCompareSuggestionFeatures.length;
    const nextIndex =
      currentCompareSuggestionIndex === -1
        ? direction > 0 ? 0 : optionsCount - 1
        : (currentCompareSuggestionIndex + direction + optionsCount) % optionsCount;

    setActiveCompareCommuneSuggestion(nextIndex);
    return;
  }

  if (event.key === "Escape") {
    closeCompareCommuneSuggestions();
    compareCommuneSearchInput.value = state.compareCommuneCode
      ? getCommuneByCode(state.compareCommuneCode)?.properties?.nom ?? ""
      : "";
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  const activeSuggestion = currentCompareSuggestionFeatures[currentCompareSuggestionIndex];
  const [firstMatch] = getFilteredCommunes(compareCommuneSearchInput.value, {
    excludeCodes: [state.selectedCommuneCode]
  });
  const selectedSuggestion = activeSuggestion ?? firstMatch;
  if (selectedSuggestion) {
    selectCompareCommune(selectedSuggestion.properties.code);
    closeCompareCommuneSuggestions();
  }
});

compareCommuneSearchInput.addEventListener("blur", () => {
  window.setTimeout(() => {
    if (!compareCommuneSearchInput.value.trim()) {
      compareCommuneSearchInput.value = state.compareCommuneCode
        ? getCommuneByCode(state.compareCommuneCode)?.properties?.nom ?? ""
        : "";
    }
    closeCompareCommuneSuggestions();
  }, 120);
});

legendResetButton.addEventListener("click", () => {
  if (!state.classFilter) {
    return;
  }
  state.classFilter = null;
  classFilterLabelNode.textContent = "Toutes les classes";
  renderFilterMenu();
  refreshView();
});

clearFiltersButton.addEventListener("click", () => {
  resetFilters();
});

clearCompareButton.addEventListener("click", () => {
  selectCompareCommune(null);
  closeCompareCommuneSuggestions();
});

zoomSuggestionButton.addEventListener("click", () => {
  const suggestedResolution = zoomSuggestionButton.dataset.resolution;
  if (!suggestedResolution || suggestedResolution === state.resolution) {
    return;
  }

  state.resolution = suggestedResolution;
  syncToggleButtons();
  renderResolutionMenu();
  loadDataset({ fitBounds: false });
});

basemapButton.addEventListener("click", () => {
  closeFilterMenu();
  closeResolutionMenu();
  toggleBasemapMenu();
});

classFilterButton.addEventListener("click", () => {
  closeBasemapMenu();
  closeResolutionMenu();
  toggleFilterMenu();
});

resolutionButton.addEventListener("click", () => {
  closeBasemapMenu();
  closeFilterMenu();
  toggleResolutionMenu();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("#commune-picker")) {
    closeCommuneSuggestions();
  }
  if (!event.target.closest("#compare-commune-picker")) {
    closeCompareCommuneSuggestions();
  }
  if (!event.target.closest("#basemap-dropdown")) {
    closeBasemapMenu();
  }
  if (!event.target.closest("#class-filter-dropdown")) {
    closeFilterMenu();
  }
  if (!event.target.closest("#resolution-dropdown")) {
    closeResolutionMenu();
  }
});

opacityRange.addEventListener("input", () => {
  updateOpacityLabel();
  updateRenderedLayerStyles();
});

curtainToggle.addEventListener("change", () => {
  state.curtainMode = curtainToggle.checked;
  syncToggleButtons();
  refreshView({ fitBounds: false });
});

curtainHandleNode.addEventListener("pointerdown", startCurtainDrag);
curtainDividerNode.addEventListener("pointerdown", startCurtainDrag);

window.addEventListener("pointermove", (event) => {
  if (!isCurtainDragging) {
    return;
  }
  updateCurtainRatioFromClientX(event.clientX);
});

window.addEventListener("pointerup", () => {
  stopCurtainDrag();
});

window.addEventListener("pointercancel", () => {
  stopCurtainDrag();
});

map.on("zoomend", () => {
  updateRenderedLayerStyles();
  updateZoomSuggestion();
});

map.on("moveend", () => {
  if (!state.curtainMode) {
    return;
  }
  updateRenderedLayerStyles();
});

map.on("resize", () => {
  applyCurtainClip();
});

map.on("zoomstart", () => {
  clearHoverCommune();
});

map.on("mouseout", () => {
  clearHoverCommune();
  clearHexHover();
});

map.on("mousemove", (event) => {
  if (updateHexHover(event.latlng)) {
    return;
  }
  const hoveredCommune = findCommuneAtLatLng(event.latlng);
  updateHoverCommune(hoveredCommune, event.latlng);
});

map.on("click", (event) => {
  const clickedCommune = findCommuneAtLatLng(event.latlng);
  if (!clickedCommune) {
    return;
  }

  const previousScope = state.scope;

  if (previousScope !== "commune") {
    state.scope = "commune";
    ensureResolutionForCurrentScope();
    syncToggleButtons();
    renderResolutionMenu();
  }

  if (previousScope === "commune" && state.selectedCommuneCode === clickedCommune.properties.code) {
    return;
  }

  selectCommune(clickedCommune.properties.code, { fitBounds: true });
});

reloadButton.addEventListener("click", () => {
  loadDataset({ force: true, fitBounds: true });
});

fitButton.addEventListener("click", () => {
  fitCurrentLayer();
});

for (const button of tabButtons) {
  button.addEventListener("click", () => {
    activateTab(button.dataset.tab);
  });
}

updateOpacityLabel();
activateTab("summary");
renderBasemapMenu();
closeBasemapMenu();
closeFilterMenu();
closeResolutionMenu();
stopMapToolbarEventPropagation();

async function initializeViewer() {
  try {
    await loadCommunes();
  } catch (error) {
    communeMetaNode.textContent = "Impossible de charger la liste des communes.";
  }

  ensureResolutionForCurrentScope();
  syncToggleButtons();
  renderResolutionMenu();
  updateStudyAreaLayer();
  updateCommuneBoundaryLayer();
  updateCompareCommuneLayer();
  await loadDataset({ fitBounds: true });
}

initializeViewer();
