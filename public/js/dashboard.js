// ========================================
// dashboard.js - Dashboard logic
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    if (!App.checkAuth()) return;

    let safetyActive = false;
    let trackingInterval = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let alarmContext = null;

    const sosBtn = document.querySelector('.sos-btn');
    const safetyToggle = document.getElementById('safety-toggle');
    const safetyStatus = document.querySelector('.safety-status');
    const statusDot = document.querySelector('.status-dot');
    const contactsCount = document.getElementById('contacts-count');
    const locationPreview = document.getElementById('location-preview');

    // Play alarm sound using Web Audio API
    function playAlarm() {
        try {
            alarmContext = new (window.AudioContext || window.webkitAudioContext)();
            function beep(freq, startTime, dur) {
                const osc = alarmContext.createOscillator();
                const gain = alarmContext.createGain();
                osc.connect(gain);
                gain.connect(alarmContext.destination);
                osc.frequency.value = freq;
                osc.type = 'square';
                gain.gain.value = 0.3;
                osc.start(startTime);
                osc.stop(startTime + dur);
            }
            for (let i = 0; i < 5; i++) {
                beep(880, alarmContext.currentTime + i * 0.4, 0.2);
                beep(660, alarmContext.currentTime + i * 0.4 + 0.2, 0.2);
            }
        } catch (e) {
            console.warn('Audio not available', e);
        }
    }

    function stopAlarm() {
        if (alarmContext) {
            alarmContext.close();
            alarmContext = null;
        }
    }

    // Voice recorder
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
            mediaRecorder.start();
        } catch (e) {
            console.warn('Microphone access denied', e);
        }
    }

    function stopRecording() {
        return new Promise((resolve) => {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                resolve(null);
                return;
            }
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                mediaRecorder.stream.getTracks().forEach(t => t.stop());
                resolve(blob);
            };
            mediaRecorder.stop();
        });
    }

    // SOS Button
    if (sosBtn) {
        sosBtn.addEventListener('click', async () => {
            if (safetyActive) {
                App.showToast('Safety system is already active', 'info');
                return;
            }

            playAlarm();

            if (!navigator.geolocation) {
                App.showToast('Geolocation not supported', 'error');
                return;
            }

            sosBtn.disabled = true;
            sosBtn.textContent = 'Sending...';

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        await App.api('/api/alerts/sos', {
                            method: 'POST',
                            body: JSON.stringify({
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                            }),
                        });
                        App.showToast('SOS alert sent successfully!', 'success');
                        activateSafety();
                    } catch (err) {
                        App.showToast(err.message || 'Failed to send SOS', 'error');
                    } finally {
                        sosBtn.disabled = false;
                        sosBtn.textContent = 'SOS';
                    }
                },
                (err) => {
                    App.showToast('Unable to get location: ' + err.message, 'error');
                    sosBtn.disabled = false;
                    sosBtn.textContent = 'SOS';
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }

    function activateSafety() {
        safetyActive = true;
        startTracking();
        startRecording();
        updateSafetyUI(true);
    }

    function deactivateSafety() {
        safetyActive = false;
        stopTracking();
        stopAlarm();
        stopRecording();
        updateSafetyUI(false);
    }

    function updateSafetyUI(active) {
        if (safetyStatus) {
            safetyStatus.textContent = active ? 'Safety Active' : 'Safety Inactive';
            safetyStatus.className = 'safety-status ' + (active ? 'active' : 'inactive');
        }
        if (statusDot) {
            statusDot.className = 'status-dot ' + (active ? 'active' : '');
        }
        if (safetyToggle) {
            safetyToggle.textContent = active ? 'Stop Safety System' : 'Start Safety System';
        }
    }

    // Safety toggle
    if (safetyToggle) {
        safetyToggle.addEventListener('click', () => {
            if (safetyActive) {
                deactivateSafety();
            } else {
                activateSafety();
            }
        });
    }

    // Location tracking
    function startTracking() {
        if (!navigator.geolocation) return;
        trackingInterval = navigator.geolocation.watchPosition(
            (pos) => {
                if (locationPreview) {
                    locationPreview.innerHTML = `
                        <p><strong>Lat:</strong> ${pos.coords.latitude.toFixed(6)}</p>
                        <p><strong>Lng:</strong> ${pos.coords.longitude.toFixed(6)}</p>
                        <p><strong>Accuracy:</strong> ${pos.coords.accuracy.toFixed(0)}m</p>
                    `;
                }
            },
            () => {},
            { enableHighAccuracy: true }
        );
    }

    function stopTracking() {
        if (trackingInterval !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(trackingInterval);
            trackingInterval = null;
        }
    }

    // Load contacts count
    async function loadContactsCount() {
        try {
            const data = await App.api('/api/contacts');
            const count = Array.isArray(data) ? data.length : (data.contacts ? data.contacts.length : 0);
            if (contactsCount) contactsCount.textContent = count;
        } catch (err) {
            console.warn('Could not load contacts count');
        }
    }

    loadContactsCount();
});
