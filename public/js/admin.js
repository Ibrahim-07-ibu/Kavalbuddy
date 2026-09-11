// ========================================
// admin.js - Admin panel logic
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    if (!App.checkAuth()) return;

    // Sidebar toggle
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }

    // Load stats
    async function loadStats() {
        try {
            const data = await App.api('/api/admin/stats');
            renderStats(data);
        } catch (err) {
            console.warn('Failed to load stats');
        }
    }

    function renderStats(stats) {
        const container = document.getElementById('stats-container');
        if (!container) return;
        container.innerHTML = '';

        const cards = [
            { label: 'Total Users', value: stats.totalUsers || 0, color: '#3498db' },
            { label: 'Active Alerts', value: stats.activeAlerts || 0, color: '#e74c3c' },
            { label: 'Total Alerts', value: stats.totalAlerts || 0, color: '#f39c12' },
            { label: 'Feedback', value: stats.totalFeedback || 0, color: '#2ecc71' },
        ];

        cards.forEach(card => {
            const el = document.createElement('div');
            el.className = 'stat-card';
            el.innerHTML = `
                <div class="stat-value" style="color:${card.color}">${card.value}</div>
                <div class="stat-label">${card.label}</div>
            `;
            container.appendChild(el);
        });

        // Simple bar chart
        renderChart(stats);
    }

    function renderChart(stats) {
        const chartContainer = document.getElementById('chart-container');
        if (!chartContainer) return;
        const data = [
            { label: 'Users', value: stats.totalUsers || 0 },
            { label: 'Alerts', value: stats.totalAlerts || 0 },
            { label: 'Feedback', value: stats.totalFeedback || 0 },
        ];
        const maxVal = Math.max(...data.map(d => d.value), 1);
        chartContainer.innerHTML = data.map(d => {
            const pct = (d.value / maxVal) * 100;
            return `
                <div class="chart-bar-row">
                    <span class="chart-label">${d.label}</span>
                    <div class="chart-bar-track">
                        <div class="chart-bar-fill" style="width:${pct}%"></div>
                    </div>
                    <span class="chart-value">${d.value}</span>
                </div>
            `;
        }).join('');
    }

    // Load users
    async function loadUsers() {
        try {
            const data = await App.api('/api/admin/users');
            const users = data.users || data;
            renderUsers(Array.isArray(users) ? users : []);
        } catch (err) {
            console.warn('Failed to load users');
        }
    }

    function renderUsers(users) {
        const tbody = document.getElementById('users-table');
        if (!tbody) return;
        tbody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(user.name)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.phone || '')}</td>
                <td><span class="badge ${user.isBlocked ? 'badge-danger' : 'badge-success'}">${user.isBlocked ? 'Blocked' : 'Active'}</span></td>
                <td>${App.formatDate(user.createdAt)}</td>
                <td>
                    <button class="btn-toggle-block" data-id="${user._id}" data-blocked="${user.isBlocked}">
                        ${user.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-toggle-block').forEach(btn => {
            btn.addEventListener('click', () => toggleBlockUser(btn.dataset.id, btn.dataset.blocked === 'true'));
        });
    }

    async function toggleBlockUser(id, isBlocked) {
        try {
            await App.api(`/api/admin/users/${id}/block`, {
                method: 'PUT',
                body: JSON.stringify({ isBlocked: !isBlocked }),
            });
            App.showToast(isBlocked ? 'User unblocked' : 'User blocked');
            loadUsers();
        } catch (err) {
            App.showToast(err.message || 'Failed to update user', 'error');
        }
    }

    // Load alerts
    async function loadAlerts() {
        try {
            const data = await App.api('/api/admin/alerts');
            const alerts = data.alerts || data;
            renderAlerts(Array.isArray(alerts) ? alerts : []);
        } catch (err) {
            console.warn('Failed to load alerts');
        }
    }

    function renderAlerts(alerts) {
        const tbody = document.getElementById('alerts-table');
        if (!tbody) return;
        tbody.innerHTML = '';

        alerts.forEach(alert => {
            const tr = document.createElement('tr');
            const statusClass = alert.status === 'active' ? 'badge-danger' : 'badge-success';
            tr.innerHTML = `
                <td>${escapeHtml(alert.userName || alert.user?.name || 'Unknown')}</td>
                <td>${escapeHtml(alert.type || 'SOS')}</td>
                <td><span class="badge ${statusClass}">${alert.status || 'active'}</span></td>
                <td>${alert.latitude ? `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}` : 'N/A'}</td>
                <td>${App.formatDate(alert.createdAt)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Load feedback
    async function loadFeedback() {
        try {
            const data = await App.api('/api/admin/feedback');
            const feedback = data.feedback || data;
            renderFeedback(Array.isArray(feedback) ? feedback : []);
        } catch (err) {
            console.warn('Failed to load feedback');
        }
    }

    function renderFeedback(items) {
        const tbody = document.getElementById('feedback-table');
        if (!tbody) return;
        tbody.innerHTML = '';

        items.forEach(item => {
            const tr = document.createElement('tr');
            const statusClass = item.status === 'resolved' ? 'badge-success' :
                               item.status === 'rejected' ? 'badge-danger' : 'badge-warning';
            tr.innerHTML = `
                <td>${escapeHtml(item.userName || item.user?.name || 'Unknown')}</td>
                <td>${escapeHtml(item.message || item.feedback || '')}</td>
                <td><span class="badge ${statusClass}">${item.status || 'pending'}</span></td>
                <td>${App.formatDate(item.createdAt)}</td>
                <td>
                    <select class="feedback-status-select" data-id="${item._id}">
                        <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="resolved" ${item.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                        <option value="rejected" ${item.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.feedback-status-select').forEach(select => {
            select.addEventListener('change', () => updateFeedbackStatus(select.dataset.id, select.value));
        });
    }

    async function updateFeedbackStatus(id, status) {
        try {
            await App.api(`/api/admin/feedback/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ status }),
            });
            App.showToast('Feedback updated');
            loadFeedback();
        } catch (err) {
            App.showToast(err.message || 'Failed to update feedback', 'error');
        }
    }

    // Initial load
    loadStats();
    loadUsers();
    loadAlerts();
    loadFeedback();

    // Auto-refresh every 30 seconds
    setInterval(() => {
        loadStats();
        loadUsers();
        loadAlerts();
        loadFeedback();
    }, 30000);
});

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
