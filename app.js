const svg = document.getElementById("map");
const routeDefs = document.getElementById("route-defs");
const routesLayer = document.getElementById("routes-layer");
const markersLayer = document.getElementById("markers-layer");

const chapterSelect = document.getElementById("chapter-select");
const playStoryButton = document.getElementById("play-story");
const playPauseButton = document.getElementById("play-pause");
const previousButton = document.getElementById("previous-chapter");
const nextButton = document.getElementById("next-chapter");
const waypointLog = document.getElementById("waypoint-log");
const undoWaypointButton = document.getElementById("undo-waypoint");
const clearWaypointsButton = document.getElementById("clear-waypoints");
const copyWaypointsButton = document.getElementById("copy-waypoints");

const MAP_WIDTH = 4266.6665;
const MAP_HEIGHT = 3200;
const VIEW_ASPECT = MAP_HEIGHT / MAP_WIDTH;
const MARKER_REFERENCE_WIDTH = 1250;
const COMPACT_LABEL_VIEW_WIDTH = 3000;
const CAMERA_POSITION_KEYFRAMES = 5;

const fullView = {
  x: 0,
  y: 0,
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
};

function centeredView(x, y, width) {
  const height = width * VIEW_ASPECT;
  return {
    x: x - width / 2,
    y: y - height / 2,
    width,
    height,
  };
}

const locations = {
  1: {
    roman: "I",
    title: "The Council of CIT",
    x: 2069.5,
    y: 846.9,
    view: centeredView(2069.5, 846.9, 950),
  },
  2: {
    roman: "II",
    title: "Concerning Docker",
    x: 1095.9,
    y: 880.2,
    view: centeredView(1095.9, 880.2, 950),
  },
  3: {
    roman: "III",
    title: "An Unexpected Container",
    x: 3014.4,
    y: 2144.1,
    view: centeredView(3014.4, 2144.1, 950),
  },
  4: {
    roman: "IV",
    title: "The Grey Havens of Harbor",
    x: 748.2,
    y: 847.0,
    view: centeredView(748.2, 847.0, 950),
  },
  5: {
    roman: "V",
    title: "A Short Cut to Kubernetes",
    x: 1303.4,
    y: 1018.9,
    view: centeredView(1303.4, 1018.9, 950),
  },
};

const chapters = {
  1: {
    from: 1,
    to: 2,
    duration: 8500,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 2069.5, y: 846.9 },
      { x: 1831.5, y: 838.8 },
      { x: 1751.6, y: 841.9 },
      { x: 1710.1, y: 808.7 },
      { x: 1671.8, y: 766.2 },
      { x: 1633.4, y: 699.8 },
      { x: 1588.8, y: 678.8 },
      { x: 1509.9, y: 670.5 },
      { x: 1471.5, y: 701.7 },
      { x: 1427.9, y: 739.0 },
      { x: 1432.1, y: 793.0 },
      { x: 1484.0, y: 815.8 },
      { x: 1525.5, y: 852.1 },
      { x: 1541.0, y: 881.2 },
      { x: 1547.3, y: 911.2 },
      { x: 1518.2, y: 940.3 },
      { x: 1452.8, y: 941.3 },
      { x: 1404.1, y: 939.3 },
      { x: 1380.2, y: 956.9 },
      { x: 1367.8, y: 991.1 },
      { x: 1353.2, y: 1023.3 },
      { x: 1337.7, y: 1065.8 },
      { x: 1286.8, y: 1073.1 },
      { x: 1245.3, y: 1071.0 },
      { x: 1174.8, y: 1033.7 },
      { x: 1143.7, y: 996.3 },
      { x: 1105.3, y: 956.9 },
      { x: 1085.6, y: 921.6 },
      { x: 1095.9, y: 880.2 },
    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.35, width: 1450 },
      { progress: 0.70, width: 1380 },
      { progress: 1.00, width: 950 },
    ],
  },

  2: {
    from: 2,
    to: 3,
    duration: 12000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 1095.9, y: 880.2 },
     { x: 1162.9, y: 866.2 },
      { x: 1216.1, y: 858.7 },
      { x: 1249.8, y: 860.2 },
      { x: 1262.6, y: 901.4 },
      { x: 1288.8, y: 932.2 },
      { x: 1306.8, y: 964.4 },
      { x: 1339.0, y: 1015.4 },
      { x: 1369.0, y: 1077.6 },
      { x: 1364.5, y: 1169.0 },
      { x: 1367.5, y: 1229.7 },
      { x: 1414.0, y: 1252.2 },
      { x: 1506.2, y: 1237.2 },
      { x: 1549.7, y: 1250.7 },
      { x: 1554.9, y: 1293.5 },
      { x: 1620.1, y: 1318.9 },
      { x: 1678.6, y: 1325.7 },
      { x: 1720.6, y: 1310.7 },
      { x: 1730.3, y: 1302.5 },
      { x: 1744.6, y: 1320.4 },
      { x: 1783.6, y: 1310.7 },
      { x: 1839.0, y: 1286.7 },
      { x: 1902.0, y: 1283.7 },
      { x: 1938.7, y: 1302.5 },
      { x: 1986.0, y: 1298.7 },
      { x: 2048.9, y: 1321.2 },
      { x: 2133.6, y: 1324.2 },
      { x: 2171.9, y: 1334.0 },
      { x: 2201.1, y: 1351.2 },
      { x: 2236.3, y: 1365.4 },
      { x: 2260.3, y: 1362.4 },
      { x: 2285.8, y: 1369.2 },
      { x: 2312.0, y: 1366.7 },
      { x: 2359.3, y: 1353.2 },
      { x: 2383.2, y: 1331.4 },
      { x: 2456.7, y: 1289.5 },
      { x: 2491.9, y: 1313.4 },
      { x: 2527.2, y: 1359.9 },
      { x: 2537.7, y: 1425.9 },
      { x: 2548.9, y: 1455.1 },
      { x: 2544.4, y: 1517.3 },
      { x: 2525.7, y: 1545.8 },
      { x: 2495.7, y: 1577.3 },
      { x: 2497.9, y: 1584.8 },
      { x: 2513.7, y: 1617.8 },
      { x: 2496.4, y: 1635.8 },
      { x: 2476.9, y: 1652.3 },
      { x: 2477.7, y: 1673.3 },
      { x: 2491.9, y: 1681.7 },
      { x: 2512.9, y: 1692.9 },
      { x: 2521.2, y: 1723.7 },
      { x: 2512.9, y: 1756.7 },
      { x: 2504.7, y: 1782.9 },
      { x: 2497.2, y: 1824.1 },
      { x: 2502.4, y: 1854.9 },
      { x: 2514.4, y: 1890.1 },
      { x: 2535.4, y: 1911.1 },
      { x: 2545.2, y: 1929.8 },
      { x: 2543.7, y: 1952.3 },
      { x: 2563.1, y: 1998.9 },
      { x: 2574.4, y: 2030.4 },
      { x: 2591.6, y: 2056.0 },
      { x: 2611.9, y: 2082.3 },
      { x: 2635.1, y: 2099.5 },
      { x: 2684.6, y: 2120.5 },
      { x: 2719.1, y: 2125.7 },
      { x: 2736.3, y: 2137.7 },
      { x: 2749.8, y: 2153.5 },
      { x: 2760.3, y: 2195.5 },
      { x: 2758.8, y: 2214.2 },
      { x: 2773.0, y: 2225.4 },
      { x: 2800.8, y: 2226.9 },
      { x: 2833.7, y: 2233.7 },
      { x: 2877.2, y: 2234.4 },
      { x: 2941.7, y: 2219.4 },
      { x: 2994.9, y: 2200.7 },
      { x: 3012.2, y: 2182.0 },
      { x: 3014.4, y: 2144.1 },
    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.20, width: 1550 },
      { progress: 0.45, width: 1750 },
      { progress: 0.72, width: 1700 },
      { progress: 1.00, width: 950 },
    ],
  },

  3: {
    from: 3,
    to: 4,
    duration: 13500,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 3014.4, y: 2144.1 },
     { x: 3034.0, y: 2195.7 },
      { x: 3043.4, y: 2244.4 },
      { x: 3052.7, y: 2299.4 },
      { x: 3020.6, y: 2335.7 },
      { x: 2970.7, y: 2350.3 },
      { x: 2942.7, y: 2335.7 },
      { x: 2907.5, y: 2327.4 },
      { x: 2850.4, y: 2312.9 },
      { x: 2818.2, y: 2287.0 },
      { x: 2781.9, y: 2272.5 },
      { x: 2758.1, y: 2256.9 },
      { x: 2728.0, y: 2246.5 },
      { x: 2682.3, y: 2312.9 },
      { x: 2668.8, y: 2356.5 },
      { x: 2638.7, y: 2395.9 },
      { x: 2617.0, y: 2438.5 },
      { x: 2573.4, y: 2461.3 },
      { x: 2511.1, y: 2467.5 },
      { x: 2464.4, y: 2491.4 },
      { x: 2429.2, y: 2490.3 },
      { x: 2387.7, y: 2472.7 },
      { x: 2364.8, y: 2435.3 },
      { x: 2320.2, y: 2462.3 },
      { x: 2290.1, y: 2463.4 },
      { x: 2228.9, y: 2470.6 },
      { x: 2199.9, y: 2460.2 },
      { x: 2169.8, y: 2437.4 },
      { x: 2145.9, y: 2412.1 },
      { x: 2109.6, y: 2391.3 },
      { x: 2078.5, y: 2332.2 },
      { x: 2081.6, y: 2252.3 },
      { x: 2089.9, y: 2213.9 },
      { x: 2101.3, y: 2179.7 },
      { x: 2103.4, y: 2098.0 },
      { x: 2104.4, y: 2054.4 },
      { x: 2103.4, y: 2006.7 },
      { x: 2077.3, y: 1958.7 },
      { x: 2052.6, y: 1935.4 },
      { x: 1982.7, y: 1935.4 },
      { x: 1892.1, y: 1968.3 },
      { x: 1822.1, y: 1987.5 },
      { x: 1625.1, y: 1956.5 },
      { x: 1538.0, y: 1978.3 },
      { x: 1438.2, y: 1907.5 },
      { x: 1396.5, y: 1840.4 },
      { x: 1358.4, y: 1722.5 },
      { x: 1382.0, y: 1651.3 },
      { x: 1507.2, y: 1544.3 },
      { x: 1498.1, y: 1475.3 },
      { x: 1460.0, y: 1413.6 },
      { x: 1421.9, y: 1399.1 },
      { x: 1291.3, y: 1371.5 },
      { x: 1209.6, y: 1358.8 },
      { x: 1149.7, y: 1339.9 },
      { x: 1086.2, y: 1318.1 },
      { x: 941.0, y: 1300.0 },
      { x: 870.3, y: 1319.9 },
      { x: 777.7, y: 1334.5 },
      { x: 750.5, y: 1277.1 },
      { x: 716.0, y: 1153.0 },
      { x: 685.2, y: 1114.5 },
      { x: 685.2, y: 1052.4 },
      { x: 708.8, y: 946.8 },
      { x: 741.4, y: 906.9 },
      { x: 748.2, y: 847.0 },
    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.16, width: 1550 },
      { progress: 0.36, width: 1800 },
      { progress: 0.56, width: 1900 },
      { progress: 0.76, width: 1750 },
      { progress: 0.90, width: 1450 },
      { progress: 1.00, width: 950 },
    ],
  },

  4: {
    from: 4,
    to: 5,
    duration: 9000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 748.2, y: 847.0 },
      { x: 850, y: 730 },
      { x: 1020, y: 760 },
      { x: 1170, y: 900 },
      { x: 1303.4, y: 1018.9 },
    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.28, width: 1400 },
      { progress: 0.58, width: 1400 },
      { progress: 0.82, width: 1325 },
      { progress: 1.00, width: 950 },
    ],
  },
};

const navigationOrder = ["intro", "1", "2", "3", "4", "all"];

const timing = {
  introHold: 2500,
  introZoom: 2000,
  markerReveal: 850,
  startHold: 900,
  overviewToStart: 1400,
  storyFinalHold: 900,
  storyFinalOverview: 2000,
};

const markerElements = new Map();
const routeElements = new Map();

let compactLabelsActive = null;

let selectedState = "intro";
let view = { ...fullView };
let drag = null;
let waypoints = [];

let animationRun = 0;
let currentFrameId = null;
let isAnimating = false;
let isPaused = false;
let isStoryPlaying = false;
let browseOverview = true;

function stateIsChapter(state) {
  return /^[1-4]$/.test(String(state));
}

function normalizeState(value) {
  const stringValue = String(value ?? "");
  return navigationOrder.includes(stringValue) ? stringValue : "intro";
}

function readInitialState() {
  const params = new URLSearchParams(window.location.search);
  const chapter = normalizeState(params.get("chapter"));
  const playParam = params.get("play");
  const play = playParam === "true";
  const playStoryFromUrl = playParam === "story";

  return { chapter, play, playStoryFromUrl };
}

function setUrlState(chapter, play, mode = "replace") {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("chapter", String(chapter));
    url.searchParams.set("play", play ? "true" : "false");

    if (mode === "push") {
      history.pushState({ chapter, play }, "", url);
    } else {
      history.replaceState({ chapter, play }, "", url);
    }
  } catch {
    // History API may be restricted for some local file URLs.
  }
}

function markerScale() {
  return view.width / MARKER_REFERENCE_WIDTH;
}

function setBackdropBounds(backdrop, bbox) {
  const padX = 5;
  const padY = 3;

  backdrop.setAttribute("x", String(bbox.x - padX));
  backdrop.setAttribute("y", String(bbox.y - padY));
  backdrop.setAttribute("width", String(bbox.width + padX * 2));
  backdrop.setAttribute("height", String(bbox.height + padY * 2));
}

function updateMarkerLabels(force = false) {
  const compact = view.width >= COMPACT_LABEL_VIEW_WIDTH;

  if (!force && compact === compactLabelsActive) return;
  compactLabelsActive = compact;

  for (const marker of markerElements.values()) {
    marker.label.textContent = compact
      ? marker.compactText
      : marker.fullText;

    setBackdropBounds(
      marker.backdrop,
      compact ? marker.compactBounds : marker.fullBounds
    );
  }
}

function updateMarkerScales() {
  const scale = markerScale();

  for (const [locationNumber, marker] of markerElements.entries()) {
    const location = locations[locationNumber];
    marker.group.setAttribute(
      "transform",
      `translate(${location.x} ${location.y}) scale(${scale})`
    );
  }
}

function applyView() {
  svg.setAttribute(
    "viewBox",
    `${view.x} ${view.y} ${view.width} ${view.height}`
  );
  updateMarkerScales();
  updateMarkerLabels();
}

function formatWaypoint(point) {
  return `{ x: ${point.x.toFixed(1)}, y: ${point.y.toFixed(1)} },`;
}

function renderWaypointLog() {
  waypointLog.value = waypoints.map(formatWaypoint).join("\n");
  waypointLog.scrollTop = waypointLog.scrollHeight;

  undoWaypointButton.disabled = waypoints.length === 0;
  clearWaypointsButton.disabled = waypoints.length === 0;
  copyWaypointsButton.disabled = waypoints.length === 0;
}

function addWaypoint(point) {
  waypoints.push({
    x: Number(point.x.toFixed(1)),
    y: Number(point.y.toFixed(1)),
  });
  renderWaypointLog();
}

function undoWaypoint() {
  if (waypoints.length === 0) return;
  waypoints.pop();
  renderWaypointLog();
}

function clearWaypoints() {
  waypoints = [];
  renderWaypointLog();
}

async function copyWaypoints() {
  if (waypoints.length === 0) return;

  const text = waypoints.map(formatWaypoint).join("\n");
  let copied = false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
  }

  if (!copied) {
    waypointLog.focus();
    waypointLog.select();

    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }

    window.getSelection()?.removeAllRanges();
  }

  const originalText = copyWaypointsButton.textContent;
  copyWaypointsButton.textContent = copied ? "Copied" : "Select";
  window.setTimeout(() => {
    copyWaypointsButton.textContent = originalText;
  }, 1000);
}

function svgPointFromClient(clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function easeInOut(t) {
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function interpolateView(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    width: a.width + (b.width - a.width) * t,
    height: a.height + (b.height - a.height) * t,
  };
}

function animateProgress(duration, onProgress, runId) {
  return new Promise((resolve) => {
    let elapsed = 0;
    let lastTime = performance.now();

    function frame(now) {
      if (runId !== animationRun) {
        currentFrameId = null;
        resolve(false);
        return;
      }

      if (isPaused) {
        lastTime = now;
        currentFrameId = requestAnimationFrame(frame);
        return;
      }

      elapsed += now - lastTime;
      lastTime = now;

      const progress = Math.min(elapsed / duration, 1);
      onProgress(progress);

      if (progress < 1) {
        currentFrameId = requestAnimationFrame(frame);
      } else {
        currentFrameId = null;
        resolve(true);
      }
    }

    currentFrameId = requestAnimationFrame(frame);
  });
}

function wait(duration, runId) {
  return animateProgress(duration, () => {}, runId);
}

function animateViewTo(target, duration, runId) {
  const start = { ...view };

  return animateProgress(
    duration,
    (progress) => {
      view = interpolateView(start, target, easeInOut(progress));
      applyView();
    },
    runId
  );
}

function zoomAtSvgPoint(point, factor) {
  view.x = point.x - (point.x - view.x) * factor;
  view.y = point.y - (point.y - view.y) * factor;
  view.width *= factor;
  view.height *= factor;
  applyView();
}

function splinePath(points, tension) {
  if (points.length < 2) return "";

  const d = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const c1x = p1.x + (p2.x - p0.x) * tension;
    const c1y = p1.y + (p2.y - p0.y) * tension;
    const c2x = p2.x - (p3.x - p1.x) * tension;
    const c2y = p2.y - (p3.y - p1.y) * tension;

    d.push(
      `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
    );
  }

  return d.join(" ");
}

function buildMarkers() {
  for (const [key, location] of Object.entries(locations)) {
    const locationNumber = Number(key);

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("chapter-marker");
    group.dataset.location = String(locationNumber);

    const backdrop = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    backdrop.classList.add("label-backdrop");
    backdrop.setAttribute("rx", "4");
    backdrop.setAttribute("ry", "4");

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.classList.add("anchor-dot");
    dot.setAttribute("cx", "0");
    dot.setAttribute("cy", "0");
    dot.setAttribute("r", "6");

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.classList.add("chapter-label");
    label.setAttribute("x", "14");
    label.setAttribute("y", "6");

    const fullText = `${location.roman} · ${location.title}`;
    const compactText = location.roman;

    label.textContent = fullText;
    group.append(backdrop, dot, label);
    markersLayer.appendChild(group);

    const fullBounds = label.getBBox();
    label.textContent = compactText;
    const compactBounds = label.getBBox();
    label.textContent = fullText;

    markerElements.set(locationNumber, {
      group,
      backdrop,
      label,
      fullText,
      compactText,
      fullBounds,
      compactBounds,
    });
  }

  updateMarkerLabels(true);
}

function buildRoutes() {
  for (const [key, chapter] of Object.entries(chapters)) {
    const chapterNumber = Number(key);
    const pathData = splinePath(
      chapter.routeWaypoints,
      chapter.curveTension
    );

    const maskId = `route-mask-${chapterNumber}`;

    const mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
    mask.setAttribute("id", maskId);
    mask.setAttribute("maskUnits", "userSpaceOnUse");
    mask.setAttribute("x", "0");
    mask.setAttribute("y", "0");
    mask.setAttribute("width", String(MAP_WIDTH));
    mask.setAttribute("height", String(MAP_HEIGHT));

    const blackRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    blackRect.setAttribute("x", "0");
    blackRect.setAttribute("y", "0");
    blackRect.setAttribute("width", String(MAP_WIDTH));
    blackRect.setAttribute("height", String(MAP_HEIGHT));
    blackRect.setAttribute("fill", "black");

    const reveal = document.createElementNS("http://www.w3.org/2000/svg", "path");
    reveal.classList.add("route-reveal-path");
    reveal.setAttribute("d", pathData);

    mask.append(blackRect, reveal);
    routeDefs.appendChild(mask);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("journey-path");
    path.setAttribute("d", pathData);
    path.setAttribute("mask", `url(#${maskId})`);
    routesLayer.appendChild(path);

    const length = reveal.getTotalLength();
    reveal.style.strokeDasharray = `${length}`;
    reveal.style.strokeDashoffset = `${length}`;

    routeElements.set(chapterNumber, {
      path,
      reveal,
      length,
    });
  }
}

function setMarkerVisible(locationNumber, visible) {
  const marker = markerElements.get(locationNumber);
  if (!marker) return;
  marker.group.style.display = visible ? "" : "none";
}

function setMarkerOpacity(locationNumber, opacity) {
  const marker = markerElements.get(locationNumber);
  if (!marker) return;
  marker.group.style.opacity = String(opacity);
}

function setRouteState(chapterNumber, state) {
  const route = routeElements.get(chapterNumber);
  if (!route) return;

  if (state === "hidden") {
    route.path.style.display = "none";
    route.reveal.style.strokeDashoffset = `${route.length}`;
  } else {
    route.path.style.display = "";
    route.reveal.style.strokeDashoffset =
      state === "complete" ? "0" : `${route.length}`;
  }
}

function renderIntroductionStart() {
  for (const number of Object.keys(locations).map(Number)) {
    setMarkerVisible(number, false);
  }

  for (const number of Object.keys(chapters).map(Number)) {
    setRouteState(number, "hidden");
  }

  view = { ...fullView };
  chapterSelect.value = "intro";
  applyView();
}

function renderChapterStart(chapterNumber, fullMap) {
  const chapter = chapters[chapterNumber];

  for (const number of Object.keys(locations).map(Number)) {
    setMarkerVisible(number, number <= chapter.from);
    setMarkerOpacity(number, 1);
  }

  for (const number of Object.keys(chapters).map(Number)) {
    setRouteState(
      number,
      number < chapterNumber ? "complete" : "hidden"
    );
  }

  view = fullMap
    ? { ...fullView }
    : { ...locations[chapter.from].view };

  chapterSelect.value = String(chapterNumber);
  applyView();
}

function renderCompleteJourney() {
  for (const number of Object.keys(locations).map(Number)) {
    setMarkerVisible(number, true);
    setMarkerOpacity(number, 1);
  }

  for (const number of Object.keys(chapters).map(Number)) {
    setRouteState(number, "complete");
  }

  view = { ...fullView };
  chapterSelect.value = "all";
  applyView();
}

function renderSelectedStart(fullMap) {
  if (selectedState === "intro") {
    renderIntroductionStart();
    return;
  }

  if (selectedState === "all") {
    renderCompleteJourney();
    return;
  }

  renderChapterStart(Number(selectedState), fullMap);
}

function cancelPlayback() {
  animationRun += 1;

  if (currentFrameId) {
    cancelAnimationFrame(currentFrameId);
  }

  currentFrameId = null;
  isAnimating = false;
  isPaused = false;
  isStoryPlaying = false;
}

function updateControls() {
  const index = navigationOrder.indexOf(selectedState);

  previousButton.disabled = isAnimating || index <= 0;
  nextButton.disabled =
    isAnimating || index >= navigationOrder.length - 1;
  chapterSelect.disabled = isAnimating && !isPaused;
  playStoryButton.disabled = isAnimating;

  if (selectedState === "all" && !isStoryPlaying) {
    playPauseButton.disabled = true;
    playPauseButton.textContent = "▶";
    playPauseButton.setAttribute("aria-label", "Play");
    playPauseButton.title = "Play";
    return;
  }

  playPauseButton.disabled = false;

  if (isAnimating && isPaused) {
    playPauseButton.textContent = "▶";
    playPauseButton.setAttribute(
      "aria-label",
      isStoryPlaying ? "Resume story" : "Resume"
    );
    playPauseButton.title = isStoryPlaying ? "Resume story" : "Resume";
  } else if (isAnimating) {
    playPauseButton.textContent = "⏸";
    playPauseButton.setAttribute(
      "aria-label",
      isStoryPlaying ? "Pause story" : "Pause"
    );
    playPauseButton.title = isStoryPlaying ? "Pause story" : "Pause";
  } else {
    playPauseButton.textContent = "▶";
    playPauseButton.setAttribute("aria-label", "Play");
    playPauseButton.title = "Play";
  }
}

function cameraWidthForProgress(chapter, progress) {
  const frames = chapter.cameraZoom;

  if (progress <= frames[0].progress) {
    return frames[0].width;
  }

  for (let i = 0; i < frames.length - 1; i += 1) {
    const current = frames[i];
    const next = frames[i + 1];

    if (progress <= next.progress) {
      const localProgress =
        (progress - current.progress) /
        (next.progress - current.progress);

      return current.width +
        (next.width - current.width) * easeInOut(localProgress);
    }
  }

  return frames[frames.length - 1].width;
}

function cameraPositionFramesForChapter(chapterNumber) {
  const route = routeElements.get(chapterNumber);
  const frames = [];

  // Five representative camera positions across the complete rendered route.
  // The red line may contain dozens of detailed waypoints, but the camera only
  // reacts to these few broad positions.
  for (let i = 0; i < CAMERA_POSITION_KEYFRAMES; i += 1) {
    const progress = i / (CAMERA_POSITION_KEYFRAMES - 1);
    const point = route.path.getPointAtLength(route.length * progress);

    frames.push({
      progress,
      x: point.x,
      y: point.y,
    });
  }

  return frames;
}

function cameraCenterForProgress(frames, progress) {
  if (progress <= frames[0].progress) {
    return { x: frames[0].x, y: frames[0].y };
  }

  for (let i = 0; i < frames.length - 1; i += 1) {
    const current = frames[i];
    const next = frames[i + 1];

    if (progress <= next.progress) {
      const localProgress =
        (progress - current.progress) /
        (next.progress - current.progress);

      const eased = easeInOut(localProgress);

      return {
        x: current.x + (next.x - current.x) * eased,
        y: current.y + (next.y - current.y) * eased,
      };
    }
  }

  const last = frames[frames.length - 1];
  return { x: last.x, y: last.y };
}

function cameraViewForProgress(chapterNumber, progress, positionFrames) {
  const chapter = chapters[chapterNumber];
  const center = cameraCenterForProgress(positionFrames, progress);
  const width = cameraWidthForProgress(chapter, progress);

  return centeredView(center.x, center.y, width);
}

function revealMarker(locationNumber, runId) {
  setMarkerVisible(locationNumber, true);
  setMarkerOpacity(locationNumber, 0);

  return animateProgress(
    timing.markerReveal,
    (progress) => {
      setMarkerOpacity(locationNumber, easeInOut(progress));
    },
    runId
  );
}

function animateRoute(chapterNumber, runId) {
  const chapter = chapters[chapterNumber];
  const route = routeElements.get(chapterNumber);
  const cameraPositionFrames =
    cameraPositionFramesForChapter(chapterNumber);

  route.path.style.display = "";
  route.reveal.style.strokeDashoffset = `${route.length}`;

  return animateProgress(
    chapter.duration,
    (progress) => {
      route.reveal.style.strokeDashoffset =
        `${route.length * (1 - progress)}`;

      view = cameraViewForProgress(
        chapterNumber,
        progress,
        cameraPositionFrames
      );
      applyView();
    },
    runId
  );
}

async function playIntroduction(runId) {
  renderIntroductionStart();

  if (!(await wait(timing.introHold, runId))) return false;
  if (!(await animateViewTo(
    locations[1].view,
    timing.introZoom,
    runId
  ))) return false;
  if (!(await revealMarker(1, runId))) return false;

  return true;
}

async function playChapter(chapterNumber, runId, startFromOverview) {
  const chapter = chapters[chapterNumber];
  const startLocation = locations[chapter.from];

  renderChapterStart(chapterNumber, startFromOverview);

  if (startFromOverview) {
    if (!(await animateViewTo(
      startLocation.view,
      timing.overviewToStart,
      runId
    ))) return false;
  }

  if (!(await wait(timing.startHold, runId))) return false;
  if (!(await animateRoute(chapterNumber, runId))) return false;

  // The route has arrived. Only now reveal the next chapter marker,
  // then leave the map at the destination for free interaction.
  if (!(await revealMarker(chapter.to, runId))) return false;

  return true;
}

async function playSelected({ startFromOverview = false } = {}) {
  if (isAnimating || selectedState === "all") return;

  cancelPlayback();
  isAnimating = true;
  isPaused = false;
  isStoryPlaying = false;
  browseOverview = false;

  const runId = ++animationRun;
  setUrlState(selectedState, true, "replace");
  updateControls();

  let completed = false;

  if (selectedState === "intro") {
    completed = await playIntroduction(runId);
  } else {
    completed = await playChapter(
      Number(selectedState),
      runId,
      startFromOverview
    );
  }

  if (!completed || runId !== animationRun) return;

  isAnimating = false;
  isPaused = false;
  updateControls();
}


async function playStory() {
  if (isAnimating) return;

  cancelPlayback();

  isAnimating = true;
  isPaused = false;
  isStoryPlaying = true;
  browseOverview = false;

  const runId = ++animationRun;

  selectedState = "intro";
  chapterSelect.value = "intro";
  setUrlState("intro", true, "push");
  updateControls();

  let completed = await playIntroduction(runId);
  if (!completed || runId !== animationRun) return;

  for (let chapterNumber = 1; chapterNumber <= 4; chapterNumber += 1) {
    selectedState = String(chapterNumber);
    chapterSelect.value = selectedState;
    setUrlState(selectedState, true, "replace");
    updateControls();

    completed = await playChapter(chapterNumber, runId, false);
    if (!completed || runId !== animationRun) return;
  }

  if (!(await wait(timing.storyFinalHold, runId))) return;
  if (!(await animateViewTo(
    fullView,
    timing.storyFinalOverview,
    runId
  ))) return;

  if (runId !== animationRun) return;

  selectedState = "all";
  chapterSelect.value = "all";
  browseOverview = true;
  isAnimating = false;
  isPaused = false;
  isStoryPlaying = false;

  renderCompleteJourney();
  setUrlState("all", false, "replace");
  updateControls();
}

function selectForBrowsing(state, pushUrl = true) {
  if (isAnimating) return;

  cancelPlayback();
  selectedState = normalizeState(state);
  browseOverview = true;

  renderSelectedStart(true);
  setUrlState(
    selectedState,
    false,
    pushUrl ? "push" : "replace"
  );
  updateControls();
}

function selectAndAutoplay(state) {
  if (isAnimating && !isPaused) return;

  cancelPlayback();
  selectedState = normalizeState(state);

  if (selectedState === "all") {
    browseOverview = true;
    renderCompleteJourney();
    setUrlState("all", false, "push");
    updateControls();
    return;
  }

  browseOverview = false;
  renderSelectedStart(false);
  setUrlState(selectedState, true, "push");
  updateControls();

  playSelected({ startFromOverview: false });
}

function togglePlayPause() {
  if (selectedState === "all") return;

  if (isAnimating) {
    isPaused = !isPaused;
    updateControls();
    return;
  }

  playSelected({
    startFromOverview: browseOverview && selectedState !== "intro",
  });
}

playStoryButton.addEventListener("click", playStory);
playPauseButton.addEventListener("click", togglePlayPause);

previousButton.addEventListener("click", () => {
  const index = navigationOrder.indexOf(selectedState);
  if (index > 0) {
    selectForBrowsing(navigationOrder[index - 1]);
  }
});

nextButton.addEventListener("click", () => {
  const index = navigationOrder.indexOf(selectedState);
  if (index < navigationOrder.length - 1) {
    selectForBrowsing(navigationOrder[index + 1]);
  }
});

chapterSelect.addEventListener("change", () => {
  selectAndAutoplay(chapterSelect.value);
});

window.addEventListener("popstate", () => {
  cancelPlayback();

  const state = readInitialState();

  if (state.playStoryFromUrl) {
    playStory();
    return;
  }

  selectedState = state.chapter;

  if (state.play && selectedState !== "all") {
    browseOverview = false;
    renderSelectedStart(false);
    updateControls();
    playSelected({ startFromOverview: false });
  } else {
    browseOverview = true;
    renderSelectedStart(true);
    updateControls();
  }
});

svg.addEventListener(
  "wheel",
  (event) => {
    if (isAnimating) return;

    event.preventDefault();
    const point = svgPointFromClient(event.clientX, event.clientY);
    zoomAtSvgPoint(point, event.deltaY < 0 ? 0.85 : 1.15);
  },
  { passive: false }
);

svg.addEventListener("pointerdown", (event) => {
  if (isAnimating) return;

  drag = {
    x: event.clientX,
    y: event.clientY,
    startViewX: view.x,
    startViewY: view.y,
    moved: false,
  };

  svg.setPointerCapture(event.pointerId);
  svg.classList.add("dragging");
});

svg.addEventListener("pointermove", (event) => {
  if (!drag) return;

  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;

  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    drag.moved = true;
  }

  const rect = svg.getBoundingClientRect();

  view.x = drag.startViewX - dx * (view.width / rect.width);
  view.y = drag.startViewY - dy * (view.height / rect.height);

  applyView();
});

function endDrag(event) {
  if (!drag) return;

  const wasMoved = drag.moved;
  drag = null;

  if (svg.hasPointerCapture(event.pointerId)) {
    svg.releasePointerCapture(event.pointerId);
  }

  svg.classList.remove("dragging");

  if (!wasMoved) {
    const point = svgPointFromClient(event.clientX, event.clientY);
    addWaypoint(point);
  }
}

svg.addEventListener("pointerup", endDrag);
svg.addEventListener("pointercancel", endDrag);


undoWaypointButton.addEventListener("click", undoWaypoint);
clearWaypointsButton.addEventListener("click", clearWaypoints);
copyWaypointsButton.addEventListener("click", copyWaypoints);

renderWaypointLog();

buildMarkers();
buildRoutes();

const initialState = readInitialState();

if (initialState.playStoryFromUrl) {
  playStory();
} else {
  selectedState = initialState.chapter;

  if (initialState.play && selectedState !== "all") {
    browseOverview = false;
    renderSelectedStart(false);
    setUrlState(selectedState, true, "replace");
    updateControls();
    playSelected({ startFromOverview: false });
  } else {
    browseOverview = true;
    renderSelectedStart(true);
    setUrlState(
      selectedState,
      selectedState === "all" ? false : initialState.play,
      "replace"
    );
    updateControls();
  }
}
