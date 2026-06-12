/* =============================================
   BIRTHDAY BUDDY — DASHBOARD SCRIPT
   =============================================
   Replace GOOGLE_CLIENT_ID with your real
   Client ID from Google Cloud Console:
   https://console.cloud.google.com/apis/credentials
   ============================================= */

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';

/* Base URL for invite links — update this once the site is deployed.
   e.g. 'https://birthdaybuddy.app' or your GitHub Pages URL          */
const SITE_URL = (() => {
  const origin = location.origin;
  return origin.startsWith('file://') ? 'https://your-site-url.com' : origin;
})();

/* =============================================
   AUTH HELPERS
   ============================================= */
function getUser() {
  try { return JSON.parse(localStorage.getItem('bb_user')); }
  catch { return null; }
}

function decodeJWT(token) {
  const payload = token.split('.')[1];
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json);
}

/* Auth guard — redirect if not signed in */
(function authGuard() {
  if (!getUser()) {
    window.location.replace('index.html');
  }
})();

/* =============================================
   PROFILE STORAGE
   ============================================= */
function getProfile() {
  try { return JSON.parse(localStorage.getItem(`bb_profile_${getUser().sub}`)); }
  catch { return null; }
}

function saveProfile(data) {
  localStorage.setItem(`bb_profile_${getUser().sub}`, JSON.stringify(data));
}

/* =============================================
   GROUP STORAGE
   ============================================= */
function storageKey() {
  return `bb_groups_${getUser().sub}`;
}

function getGroups() {
  try { return JSON.parse(localStorage.getItem(storageKey())) || []; }
  catch { return []; }
}

function saveGroups(groups) {
  localStorage.setItem(storageKey(), JSON.stringify(groups));
}

function getMembers(groupId) {
  try { return JSON.parse(localStorage.getItem(`bb_members_${groupId}`)) || []; }
  catch { return []; }
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function generateInviteUrl(groupId, groupName) {
  return `${SITE_URL}/index.html?join=${groupId}&group=${encodeURIComponent(groupName)}`;
}

/* =============================================
   UI HELPERS
   ============================================= */
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatBirthday(dateStr) {
  const [, month, day] = dateStr.split('-');
  const d = new Date(2000, parseInt(month) - 1, parseInt(day));
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

function isTodaysBirthday(dateStr) {
  const today = new Date();
  const [, month, day] = dateStr.split('-');
  return parseInt(month) === today.getMonth() + 1 && parseInt(day) === today.getDate();
}

/* =============================================
   PROFILE CARD UI
   ============================================= */
function initProfileCard() {
  const card        = document.getElementById('profile-card');
  const form        = document.getElementById('profile-form');
  const nameInput   = document.getElementById('profile-name');
  const bdayInput   = document.getElementById('profile-birthday');
  const waInput     = document.getElementById('profile-whatsapp');
  const statusBadge = document.getElementById('profile-status');
  const saveBtn     = document.getElementById('profile-save-btn');

  const profile = getProfile();
  const user    = getUser();

  card.hidden = false;

  if (profile) {
    // Already complete — show read-only summary
    nameInput.value   = profile.name;
    bdayInput.value   = profile.birthday;
    waInput.value     = profile.whatsapp;
    [nameInput, bdayInput, waInput].forEach(el => el.setAttribute('readonly', 'true'));
    saveBtn.hidden    = true;
    statusBadge.hidden = false;
    card.classList.add('profile-card--complete');
  } else {
    // Pre-fill name from Google
    if (user?.name) nameInput.value = user.name;
  }

  // Validation helpers
  function validateProfileField(el, errorId, check, msg) {
    const err = document.getElementById(errorId);
    if (!check(el.value)) { err.textContent = msg; el.setAttribute('aria-invalid', 'true'); return false; }
    err.textContent = ''; el.setAttribute('aria-invalid', 'false'); return true;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const okName = validateProfileField(nameInput, 'profile-name-error',    v => v.trim().length >= 2, 'Please enter your full name.');
    const okBday = validateProfileField(bdayInput, 'profile-birthday-error', v => !!v, 'Please enter your birthday.');
    const okWa   = validateProfileField(waInput,   'profile-whatsapp-error', v => /^\+?[\d\s\-().]{7,20}$/.test(v.trim()), 'Please enter a valid number.');
    if (!okName || !okBday || !okWa) return;

    saveBtn.classList.add('is-loading');
    setTimeout(() => {
      saveProfile({ name: nameInput.value.trim(), birthday: bdayInput.value, whatsapp: waInput.value.trim() });
      saveBtn.classList.remove('is-loading');
      saveBtn.hidden = true;
      statusBadge.hidden = false;
      card.classList.add('profile-card--complete');
      [nameInput, bdayInput, waInput].forEach(el => el.setAttribute('readonly', 'true'));
    }, 500);
  });
}

/* =============================================
   POPULATE USER INFO
   ============================================= */
function populateUserInfo() {
  const user = getUser();
  if (!user) return;

  const firstName = user.given_name || user.name?.split(' ')[0] || 'there';
  document.getElementById('welcome-name').textContent = firstName;
  document.getElementById('dash-username').textContent = user.name || user.email;
  document.getElementById('dash-email').textContent = user.email || '';

  const avatar = document.getElementById('dash-avatar');
  if (user.picture) {
    avatar.src = user.picture;
    avatar.alt = user.name || 'Your avatar';
  } else {
    avatar.style.display = 'none';
  }
}

/* =============================================
   RENDER GROUPS
   ============================================= */
function renderGroups() {
  const groups = getGroups();
  const grid = document.getElementById('groups-grid');
  const empty = document.getElementById('dash-empty');
  const countBadge = document.getElementById('group-count');

  countBadge.textContent = groups.length ? `${groups.length} group${groups.length !== 1 ? 's' : ''}` : '';
  countBadge.hidden = groups.length === 0;

  if (groups.length === 0) {
    empty.hidden = false;
    grid.innerHTML = '';
    return;
  }

  empty.hidden = true;
  grid.innerHTML = groups.map(g => renderGroupCard(g)).join('');

  // Bind card events
  groups.forEach(g => {
    document.getElementById(`copy-${g.id}`)?.addEventListener('click', () => copyInvite(g.id, g.name));
    document.getElementById(`members-${g.id}`)?.addEventListener('click', () => openMembersModal(g.id, g.name));
    document.getElementById(`delete-${g.id}`)?.addEventListener('click', () => openDeleteModal(g.id, g.name));
  });
}

function renderGroupCard(group) {
  const members = getMembers(group.id);
  const inviteUrl = generateInviteUrl(group.id, group.name);

  return `
    <article class="group-card" aria-label="Group: ${group.name}">
      <div class="group-card-top">
        <h3 class="group-name">${escapeHtml(group.name)}</h3>
        <button class="group-delete-btn" id="delete-${group.id}" aria-label="Delete group ${group.name}" title="Delete group">🗑</button>
      </div>

      <div class="group-meta">
        <div class="group-meta-item">
          <span aria-hidden="true">👥</span>
          <strong>${members.length}</strong> member${members.length !== 1 ? 's' : ''}
        </div>
        <div class="group-meta-item">
          <span aria-hidden="true">📅</span>
          Created ${formatDate(group.createdAt)}
        </div>
      </div>

      <div class="group-invite-section">
        <span class="group-invite-label">Invite Link</span>
        <div class="group-invite-row">
          <input
            type="text"
            class="group-invite-input"
            value="${inviteUrl}"
            readonly
            aria-label="Invite link for ${group.name}"
          />
          <button class="copy-card-btn" id="copy-${group.id}" aria-label="Copy invite link for ${group.name}">
            📋 Copy
          </button>
        </div>
      </div>

      <div class="group-card-footer">
        <button class="view-members-btn" id="members-${group.id}" aria-label="View members of ${group.name}">
          View Members (${members.length})
        </button>
      </div>
    </article>
  `;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* =============================================
   COPY INVITE LINK
   ============================================= */
function copyInvite(groupId, groupName, btnId = `copy-${groupId}`) {
  const url = generateInviteUrl(groupId, groupName);
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const original = btn.innerHTML;
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = original; btn.classList.remove('copied'); }, 2500);
  }).catch(() => {
    // Fallback for non-HTTPS
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

/* =============================================
   CREATE GROUP MODAL
   ============================================= */
const createModal = document.getElementById('create-modal');
const createForm  = document.getElementById('create-group-form');
const createInput = document.getElementById('new-group-name');
const createError = document.getElementById('new-group-error');

function openCreateModal() {
  createModal.hidden = false;
  createForm.reset();
  createError.textContent = '';
  setTimeout(() => createInput.focus(), 50);
  document.body.style.overflow = 'hidden';
}

function closeCreateModal() {
  createModal.hidden = true;
  document.body.style.overflow = '';
}

document.getElementById('create-modal-close').addEventListener('click', closeCreateModal);
document.getElementById('new-group-btn-hero').addEventListener('click', openCreateModal);
document.getElementById('new-group-btn-empty').addEventListener('click', openCreateModal);

createForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = createInput.value.trim();

  if (!name) {
    createError.textContent = 'Please enter a group name.';
    createInput.focus();
    return;
  }

  const submitBtn = createForm.querySelector('button[type="submit"]');
  submitBtn.classList.add('is-loading');

  setTimeout(() => {
    const groups  = getGroups();
    const newGroup = { id: generateId(), name, createdAt: new Date().toISOString() };
    groups.unshift(newGroup);
    saveGroups(groups);

    // Auto-add the owner's saved profile as the first member
    const profile = getProfile();
    if (profile) {
      localStorage.setItem(`bb_members_${newGroup.id}`, JSON.stringify([{
        ...profile,
        groupName: name,
        joinedAt: new Date().toISOString(),
      }]));
    }

    submitBtn.classList.remove('is-loading');
    closeCreateModal();
    renderGroups();

    // Auto-open invite modal for the new group
    setTimeout(() => openInviteModal(newGroup.id, newGroup.name), 200);
  }, 600);
});

/* =============================================
   INVITE MODAL
   ============================================= */
const inviteModal = document.getElementById('invite-modal');
let _inviteGroupId = null;
let _inviteGroupName = null;

function openInviteModal(groupId, groupName) {
  _inviteGroupId = groupId;
  _inviteGroupName = groupName;

  const url = generateInviteUrl(groupId, groupName);
  document.getElementById('invite-url-input').value = url;
  document.getElementById('invite-modal-title').textContent = `Invite to ${groupName}`;

  const copyBtn = document.getElementById('copy-invite-btn');
  copyBtn.querySelector('.copy-label').textContent = 'Copy';
  copyBtn.classList.remove('copied');

  inviteModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeInviteModal() {
  inviteModal.hidden = true;
  document.body.style.overflow = '';
}

document.getElementById('invite-modal-close').addEventListener('click', closeInviteModal);

document.getElementById('copy-invite-btn').addEventListener('click', () => {
  const url = document.getElementById('invite-url-input').value;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('copy-invite-btn');
    btn.querySelector('.copy-label').textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.querySelector('.copy-label').textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2500);
  });
});

/* =============================================
   MEMBERS MODAL
   ============================================= */
const membersModal = document.getElementById('members-modal');
let _membersGroupId = null;
let _membersGroupName = null;

function openMembersModal(groupId, groupName) {
  _membersGroupId = groupId;
  _membersGroupName = groupName;

  document.getElementById('members-modal-title').textContent = groupName;
  document.getElementById('members-modal-group-name').textContent = 'All registered members in this group.';

  const members = getMembers(groupId);
  const container = document.getElementById('members-list-container');

  if (members.length === 0) {
    container.innerHTML = `
      <div class="members-empty">
        <div class="members-empty-icon">🎈</div>
        <p>No members yet. Share the invite link to get your crew registered!</p>
      </div>`;
  } else {
    container.innerHTML = `
      <ul class="members-list" role="list" aria-label="Members of ${escapeHtml(groupName)}">
        ${members.map(m => `
          <li class="member-item">
            <div class="member-initial" aria-hidden="true">${m.name.charAt(0).toUpperCase()}</div>
            <div class="member-details">
              <div class="member-name">
                ${escapeHtml(m.name)}
                ${isTodaysBirthday(m.birthday) ? '<span class="member-birthday-badge">🎂 Today!</span>' : ''}
              </div>
              <div class="member-meta">
                <span>🗓 ${formatBirthday(m.birthday)}</span>
                <span>📱 ${escapeHtml(m.whatsapp)}</span>
              </div>
            </div>
          </li>
        `).join('')}
      </ul>`;
  }

  membersModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeMembersModal() {
  membersModal.hidden = true;
  document.body.style.overflow = '';
}

document.getElementById('members-modal-close').addEventListener('click', closeMembersModal);
document.getElementById('members-copy-invite-btn').addEventListener('click', () => {
  if (_membersGroupId) copyInvite(_membersGroupId, _membersGroupName, 'members-copy-invite-btn');
});

/* =============================================
   DELETE MODAL
   ============================================= */
const deleteModal = document.getElementById('delete-modal');
let _deleteGroupId = null;

function openDeleteModal(groupId, groupName) {
  _deleteGroupId = groupId;
  document.getElementById('delete-group-name').textContent = groupName;
  deleteModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
  deleteModal.hidden = true;
  document.body.style.overflow = '';
  _deleteGroupId = null;
}

document.getElementById('delete-cancel-btn').addEventListener('click', closeDeleteModal);
document.getElementById('delete-confirm-btn').addEventListener('click', () => {
  if (!_deleteGroupId) return;
  const groups = getGroups().filter(g => g.id !== _deleteGroupId);
  localStorage.removeItem(`bb_members_${_deleteGroupId}`);
  saveGroups(groups);
  closeDeleteModal();
  renderGroups();
});

/* =============================================
   CLOSE MODALS ON BACKDROP CLICK / ESC
   ============================================= */
[createModal, inviteModal, membersModal, deleteModal].forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.hidden = true;
      document.body.style.overflow = '';
    }
  });
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  [createModal, inviteModal, membersModal, deleteModal].forEach(m => {
    if (!m.hidden) { m.hidden = true; document.body.style.overflow = ''; }
  });
});

/* =============================================
   SIGN OUT
   ============================================= */
document.getElementById('signout-btn').addEventListener('click', () => {
  if (GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID') {
    google.accounts.id.disableAutoSelect();
  }
  localStorage.removeItem('bb_user');
  window.location.replace('index.html');
});

/* =============================================
   INIT
   ============================================= */
populateUserInfo();
initProfileCard();
renderGroups();
