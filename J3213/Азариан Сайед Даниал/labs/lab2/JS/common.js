const STORAGE_USERS_KEY = "eventpass_users";
const STORAGE_CURRENT_USER_KEY = "eventpass_current_user";
const API_BASE_URL = "http://localhost:3000";

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function loadUsers() {
  return readJSON(STORAGE_USERS_KEY, []);
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

function getCurrentUserId() {
  return localStorage.getItem(STORAGE_CURRENT_USER_KEY);
}

function setCurrentUserId(userId) {
  localStorage.setItem(STORAGE_CURRENT_USER_KEY, userId);
}

function clearCurrentUserId() {
  localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
}

function getCurrentUser() {
  const userId = getCurrentUserId();
  if (!userId) return null;

  const users = loadUsers();
  return users.find((user) => String(user.id) === String(userId)) || null;
}

function getCabinetUrlForUser(user) {
  return user && user.accountType === "organizer" ? "organizer.html" : "profile.html";
}

function updateStoredUser(updatedUser) {
  const users = loadUsers();
  const nextUsers = users.map((user) => (String(user.id) === String(updatedUser.id) ? updatedUser : user));
  saveUsers(nextUsers);
}

function upsertUserInStorage(user) {
  const users = loadUsers();
  const targetIndex = users.findIndex((item) => String(item.id) === String(user.id));
  if (targetIndex >= 0) {
    users[targetIndex] = user;
  } else {
    users.push(user);
  }
  saveUsers(users);
}

function sanitizeUser(user) {
  if (!user || typeof user !== "object") {
    return user;
  }

  const { password, ...safeUser } = user;
  return safeUser;
}

async function apiRequest(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  let payload = {};

  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }

  if (!response.ok) {
    const message = payload && payload.message ? payload.message : "Ошибка запроса к API.";
    throw new Error(message);
  }

  return payload;
}

function apiLogin(email, password) {
  return apiRequest("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  }).then((payload) => ({
    ...payload,
    user: sanitizeUser(payload.user),
  }));
}

function apiRegister(payload) {
  return apiRequest("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).then((response) => ({
    ...response,
    user: sanitizeUser(response.user),
  }));
}

async function persistUserToApi(user) {
  const payload = {
    name: user.name,
    email: user.email,
    phone: user.phone,
    accountType: user.accountType,
    tickets: Array.isArray(user.tickets) ? user.tickets : [],
    refunds: Array.isArray(user.refunds) ? user.refunds : [],
    organizerEvents: Array.isArray(user.organizerEvents) ? user.organizerEvents : [],
  };

  const savedUser = await apiRequest(`/users/${encodeURIComponent(String(user.id))}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const safeUser = sanitizeUser(savedUser);
  upsertUserInStorage(safeUser);
  return safeUser;
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

