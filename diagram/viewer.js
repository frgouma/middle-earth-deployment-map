(function () {
  'use strict';
  const svg = document.documentElement;
  const inspectedRouteIds = new Set();

  function routeTarget(target) {
    return target && target.closest ? target.closest('[data-route-id]') : null;
  }
  function routeLabel(routeId) {
    return svg.querySelector('[data-route-label-id="' + routeId + '"]');
  }
  function setRouteLabelVisible(routeId, visible) {
    const label = routeLabel(routeId);
    if (label) label.classList.toggle('route-label-visible', Boolean(visible));
  }
  function setRouteHighlight(routeId, highlighted) {
    svg.querySelectorAll('[data-route-id]').forEach(function (group) {
      if (group.getAttribute('data-route-id') === routeId) {
        group.classList.toggle('route-highlighted', highlighted);
      }
    });
    setRouteLabelVisible(routeId, highlighted);
  }
  function clearInspectedRoutes() {
    inspectedRouteIds.forEach(function (routeId) { setRouteHighlight(routeId, false); });
    inspectedRouteIds.clear();
  }
  function toggleInspectedRoute(routeId) {
    if (!routeId) return;
    if (inspectedRouteIds.has(routeId)) {
      inspectedRouteIds.delete(routeId); setRouteHighlight(routeId, false);
    } else {
      inspectedRouteIds.add(routeId); setRouteHighlight(routeId, true);
    }
  }

  svg.querySelectorAll('[data-route-id]').forEach(function (group) {
    const routeId = group.getAttribute('data-route-id');
    group.addEventListener('mouseenter', function () { setRouteLabelVisible(routeId, true); });
    group.addEventListener('mouseleave', function () { setRouteLabelVisible(routeId, inspectedRouteIds.has(routeId)); });
  });
  svg.addEventListener('click', function (evt) {
    const group = routeTarget(evt.target);
    toggleInspectedRoute(group && group.getAttribute('data-route-id'));
  });
  document.addEventListener('keydown', function (evt) {
    if (evt.key === 'Escape') { clearInspectedRoutes(); evt.preventDefault(); }
  });
})();
