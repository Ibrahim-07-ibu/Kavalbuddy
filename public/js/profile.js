// ========================================
// profile.js - Profile management
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    if (!App.checkAuth()) return;

    const profileInfo = document.getElementById('profile-info');
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    const profilePicInput = document.getElementById('profile-pic-input');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const logoutBtn = document.getElementById('logout-btn');

    // Load profile
    async function loadProfile() {
        try {
            const data = await App.api('/api/profile');
            const user = data.user || data;
            if (profileInfo) {
                profileInfo.innerHTML = `
                    <div class="profile-avatar">
                        ${user.profilePicture
                            ? `<img src="${user.profilePicture}" alt="Profile">`
                            : `<div class="avatar-placeholder">${(user.name || 'U').charAt(0).toUpperCase()}</div>`}
                    </div>
                    <h2>${escapeHtml(user.name)}</h2>
                    <p>${escapeHtml(user.email)}</p>
                    <p>${escapeHtml(user.phone || '')}</p>
                `;
            }

            if (profileForm) {
                const nameInput = profileForm.querySelector('input[name="name"]');
                const emailInput = profileForm.querySelector('input[name="email"]');
                const phoneInput = profileForm.querySelector('input[name="phone"]');
                const genderInput = profileForm.querySelector('select[name="gender"]');
                if (nameInput) nameInput.value = user.name || '';
                if (emailInput) emailInput.value = user.email || '';
                if (phoneInput) phoneInput.value = user.phone || '';
                if (genderInput) genderInput.value = user.gender || '';
            }

            if (profilePicPreview && user.profilePicture) {
                profilePicPreview.src = user.profilePicture;
                profilePicPreview.style.display = 'block';
            }
        } catch (err) {
            App.showToast('Failed to load profile', 'error');
        }
    }

    // Update profile
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = profileForm.querySelector('input[name="name"]').value.trim();
            const email = profileForm.querySelector('input[name="email"]').value.trim();
            const phone = profileForm.querySelector('input[name="phone"]').value.trim();
            const gender = profileForm.querySelector('select[name="gender"]').value;

            try {
                const body = { name, email, phone, gender };
                const data = await App.api('/api/profile', {
                    method: 'PUT',
                    body: JSON.stringify(body),
                });
                localStorage.setItem('user', JSON.stringify(data.user || data));
                App.showToast('Profile updated');
                loadProfile();
            } catch (err) {
                App.showToast(err.message || 'Failed to update profile', 'error');
            }
        });
    }

    // Change password
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = passwordForm.querySelector('input[name="currentPassword"]').value;
            const newPassword = passwordForm.querySelector('input[name="newPassword"]').value;
            const confirmPassword = passwordForm.querySelector('input[name="confirmPassword"]')
                ? passwordForm.querySelector('input[name="confirmPassword"]').value
                : null;

            if (!currentPassword || !newPassword) {
                App.showToast('Please fill all fields', 'error');
                return;
            }
            if (newPassword.length < 6) {
                App.showToast('New password must be at least 6 characters', 'error');
                return;
            }
            if (confirmPassword && newPassword !== confirmPassword) {
                App.showToast('Passwords do not match', 'error');
                return;
            }

            try {
                await App.api('/api/profile/password', {
                    method: 'PUT',
                    body: JSON.stringify({ currentPassword, newPassword }),
                });
                App.showToast('Password changed successfully');
                passwordForm.reset();
            } catch (err) {
                App.showToast(err.message || 'Failed to change password', 'error');
            }
        });
    }

    // Profile picture preview (client-side base64)
    if (profilePicInput) {
        profilePicInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                App.showToast('Image must be under 2MB', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                if (profilePicPreview) {
                    profilePicPreview.src = reader.result;
                    profilePicPreview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            App.logout();
        });
    }

    loadProfile();
});

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
