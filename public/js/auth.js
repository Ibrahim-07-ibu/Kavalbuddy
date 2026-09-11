// ========================================
// auth.js - Authentication logic
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[name="email"]').value.trim();
            const password = loginForm.querySelector('input[name="password"]').value;

            if (!validateEmail(email)) {
                App.showToast('Please enter a valid email', 'error');
                return;
            }
            if (password.length < 6) {
                App.showToast('Password must be at least 6 characters', 'error');
                return;
            }

            try {
                const data = await App.api('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password }),
                });
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                App.showToast('Login successful');
                setTimeout(() => (window.location.href = '/index.html'), 500);
            } catch (err) {
                App.showToast(err.message || 'Login failed', 'error');
            }
        });
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = registerForm.querySelector('input[name="name"]').value.trim();
            const email = registerForm.querySelector('input[name="email"]').value.trim();
            const phone = registerForm.querySelector('input[name="phone"]').value.trim();
            const password = registerForm.querySelector('input[name="password"]').value;
            const confirmPassword = registerForm.querySelector('input[name="confirmPassword"]')
                ? registerForm.querySelector('input[name="confirmPassword"]').value
                : null;

            if (name.length < 2) {
                App.showToast('Name must be at least 2 characters', 'error');
                return;
            }
            if (!validateEmail(email)) {
                App.showToast('Please enter a valid email', 'error');
                return;
            }
            if (!phone || phone.length < 10) {
                App.showToast('Please enter a valid phone number', 'error');
                return;
            }
            if (password.length < 6) {
                App.showToast('Password must be at least 6 characters', 'error');
                return;
            }
            if (confirmPassword && password !== confirmPassword) {
                App.showToast('Passwords do not match', 'error');
                return;
            }

            try {
                const data = await App.api('/api/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ name, email, phone, password }),
                });
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                App.showToast('Registration successful');
                setTimeout(() => (window.location.href = '/index.html'), 500);
            } catch (err) {
                App.showToast(err.message || 'Registration failed', 'error');
            }
        });
    }

    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling || btn.closest('.input-group').querySelector('input');
            if (!input) return;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.innerHTML = isPassword ? '&#128065;' : '&#128064;';
        });
    });
});

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
