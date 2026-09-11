// ========================================
// map.js - Map functionality with Leaflet
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    function initMap() {
        // Fix Leaflet default icon paths for local hosting
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconUrl: '/vendor/leaflet/images/marker-icon.png',
            iconRetinaUrl: '/vendor/leaflet/images/marker-icon-2x.png',
            shadowUrl: '/vendor/leaflet/images/marker-shadow.png',
        });

        const DEFAULT_LAT = 12.9716;
        const DEFAULT_LNG = 77.5946;

        const map = L.map('map').setView([DEFAULT_LAT, DEFAULT_LNG], 13);

        // Tile layers
        const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
        });
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri',
        });
        streetLayer.addTo(map);

        let currentLayer = 'street';
        const layerToggle = document.getElementById('layer-toggle');
        if (layerToggle) {
            layerToggle.addEventListener('click', () => {
                if (currentLayer === 'street') {
                    map.removeLayer(streetLayer);
                    satelliteLayer.addTo(map);
                    currentLayer = 'satellite';
                    layerToggle.querySelector('span').textContent = 'Street';
                } else {
                    map.removeLayer(satelliteLayer);
                    streetLayer.addTo(map);
                    currentLayer = 'street';
                    layerToggle.querySelector('span').textContent = 'Satellite';
                }
            });
        }

        // User location marker
        let userMarker = null;
        let trailCoords = [];
        let trailPolyline = null;

        function setUserMarker(lat, lng, popup) {
            const icon = L.divIcon({
                className: 'user-marker',
                html: '<div class="pulse-marker"></div>',
                iconSize: [20, 20],
            });
            if (userMarker) {
                userMarker.setLatLng([lat, lng]);
            } else {
                userMarker = L.marker([lat, lng], { icon }).addTo(map);
            }
            if (popup) userMarker.bindPopup(popup).openPopup();
        }

        // Get current position
        function locateUser() {
            if (!navigator.geolocation) {
                App.showToast('Geolocation not supported', 'error');
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    map.setView([lat, lng], 15);
                    setUserMarker(lat, lng, 'You are here');

                    // Update info panel
                    const coordsEl = document.getElementById('current-coordinates');
                    if (coordsEl) coordsEl.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;

                    // Reverse geocode
                    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
                        .then(r => r.json())
                        .then(data => {
                            const addr = document.getElementById('current-address');
                            if (addr) addr.textContent = data.display_name || 'Address not found';
                        })
                        .catch(() => {
                            const addr = document.getElementById('current-address');
                            if (addr) addr.textContent = 'Address lookup failed';
                        });
                },
                () => {
                    App.showToast('Unable to get your location', 'error');
                },
                { enableHighAccuracy: true }
            );
        }

        locateUser();

        // My Location button
        const myLocationBtn = document.getElementById('my-location-btn');
        if (myLocationBtn) {
            myLocationBtn.addEventListener('click', locateUser);
        }

        // Live tracking
        let trackingActive = false;
        let watchId = null;
        const trackingBtn = document.getElementById('tracking-btn');
        const trackingBadge = document.getElementById('tracking-badge');

        function startTracking() {
            if (!navigator.geolocation) return;
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    setUserMarker(lat, lng, 'Tracking');
                    trailCoords.push([lat, lng]);
                    if (trailPolyline) {
                        trailPolyline.setLatLngs(trailCoords);
                    } else {
                        trailPolyline = L.polyline(trailCoords, { color: '#e74c3c', weight: 3 }).addTo(map);
                    }
                },
                () => {},
                { enableHighAccuracy: true, maximumAge: 5000 }
            );
            trackingActive = true;
            if (trackingBtn) trackingBtn.querySelector('span').textContent = 'Stop Tracking';
            if (trackingBadge) trackingBadge.style.display = 'flex';
        }

        function stopTracking() {
            if (watchId !== null && navigator.geolocation) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            trackingActive = false;
            if (trackingBtn) trackingBtn.querySelector('span').textContent = 'Live Tracking';
            if (trackingBadge) trackingBadge.style.display = 'none';
        }

        if (trackingBtn) {
            trackingBtn.addEventListener('click', () => {
                if (trackingActive) stopTracking();
                else startTracking();
            });
        }

        // Search location
        const searchInput = document.getElementById('map-search');
        const searchResults = document.getElementById('search-results');

        if (searchInput) {
            let searchTimeout = null;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                const q = searchInput.value.trim();
                if (q.length < 3) {
                    if (searchResults) searchResults.innerHTML = '';
                    return;
                }
                searchTimeout = setTimeout(async () => {
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`);
                        const results = await res.json();
                        if (searchResults) {
                            searchResults.innerHTML = '';
                            results.forEach(r => {
                                const item = document.createElement('div');
                                item.className = 'search-result-item';
                                item.textContent = r.display_name;
                                item.addEventListener('click', () => {
                                    map.flyTo([parseFloat(r.lat), parseFloat(r.lon)], 16);
                                    searchResults.innerHTML = '';
                                    searchInput.value = r.display_name;
                                });
                                searchResults.appendChild(item);
                            });
                        }
                    } catch (e) {
                        console.warn('Search failed', e);
                    }
                }, 400);
            });
        }

        // Route planning
        const routeFrom = document.getElementById('route-from');
        const routeTo = document.getElementById('route-to');
        const routeBtn = document.getElementById('route-btn');
        const routeInfo = document.getElementById('route-info');
        let routePolyline = null;

        if (routeBtn) {
            routeBtn.addEventListener('click', async () => {
                const fromQ = routeFrom ? routeFrom.value.trim() : '';
                const toQ = routeTo ? routeTo.value.trim() : '';
                if (!fromQ || !toQ) {
                    App.showToast('Enter both origin and destination', 'error');
                    return;
                }

                try {
                    const fromRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fromQ)}&format=json&limit=1`);
                    const fromData = await fromRes.json();
                    const toRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(toQ)}&format=json&limit=1`);
                    const toData = await toRes.json();

                    if (!fromData.length || !toData.length) {
                        App.showToast('Location not found', 'error');
                        return;
                    }

                    const lat1 = fromData[0].lat, lon1 = fromData[0].lon;
                    const lat2 = toData[0].lat, lon2 = toData[0].lon;

                    const routeRes = await fetch(
                        `https://router.project-osrm.org/route/v1/driving/${lat1},${lon1};${lat2},${lon2}?overview=full&geometries=geojson`
                    );
                    const routeData = await routeRes.json();

                    if (routeData.code !== 'Ok' || !routeData.routes.length) {
                        App.showToast('No route found', 'error');
                        return;
                    }

                    const route = routeData.routes[0];
                    const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);

                    if (routePolyline) map.removeLayer(routePolyline);
                    routePolyline = L.polyline(coords, { color: '#3498db', weight: 5 }).addTo(map);
                    map.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });

                    const distKm = (route.distance / 1000).toFixed(1);
                    const timeMin = Math.round(route.duration / 60);
                    if (routeInfo) {
                        routeInfo.innerHTML = `<strong>${distKm} km</strong> &middot; ~${timeMin} min`;
                    }
                } catch (e) {
                    App.showToast('Routing failed', 'error');
                }
            });
        }

        // Share location
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                if (!userMarker) {
                    App.showToast('No location to share', 'error');
                    return;
                }
                const { lat, lng } = userMarker.getLatLng();
                const link = `https://www.google.com/maps?q=${lat},${lng}`;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(link).then(() => {
                        App.showToast('Location link copied to clipboard');
                    });
                } else {
                    prompt('Copy this link:', link);
                }
            });
        }

        // Show emergency contacts on map
        async function loadEmergencyContacts() {
            try {
                const data = await App.api('/api/contacts');
                const contacts = Array.isArray(data) ? data : (data.contacts || []);
                const emergencyIcon = L.divIcon({
                    className: 'emergency-marker',
                    html: '<div class="emergency-dot"></div>',
                    iconSize: [16, 16],
                });
                contacts.forEach(c => {
                    if (c.latitude && c.longitude) {
                        L.marker([c.latitude, c.longitude], { icon: emergencyIcon })
                            .bindPopup(`<strong>${c.name}</strong><br>${c.phone}`)
                            .addTo(map);
                    }
                });
            } catch (e) {
                // Contacts without coords are fine
            }
        }

        loadEmergencyContacts();
    }

    // Leaflet is loaded via local script tag in map.html
    if (typeof L !== 'undefined') {
        initMap();
    } else {
        // Fallback: wait a moment for script to load
        setTimeout(() => {
            if (typeof L !== 'undefined') {
                initMap();
            } else {
                console.error('Leaflet failed to load');
            }
        }, 1000);
    }
});
