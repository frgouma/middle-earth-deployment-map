const svg = document.getElementById("map");
const journeyPath = document.getElementById("journey-path");
const revealPath = document.getElementById("route-reveal-path");
const markerX2 = document.getElementById("marker-x2");
const x2Strokes = [...markerX2.querySelectorAll(".x2-stroke")];
const x2Label = markerX2.querySelector(".x2-label");
const coordinates = document.getElementById("coordinates");
const travelButton = document.getElementById("travel");

const fullView = {
  x: 0,
  y: 0,
  width: 4266.6665,
  height: 3200,
};

const initialView = {
  x: 850,
  y: 1550,
  width: 1500,
  height: 1125,
};

const x2View = {
  x: 2300,
  y: 850,
  width: 1350,
  height: 1013,
};

const journey = {
  timing: {
    holdAtX1: 1000,
    zoomOut: 1800,
    zoomToX2: 1800,
    drawX2: 900,
    holdAtX2: 500,
    returnToX1: 1700,
    travelRoute: 14000,
  },

  // Smaller values make the spline hug the waypoints more tightly.
  curveTension: 0.10,

  routeWaypoints: [
    { x: 1250, y: 2050 },
    { x: 1450, y: 1780 },
    { x: 1640, y: 1510 },
    { x: 1810, y: 1170 },
    { x: 2070, y: 820 },
    { x: 2290, y: 620 },
    { x: 2470, y: 820 },
    { x: 2590, y: 1080 },
    { x: 2710, y: 1220 },
    { x: 2830, y: 1280 },
    { x: 2925, y: 1400 },
  ],

  // Each keyframe controls camera position and zoom at a point in route progress.
  travelCamera: [
    {
      progress: 0.00,
      view: { x: 850, y: 1550, width: 1500, height: 1125 },
    },
    {
      progress: 0.18,
      view: { x: 1050, y: 1250, width: 1750, height: 1313 },
    },
    {
      progress: 0.38,
      view: { x: 1300, y: 650, width: 1900, height: 1425 },
    },
    {
      progress: 0.55,
      view: { x: 1500, y: 250, width: 1850, height: 1388 },
    },
    {
      progress: 0.72,
      view: { x: 1850, y: 550, width: 1700, height: 1275 },
    },
    {
      progress: 0.88,
      view: { x: 2150, y: 750, width: 1500, height: 1125 },
    },
    {
      progress: 1.00,
      view: { ...x2View },
    },
  ],
};

let view = { ...initialView };
let drag = null;
let viewAnimation = null;
let routeAnimation = null;
let isTravelling = false;
let journeyRun = 0;

function applyView() {
  svg.setAttribute(
    "viewBox",
    `${view.x} ${view.y} ${view.width} ${view.height}`
  );
}

function wait(ms, runId) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(runId === journeyRun), ms);
  });
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

function animateViewTo(target, duration, runId) {
  return new Promise((resolve) => {
    if (viewAnimation) cancelAnimationFrame(viewAnimation);

    const start = { ...view };
    const startedAt = performance.now();

    function frame(now) {
      if (runId !== journeyRun) {
        viewAnimation = null;
        resolve(false);
        return;
      }

      const progress = Math.min((now - startedAt) / duration, 1);
      view = interpolateView(start, target, easeInOut(progress));
      applyView();

      if (progress < 1) {
        viewAnimation = requestAnimationFrame(frame);
      } else {
        viewAnimation = null;
        resolve(true);
      }
    }

    viewAnimation = requestAnimationFrame(frame);
  });
}

function zoomAtSvgPoint(point, factor) {
  if (viewAnimation) cancelAnimationFrame(viewAnimation);

  view.x = point.x - (point.x - view.x) * factor;
  view.y = point.y - (point.y - view.y) * factor;
  view.width *= factor;
  view.height *= factor;

  applyView();
}

function zoomFromCenter(factor) {
  const center = {
    x: view.x + view.width / 2,
    y: view.y + view.height / 2,
  };
  zoomAtSvgPoint(center, factor);
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

function prepareJourneyPath() {
  const pathData = splinePath(
    journey.routeWaypoints,
    journey.curveTension
  );

  journeyPath.setAttribute("d", pathData);
  revealPath.setAttribute("d", pathData);

  const length = revealPath.getTotalLength();

  revealPath.style.strokeDasharray = `${length}`;
  revealPath.style.strokeDashoffset = `${length}`;

  journeyPath.style.opacity = "0";

  return length;
}

function prepareX2() {
  markerX2.style.opacity = "0";
  x2Label.style.opacity = "0";

  x2Strokes.forEach((line) => {
    const length = line.getTotalLength();
    line.style.strokeDasharray = `${length}`;
    line.style.strokeDashoffset = `${length}`;
  });
}

function animateX2(runId) {
  return new Promise((resolve) => {
    markerX2.style.opacity = "1";
    const startedAt = performance.now();
    const duration = journey.timing.drawX2;

    function frame(now) {
      if (runId !== journeyRun) {
        resolve(false);
        return;
      }

      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = easeInOut(progress);

      x2Strokes.forEach((line) => {
        const length = line.getTotalLength();
        line.style.strokeDashoffset = `${length * (1 - eased)}`;
      });

      if (progress > 0.65) {
        x2Label.style.opacity = `${(progress - 0.65) / 0.35}`;
      }

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        x2Label.style.opacity = "1";
        resolve(true);
      }
    }

    requestAnimationFrame(frame);
  });
}

function cameraViewForProgress(progress) {
  const frames = journey.travelCamera;

  if (progress <= frames[0].progress) {
    return { ...frames[0].view };
  }

  for (let i = 0; i < frames.length - 1; i += 1) {
    const current = frames[i];
    const next = frames[i + 1];

    if (progress <= next.progress) {
      const localProgress =
        (progress - current.progress) / (next.progress - current.progress);

      return interpolateView(
        current.view,
        next.view,
        easeInOut(localProgress)
      );
    }
  }

  return { ...frames[frames.length - 1].view };
}

function animateJourney(runId) {
  return new Promise((resolve) => {
    const length = revealPath.getTotalLength();
    const startedAt = performance.now();

    journeyPath.style.opacity = "1";

    function frame(now) {
      if (runId !== journeyRun) {
        routeAnimation = null;
        resolve(false);
        return;
      }

      const progress = Math.min(
        (now - startedAt) / journey.timing.travelRoute,
        1
      );

      revealPath.style.strokeDashoffset =
        `${length * (1 - progress)}`;

      view = cameraViewForProgress(progress);
      applyView();

      if (progress < 1) {
        routeAnimation = requestAnimationFrame(frame);
      } else {
        revealPath.style.strokeDashoffset = "0";
        routeAnimation = null;
        resolve(true);
      }
    }

    routeAnimation = requestAnimationFrame(frame);
  });
}

async function startJourney() {
  if (isTravelling) return;

  isTravelling = true;
  travelButton.disabled = true;

  const runId = ++journeyRun;

  if (!(await wait(journey.timing.holdAtX1, runId))) return;
  if (!(await animateViewTo(fullView, journey.timing.zoomOut, runId))) return;
  if (!(await animateViewTo(x2View, journey.timing.zoomToX2, runId))) return;
  if (!(await animateX2(runId))) return;
  if (!(await wait(journey.timing.holdAtX2, runId))) return;
  if (!(await animateViewTo(initialView, journey.timing.returnToX1, runId))) return;
  if (!(await animateJourney(runId))) return;

  travelButton.disabled = false;
  isTravelling = false;
}

function resetJourney() {
  journeyRun += 1;

  if (viewAnimation) cancelAnimationFrame(viewAnimation);
  if (routeAnimation) cancelAnimationFrame(routeAnimation);

  viewAnimation = null;
  routeAnimation = null;
  isTravelling = false;
  travelButton.disabled = false;

  view = { ...initialView };
  applyView();

  prepareJourneyPath();
  prepareX2();
}

svg.addEventListener(
  "wheel",
  (event) => {
    if (isTravelling) return;

    event.preventDefault();
    const point = svgPointFromClient(event.clientX, event.clientY);
    zoomAtSvgPoint(point, event.deltaY < 0 ? 0.85 : 1.15);
  },
  { passive: false }
);

svg.addEventListener("pointerdown", (event) => {
  if (isTravelling) return;

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

document.getElementById("zoom-in").addEventListener("click", () => {
  if (!isTravelling) zoomFromCenter(0.8);
});

document.getElementById("zoom-out").addEventListener("click", () => {
  if (!isTravelling) zoomFromCenter(1.25);
});

document.getElementById("reset-view").addEventListener("click", resetJourney);
travelButton.addEventListener("click", startJourney);

applyView();
prepareJourneyPath();
prepareX2();
