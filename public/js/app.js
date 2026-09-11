// ========================================
// app.js - Main app utilities
// ========================================

const App = {
    // API helper with auth header
    async api(url, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(url, { ...options, headers });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || 'Request failed');
        }
        return data;
    },

    // Show toast notification
    showToast(message, type = 'success') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '&#10003;' : type === 'error' ? '&#10007;' : '&#9432;'}</span>
            <span class="toast-message">${message}</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Check if user is logged in
    checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/pages/login.html';
            return false;
        }
        return true;
    },

    // Get user from localStorage
    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    // Logout
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/pages/login.html';
    },

    // Format date string
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year}, ${hours}:${mins}`;
    },

    // Initialize bottom nav active states
    initNav() {
        const path = window.location.pathname;
        document.querySelectorAll('.bottom-nav a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === path || path.includes(link.getAttribute('href'))) {
                link.classList.add('active');
            }
        });
    },
};

// Initialize nav on load
document.addEventListener('DOMContentLoaded', () => App.initNav());

window.App = App;
