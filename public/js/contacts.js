// ========================================
// contacts.js - Contact management
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    if (!App.checkAuth()) return;

    const contactList = document.getElementById('contact-list');
    const contactForm = document.getElementById('contact-form');
    const searchInput = document.getElementById('contact-search');
    const emptyState = document.getElementById('empty-state');
    const formTitle = document.getElementById('form-title');
    let editingId = null;

    // Load and render contacts
    async function loadContacts() {
        try {
            const data = await App.api('/api/contacts');
            const contacts = Array.isArray(data) ? data : (data.contacts || []);
            renderContacts(contacts);
        } catch (err) {
            App.showToast('Failed to load contacts', 'error');
        }
    }

    function renderContacts(contacts) {
        if (!contactList) return;
        contactList.innerHTML = '';

        if (contacts.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        contacts.forEach(c => {
            const card = document.createElement('div');
            card.className = 'contact-card';
            card.innerHTML = `
                <div class="contact-info">
                    <h3>${escapeHtml(c.name)}</h3>
                    <p>${escapeHtml(c.phone)}</p>
                    <p class="contact-relation">${escapeHtml(c.relation || '')}</p>
                </div>
                <div class="contact-actions">
                    <a href="tel:${c.phone}" class="btn-call" title="Call">&#128222;</a>
                    <button class="btn-edit" data-id="${c._id}" title="Edit">&#9998;</button>
                    <button class="btn-delete" data-id="${c._id}" title="Delete">&#128465;</button>
                </div>
            `;
            contactList.appendChild(card);
        });

        // Bind edit/delete
        contactList.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => editContact(btn.dataset.id));
        });
        contactList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteContact(btn.dataset.id));
        });
    }

    // Add / Update contact
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = contactForm.querySelector('input[name="name"]').value.trim();
            const phone = contactForm.querySelector('input[name="phone"]').value.trim();
            const email = contactForm.querySelector('input[name="email"]')
                ? contactForm.querySelector('input[name="email"]').value.trim()
                : '';
            const relation = contactForm.querySelector('input[name="relation"]')
                ? contactForm.querySelector('input[name="relation"]').value.trim()
                : '';

            if (!name || !phone) {
                App.showToast('Name and phone are required', 'error');
                return;
            }

            try {
                const body = { name, phone, email, relation };
                if (editingId) {
                    await App.api(`/api/contacts/${editingId}`, {
                        method: 'PUT',
                        body: JSON.stringify(body),
                    });
                    App.showToast('Contact updated');
                } else {
                    await App.api('/api/contacts', {
                        method: 'POST',
                        body: JSON.stringify(body),
                    });
                    App.showToast('Contact added');
                }
                contactForm.reset();
                editingId = null;
                if (formTitle) formTitle.textContent = 'Add Contact';
                loadContacts();
            } catch (err) {
                App.showToast(err.message || 'Failed to save contact', 'error');
            }
        });
    }

    async function editContact(id) {
        try {
            const data = await App.api('/api/contacts');
            const contacts = Array.isArray(data) ? data : (data.contacts || []);
            const contact = contacts.find(c => c._id === id);
            if (!contact) return;

            editingId = id;
            if (formTitle) formTitle.textContent = 'Edit Contact';
            if (contactForm) {
                contactForm.querySelector('input[name="name"]').value = contact.name || '';
                contactForm.querySelector('input[name="phone"]').value = contact.phone || '';
                const emailInput = contactForm.querySelector('input[name="email"]');
                if (emailInput) emailInput.value = contact.email || '';
                const relInput = contactForm.querySelector('input[name="relation"]');
                if (relInput) relInput.value = contact.relation || '';
            }
            contactForm.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            App.showToast('Failed to load contact', 'error');
        }
    }

    async function deleteContact(id) {
        if (!confirm('Are you sure you want to delete this contact?')) return;
        try {
            await App.api(`/api/contacts/${id}`, { method: 'DELETE' });
            App.showToast('Contact deleted');
            loadContacts();
        } catch (err) {
            App.showToast(err.message || 'Failed to delete contact', 'error');
        }
    }

    // Search
    if (searchInput) {
        searchInput.addEventListener('input', async () => {
            const q = searchInput.value.trim().toLowerCase();
            try {
                const data = await App.api('/api/contacts');
                const contacts = Array.isArray(data) ? data : (data.contacts || []);
                const filtered = contacts.filter(c =>
                    c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
                );
                renderContacts(filtered);
            } catch (err) {
                console.warn('Search failed');
            }
        });
    }

    loadContacts();
});

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
