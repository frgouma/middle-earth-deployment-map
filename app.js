const svg = document.getElementById("map");
const routeDefs = document.getElementById("route-defs");
const routesLayer = document.getElementById("routes-layer");
const markersLayer = document.getElementById("markers-layer");

const chapterSelect = document.getElementById("chapter-select");
const playPauseButton = document.getElementById("play-pause");
const previousButton = document.getElementById("previous-chapter");
const nextButton = document.getElementById("next-chapter");
const coordinates = document.getElementById("coordinates");

const MAP_WIDTH = 4266.6665;
const MAP_HEIGHT = 3200;
const VIEW_ASPECT = MAP_HEIGHT / MAP_WIDTH;
const MARKER_REFERENCE_WIDTH = 1250;

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
      { x: 1780, y: 720 },
      { x: 1430, y: 760 },
      { x: 1095.9, y: 880.2 },
    ],
    camera: [
      { progress: 0.00, view: locations[1].view },
      { progress: 0.35, view: centeredView(1760, 760, 1450) },
      { progress: 0.70, view: centeredView(1380, 800, 1380) },
      { progress: 1.00, view: locations[2].view },
    ],
  },

  2: {
    from: 2,
    to: 3,
    duration: 12000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 1095.9, y: 880.2 },
      { x: 1450, y: 1080 },
      { x: 1850, y: 1350 },
      { x: 2250, y: 1550 },
      { x: 2670, y: 1830 },
      { x: 3014.4, y: 2144.1 },
    ],
    camera: [
      { progress: 0.00, view: locations[2].view },
      { progress: 0.20, view: centeredView(1450, 1050, 1550) },
      { progress: 0.45, view: centeredView(1900, 1350, 1750) },
      { progress: 0.72, view: centeredView(2450, 1700, 1700) },
      { progress: 1.00, view: locations[3].view },
    ],
  },

  3: {
    from: 3,
    to: 4,
    duration: 13500,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 3014.4, y: 2144.1 },
      { x: 2820, y: 1740 },
      { x: 2500, y: 1370 },
      { x: 2050, y: 1080 },
      { x: 1580, y: 930 },
      { x: 1120, y: 800 },
      { x: 748.2, y: 847.0 },
    ],
    camera: [
      { progress: 0.00, view: locations[3].view },
      { progress: 0.16, view: centeredView(2800, 1750, 1550) },
      { progress: 0.36, view: centeredView(2400, 1350, 1800) },
      { progress: 0.56, view: centeredView(1950, 1050, 1900) },
      { progress: 0.76, view: centeredView(1450, 850, 1750) },
      { progress: 0.90, view: centeredView(1000, 820, 1450) },
      { progress: 1.00, view: locations[4].view },
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
    camera: [
      { progress: 0.00, view: locations[4].view },
      { progress: 0.28, view: centeredView(850, 780, 1400) },
      { progress: 0.58, view: centeredView(1050, 830, 1400) },
      { progress: 0.82, view: centeredView(1210, 930, 1325) },
      { progress: 1.00, view: locations[5].view },
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
};

const markerElements = new Map();
const routeElements = new Map();

let selectedState = "intro";
let view = { ...fullView };
let drag = null;

let animationRun = 0;
let currentFrameId = null;
let isAnimating = false;
let isPaused = false;
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
  const play = params.get("play") === "true";
  return { chapter, play };
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

function updateMarkerScales() {
  const scale = markerScale();

  for (const [locationNumber, group] of markerElements.entries()) {
    const location = locations[locationNumber];
    group.setAttribute(
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
    label.textContent = `${location.roman} · ${location.title}`;

    group.append(backdrop, dot, label);
    markersLayer.appendChild(group);
    markerElements.set(locationNumber, group);

    const bbox = label.getBBox();
    const padX = 5;
    const padY = 3;

    backdrop.setAttribute("x", String(bbox.x - padX));
    backdrop.setAttribute("y", String(bbox.y - padY));
    backdrop.setAttribute("width", String(bbox.width + padX * 2));
    backdrop.setAttribute("height", String(bbox.height + padY * 2));
  }
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
  marker.style.display = visible ? "" : "none";
}

function setMarkerOpacity(locationNumber, opacity) {
  const marker = markerElements.get(locationNumber);
  if (!marker) return;
  marker.style.opacity = String(opacity);
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
}

function updateControls() {
  const index = navigationOrder.indexOf(selectedState);

  previousButton.disabled = isAnimating || index <= 0;
  nextButton.disabled =
    isAnimating || index >= navigationOrder.length - 1;
  chapterSelect.disabled = isAnimating && !isPaused;

  if (selectedState === "all") {
    playPauseButton.disabled = true;
    playPauseButton.textContent = "▶";
    playPauseButton.setAttribute("aria-label", "Play");
    playPauseButton.title = "Play";
    return;
  }

  playPauseButton.disabled = false;

  if (isAnimating && isPaused) {
    playPauseButton.textContent = "▶";
    playPauseButton.setAttribute("aria-label", "Resume");
    playPauseButton.title = "Resume";
  } else if (isAnimating) {
    playPauseButton.textContent = "⏸";
    playPauseButton.setAttribute("aria-label", "Pause");
    playPauseButton.title = "Pause";
  } else {
    playPauseButton.textContent = "▶";
    playPauseButton.setAttribute("aria-label", "Play");
    playPauseButton.title = "Play";
  }
}

function cameraViewForProgress(chapter, progress) {
  const frames = chapter.camera;

  if (progress <= frames[0].progress) {
    return { ...frames[0].view };
  }

  for (let i = 0; i < frames.length - 1; i += 1) {
    const current = frames[i];
    const next = frames[i + 1];

    if (progress <= next.progress) {
      const localProgress =
        (progress - current.progress) /
        (next.progress - current.progress);

      return interpolateView(
        current.view,
        next.view,
        easeInOut(localProgress)
      );
    }
  }

  return { ...frames[frames.length - 1].view };
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

  route.path.style.display = "";
  route.reveal.style.strokeDashoffset = `${route.length}`;

  return animateProgress(
    chapter.duration,
    (progress) => {
      route.reveal.style.strokeDashoffset =
        `${route.length * (1 - progress)}`;

      view = cameraViewForProgress(chapter, progress);
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
    coordinates.value =
      `x: ${point.x.toFixed(1)}, y: ${point.y.toFixed(1)}`;
  }
}

svg.addEventListener("pointerup", endDrag);
svg.addEventListener("pointercancel", endDrag);

buildMarkers();
buildRoutes();

const initialState = readInitialState();
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
