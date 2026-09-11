// ========================================
// settings.js - Safety settings
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    if (!App.checkAuth()) return;

    let locationWatchId = null;

    // Load settings
    async function loadSettings() {
        try {
            const data = await App.api('/api/settings');
            const settings = data.settings || data;
            applySettings(settings);
        } catch (err) {
            // Use defaults if no settings exist
            applySettings({
                pushNotifications: false,
                locationSharing: false,
                autoVoiceRecording: false,
                smsAlerts: true,
                emailAlerts: true,
            });
        }
    }

    function applySettings(settings) {
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            const key = toggle.dataset.setting;
            if (key && settings[key] !== undefined) {
                toggle.classList.toggle('on', settings[key]);
            }
        });
    }

    // Toggle switches
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
        toggle.addEventListener('click', async () => {
            const key = toggle.dataset.setting;
            const isActive = toggle.classList.toggle('on');

            // Handle special toggles
            if (key === 'pushNotifications') {
                if (isActive) {
                    if ('Notification' in window) {
                        const perm = await Notification.requestPermission();
                        if (perm !== 'granted') {
                            toggle.classList.remove('on');
                            App.showToast('Notification permission denied', 'error');
                            return;
                        }
                    } else {
                        toggle.classList.remove('on');
                        App.showToast('Notifications not supported', 'error');
                        return;
                    }
                }
            }

            if (key === 'locationSharing') {
                if (isActive) {
                    startLocationSharing();
                } else {
                    stopLocationSharing();
                }
            }

            // Save to API
            try {
                await App.api('/api/settings', {
                    method: 'PUT',
                    body: JSON.stringify({ [key]: isActive }),
                });
                App.showToast(`${formatSettingName(key)} ${isActive ? 'enabled' : 'disabled'}`);
            } catch (err) {
                toggle.classList.toggle('on');
                App.showToast('Failed to update setting', 'error');
            }
        });
    });

    function startLocationSharing() {
        if (!navigator.geolocation) return;
        locationWatchId = navigator.geolocation.watchPosition(
            async (pos) => {
                try {
                    await App.api('/api/location', {
                        method: 'POST',
                        body: JSON.stringify({
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                        }),
                    });
                } catch (e) {
                    console.warn('Location update failed', e);
                }
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 30000 }
        );
    }

    function stopLocationSharing() {
        if (locationWatchId !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(locationWatchId);
            locationWatchId = null;
        }
    }

    function formatSettingName(key) {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, s => s.toUpperCase());
    }

    // Emergency numbers
    document.querySelectorAll('.emergency-number').forEach(el => {
        el.addEventListener('click', () => {
            const num = el.dataset.number || el.textContent.trim();
            window.location.href = `tel:${num}`;
        });
    });

    loadSettings();
});
