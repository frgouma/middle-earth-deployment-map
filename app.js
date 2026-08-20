const svg = document.getElementById("map");

const fullView = {
  x: 0,
  y: 0,
  width: 4266.6665,
  height: 3200,
};

let view = { ...fullView };
let drag = null;

function applyView() {
  svg.setAttribute(
    "viewBox",
    `${view.x} ${view.y} ${view.width} ${view.height}`
  );
}

function zoomAtSvgPoint(point, factor) {
  const newWidth = view.width * factor;
  const newHeight = view.height * factor;

  view.x = point.x - (point.x - view.x) * factor;
  view.y = point.y - (point.y - view.y) * factor;
  view.width = newWidth;
  view.height = newHeight;

  applyView();
}

function svgPointFromClient(clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function zoomFromCenter(factor) {
  const center = {
    x: view.x + view.width / 2,
    y: view.y + view.height / 2,
  };
  zoomAtSvgPoint(center, factor);
}

svg.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const point = svgPointFromClient(event.clientX, event.clientY);
    zoomAtSvgPoint(point, event.deltaY < 0 ? 0.85 : 1.15);
  },
  { passive: false }
);

svg.addEventListener("pointerdown", (event) => {
  drag = {
    x: event.clientX,
    y: event.clientY,
    startViewX: view.x,
    startViewY: view.y,
  };
  svg.setPointerCapture(event.pointerId);
  svg.classList.add("dragging");
});

svg.addEventListener("pointermove", (event) => {
  if (!drag) return;

  const rect = svg.getBoundingClientRect();
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;

  view.x = drag.startViewX - dx * (view.width / rect.width);
  view.y = drag.startViewY - dy * (view.height / rect.height);

  applyView();
});

function endDrag(event) {
  if (!drag) return;
  drag = null;
  if (svg.hasPointerCapture(event.pointerId)) {
    svg.releasePointerCapture(event.pointerId);
  }
  svg.classList.remove("dragging");
}

svg.addEventListener("pointerup", endDrag);
svg.addEventListener("pointercancel", endDrag);

document.getElementById("zoom-in").addEventListener("click", () => {
  zoomFromCenter(0.8);
});

document.getElementById("zoom-out").addEventListener("click", () => {
  zoomFromCenter(1.25);
});

document.getElementById("reset-view").addEventListener("click", () => {
  view = { ...fullView };
  applyView();
});

applyView();
