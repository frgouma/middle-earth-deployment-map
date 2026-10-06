
(function () {
  'use strict';
  const svg = document.documentElement;
  const inspectedRouteIds = new Set();

  function routeTarget(target) {
    return target && target.closest ? target.closest('[data-route-id]') : null;
  }
  function setRouteHighlight(routeId, highlighted) {
    svg.querySelectorAll('[data-route-id]').forEach(function (group) {
      if (group.getAttribute('data-route-id') === routeId) {
        group.classList.toggle('route-highlighted', highlighted);
      }
    });
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
  svg.addEventListener('click', function (evt) {
    const group = routeTarget(evt.target);
    toggleInspectedRoute(group && group.getAttribute('data-route-id'));
  });
  document.addEventListener('keydown', function (evt) {
    if (evt.key === 'Escape') { clearInspectedRoutes(); evt.preventDefault(); }
  });
})();
