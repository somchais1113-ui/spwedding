/* Pure travel rules; usable from the website and Node's test runner. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WeddingTravelHelpers = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  function filter(locations, mode) { return locations.filter(p => mode === 'all' || p.category.includes(mode)); }
  function https(value) {
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch (_) { return null; }
  }
  function imageURL(value) {
    const remote=https(value);
    if(remote && ['ak-d.tripcdn.com','i.ytimg.com'].includes(new URL(remote).hostname))return remote;
    return typeof value === 'string' && (/^assets\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..') || /^data:image\/(png|jpeg|webp|avif);base64,[a-zA-Z0-9+/=]+$/.test(value)) ? value : null;
  }
  function coordinates(point) { return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180; }
  function navigation(place) {
    const destination = coordinates(place.coordinates) ? place.coordinates.lat + ',' + place.coordinates.lng : place.mapsQuery;
    if (destination) return 'https://www.google.com/maps/dir/?' + new URLSearchParams({api:'1', destination, travelmode:'driving'});
    const url = https(place.googleMapsURL);
    return url && /^(www\.)?google\.com$|^maps\.app\.goo\.gl$/.test(new URL(url).hostname) ? url : null;
  }
  function routePoints(route, locations, venue) {
    return [venue, ...route.stops.map(id => locations.find(p => p.id === id)?.mapPosition)].filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  }
  function routePath(points) { return points.map((p, i) => { if(!i) return 'M' + p.x + ' ' + p.y; const prev=points[i-1], mid=(prev.y+p.y)/2; return `C${prev.x} ${mid} ${p.x} ${mid} ${p.x} ${p.y}`; }).join(' '); }
  function camera(width, height, map, positions, zoom = 1) {
    const base = Math.min(width / map.width, height / map.height);
    const scale = base * clamp(zoom, 1, 2.8);
    const cx = positions.length ? positions.reduce((a,p) => a + p.x,0) / positions.length : map.width / 2;
    const cy = positions.length ? positions.reduce((a,p) => a + p.y,0) / positions.length : map.height / 2;
    return {scale, x:width/2 - cx*scale, y:height/2 - cy*scale, base};
  }
  function pan(camera, width, height, map) {
    const w = map.width * camera.scale, h = map.height * camera.scale;
    return {...camera, x:w <= width ? (width-w)/2 : clamp(camera.x,width-w-48,48), y:h <= height ? (height-h)/2 : clamp(camera.y,height-h-48,48)};
  }
  return {clamp, filter, https, imageURL, coordinates, navigation, routePoints, routePath, camera, pan};
});
