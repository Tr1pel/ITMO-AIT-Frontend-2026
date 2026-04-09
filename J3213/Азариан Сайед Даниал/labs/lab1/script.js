const STORAGE_USERS_KEY = "eventpass_users";
const STORAGE_CURRENT_USER_KEY = "eventpass_current_user";

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
  return users.find((user) => user.id === userId) || null;
}

function getCabinetUrlForUser(user) {
  return user && user.accountType === "organizer" ? "organizer.html" : "profile.html";
}

function updateStoredUser(updatedUser) {
  const users = loadUsers();
  const nextUsers = users.map((user) => (user.id === updatedUser.id ? updatedUser : user));
  saveUsers(nextUsers);
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

function initAuthPage() {
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (!loginForm || !registerForm) {
    return;
  }

  const existingUser = getCurrentUser();
  if (existingUser) {
    window.location.href = getCabinetUrlForUser(existingUser);
    return;
  }

  const authMessage = document.getElementById("authMessage");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const registerName = document.getElementById("registerName");
  const registerEmail = document.getElementById("registerEmail");
  const registerPhone = document.getElementById("registerPhone");
  const registerPassword = document.getElementById("registerPassword");
  const registerPasswordConfirm = document.getElementById("registerPasswordConfirm");

  function showAuthMessage(text, type) {
    if (!authMessage) return;
    authMessage.innerHTML = `<div class="alert alert-${type} py-2 mb-0" role="alert">${escapeHtml(text)}</div>`;
  }

  function clearAuthMessage() {
    if (!authMessage) return;
    authMessage.innerHTML = "";
  }

  if (loginTab && registerTab) {
    function switchToLogin() {
      loginTab.classList.add("active", "btn-primary");
      loginTab.classList.remove("btn-outline-primary");
      registerTab.classList.remove("active", "btn-primary");
      registerTab.classList.add("btn-outline-primary");

      loginForm.classList.remove("d-none");
      registerForm.classList.add("d-none");
      clearAuthMessage();
    }

    function switchToRegister() {
      registerTab.classList.add("active", "btn-primary");
      registerTab.classList.remove("btn-outline-primary");
      loginTab.classList.remove("active", "btn-primary");
      loginTab.classList.add("btn-outline-primary");

      registerForm.classList.remove("d-none");
      loginForm.classList.add("d-none");
      clearAuthMessage();
    }

    loginTab.addEventListener("click", switchToLogin);
    registerTab.addEventListener("click", switchToRegister);
  }

  document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", () => {
      const inputGroup = button.closest(".input-group");
      if (!inputGroup) return;

      const input = inputGroup.querySelector(".password-input");
      if (!input) return;

      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      button.textContent = isPassword ? "Скрыть" : "Показать";
    });
  });

  if (registerPassword && registerPasswordConfirm) {
    function validatePasswordMatch() {
      const isMatch = registerPassword.value === registerPasswordConfirm.value;
      registerPasswordConfirm.setCustomValidity(isMatch ? "" : "Пароли не совпадают");
    }

    registerPassword.addEventListener("input", validatePasswordMatch);
    registerPasswordConfirm.addEventListener("input", validatePasswordMatch);
  }

  document.querySelectorAll(".needs-validation").forEach((form) => {
    form.addEventListener("submit", (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }

      form.classList.add("was-validated");
    });
  });

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!loginForm.checkValidity()) {
      return;
    }

    const users = loadUsers();
    const email = loginEmail.value.trim().toLowerCase();
    const password = loginPassword.value;

    const user = users.find((item) => item.email.toLowerCase() === email && item.password === password);
    if (!user) {
      showAuthMessage("Неверный email или пароль.", "danger");
      return;
    }

    setCurrentUserId(user.id);
    showAuthMessage("Вход выполнен успешно. Переходим в личный кабинет...", "success");
    setTimeout(() => {
      window.location.href = getCabinetUrlForUser(user);
    }, 350);
  });

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!registerForm.checkValidity()) {
      return;
    }

    if (registerPassword.value !== registerPasswordConfirm.value) {
      registerPasswordConfirm.setCustomValidity("Пароли не совпадают");
      registerForm.classList.add("was-validated");
      showAuthMessage("Пароли должны совпадать.", "danger");
      return;
    }

    const users = loadUsers();
    const email = registerEmail.value.trim().toLowerCase();
    const accountTypeInput = document.querySelector('input[name="accountType"]:checked');
    const accountType = accountTypeInput ? accountTypeInput.value : "buyer";

    if (users.some((item) => item.email.toLowerCase() === email)) {
      showAuthMessage("Пользователь с таким email уже зарегистрирован.", "warning");
      return;
    }

    const newUser = {
      id: generateId("user"),
      name: registerName.value.trim(),
      email,
      phone: registerPhone.value.trim(),
      password: registerPassword.value,
      accountType,
      tickets: [],
      refunds: [],
      organizerEvents: [],
    };

    users.push(newUser);
    saveUsers(users);
    setCurrentUserId(newUser.id);

    showAuthMessage("Регистрация успешна. Переходим в личный кабинет...", "success");
    setTimeout(() => {
      window.location.href = getCabinetUrlForUser(newUser);
    }, 350);
  });
}

function initProfilePage() {
  const profileName = document.getElementById("profileName");
  if (!profileName) {
    return;
  }

  let currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "auth.html";
    return;
  }
  if (currentUser.accountType === "organizer") {
    window.location.href = "organizer.html";
    return;
  }

  const profileAvatar = document.getElementById("profileAvatar");
  const profileEmail = document.getElementById("profileEmail");
  const activeTicketsCount = document.getElementById("activeTicketsCount");
  const refundRequestsCount = document.getElementById("refundRequestsCount");
  const successfulPurchasesCount = document.getElementById("successfulPurchasesCount");
  const ticketsList = document.getElementById("ticketsList");
  const returnsTableBody = document.getElementById("returnsTableBody");
  const logoutBtn = document.getElementById("logoutBtn");

  const refundModalElement = document.getElementById("refundModal");
  const refundForm = document.getElementById("refundForm");
  const refundReason = document.getElementById("refundReason");
  const refundEventName = document.getElementById("refundEventName");
  const refundTicketId = document.getElementById("refundTicketId");
  const refundModal = refundModalElement ? new bootstrap.Modal(refundModalElement) : null;

  let selectedTicketId = null;

  function getInitials(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "--";
  }

  function persistCurrentUser() {
    updateStoredUser(currentUser);
  }

  function renderProfile() {
    profileName.textContent = currentUser.name;
    profileEmail.textContent = currentUser.email;
    profileAvatar.textContent = getInitials(currentUser.name);

    const tickets = currentUser.tickets || [];
    const refunds = currentUser.refunds || [];
    const activeCount = tickets.length;

    activeTicketsCount.textContent = String(activeCount);
    refundRequestsCount.textContent = String(refunds.length);
    successfulPurchasesCount.textContent = String(tickets.length);

    if (!tickets.length) {
      ticketsList.innerHTML = '<div class="col-12"><div class="empty-state">У вас пока нет купленных билетов.</div></div>';
    } else {
      ticketsList.innerHTML = tickets
        .map((ticket) => {
          const refundButton = ticket.canRefund
            ? `<button class="btn btn-sm btn-outline-danger request-refund-btn" type="button" data-ticket-id="${escapeHtml(ticket.id)}">Оформить возврат</button>`
            : '<button class="btn btn-sm btn-outline-secondary" type="button" disabled>Заявка отправлена</button>';

          return `
            <div class="col-md-6">
              <article class="ticket-item h-100">
                <p class="small text-secondary mb-2">${escapeHtml(ticket.category)} • ${escapeHtml(ticket.date)} • ${escapeHtml(ticket.city)}</p>
                <h3 class="h5 mb-2">${escapeHtml(ticket.eventName)}</h3>
                <p class="mb-3 small">${escapeHtml(ticket.seat)} • Заказ #${escapeHtml(ticket.id)}</p>
                <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                  <span class="badge text-bg-success">Оплачен</span>
                  ${refundButton}
                </div>
              </article>
            </div>
          `;
        })
        .join("");
    }

    if (!refunds.length) {
      returnsTableBody.innerHTML = '<tr><td colspan="5"><div class="empty-state my-2">Заявок на возврат пока нет.</div></td></tr>';
    } else {
      returnsTableBody.innerHTML = refunds
        .map((refund) => {
          return `
            <tr>
              <td>#${escapeHtml(refund.ticketId)}</td>
              <td>${escapeHtml(refund.eventName)}</td>
              <td>${escapeHtml(refund.requestedAt)}</td>
              <td>${refund.amount ? `${Number(refund.amount).toLocaleString("ru-RU")} ₽` : "Будет рассчитана"}</td>
              <td><span class="badge text-bg-secondary">В обработке</span></td>
            </tr>
          `;
        })
        .join("");
    }
  }

  if (ticketsList) {
    ticketsList.addEventListener("click", (event) => {
      const button = event.target.closest(".request-refund-btn");
      if (!button || !refundModal || !refundReason) return;

      selectedTicketId = button.dataset.ticketId || null;
      const ticket = (currentUser.tickets || []).find((item) => item.id === selectedTicketId);
      if (!ticket) return;

      refundEventName.textContent = ticket.eventName;
      refundTicketId.textContent = `#${ticket.id}`;
      refundReason.value = "";
      refundReason.classList.remove("is-invalid");
      refundModal.show();
    });
  }

  if (refundForm && refundReason) {
    refundForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!refundReason.value.trim()) {
        refundReason.classList.add("is-invalid");
        return;
      }

      refundReason.classList.remove("is-invalid");

      const ticket = (currentUser.tickets || []).find((item) => item.id === selectedTicketId);
      if (!ticket || !ticket.canRefund) {
        if (refundModal) refundModal.hide();
        return;
      }

      ticket.canRefund = false;

      currentUser.refunds = currentUser.refunds || [];
      currentUser.refunds.unshift({
        ticketId: ticket.id,
        eventName: ticket.eventName,
        requestedAt: new Date().toLocaleDateString("ru-RU"),
        amount: ticket.price,
        status: "processing",
      });

      persistCurrentUser();
      renderProfile();

      if (refundModal) refundModal.hide();
      selectedTicketId = null;
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (event) => {
      event.preventDefault();
      clearCurrentUserId();
      window.location.href = "auth.html";
    });
  }

  renderProfile();
}

function initOrganizerPage() {
  const organizerIdentity = document.getElementById("organizerIdentity");
  if (!organizerIdentity) {
    return;
  }

  let currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "auth.html";
    return;
  }
  if (currentUser.accountType !== "organizer") {
    window.location.href = "profile.html";
    return;
  }

  if (!Array.isArray(currentUser.organizerEvents)) {
    currentUser.organizerEvents = [];
    updateStoredUser(currentUser);
  }

  const organizerMessage = document.getElementById("organizerMessage");
  const createEventForm = document.getElementById("createEventForm");
  const eventNameInput = document.getElementById("eventNameInput");
  const eventCategoryInput = document.getElementById("eventCategoryInput");
  const eventDateInput = document.getElementById("eventDateInput");
  const eventCityInput = document.getElementById("eventCityInput");
  const eventVenueInput = document.getElementById("eventVenueInput");
  const eventPriceInput = document.getElementById("eventPriceInput");
  const organizerEventsList = document.getElementById("organizerEventsList");
  const organizerLogoutBtn = document.getElementById("organizerLogoutBtn");

  organizerIdentity.textContent = `${currentUser.name} • ${currentUser.email}`;

  function toReadableDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return date.toLocaleDateString("ru-RU");
  }

  function showOrganizerMessage(text, type) {
    if (!organizerMessage) return;
    organizerMessage.innerHTML = `<div class="alert alert-${type} py-2 px-3 mb-0">${escapeHtml(text)}</div>`;
    window.setTimeout(() => {
      organizerMessage.innerHTML = "";
    }, 2200);
  }

  function persistCurrentUser() {
    updateStoredUser(currentUser);
  }

  function renderOrganizerEvents() {
    const events = currentUser.organizerEvents || [];
    if (!events.length) {
      organizerEventsList.innerHTML = '<div class="empty-state">Вы еще не создали ни одного события.</div>';
      return;
    }

    organizerEventsList.innerHTML = events
      .map((eventItem) => {
        return `
          <article class="org-event-card">
            <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
              <div>
                <h3 class="h6 m-0">${escapeHtml(eventItem.name)}</h3>
                <p class="small text-secondary m-0">${escapeHtml(eventItem.category)} • ${escapeHtml(eventItem.date)} • ${escapeHtml(eventItem.city)}</p>
                <p class="small text-secondary m-0">${escapeHtml(eventItem.venue)} • ${Number(eventItem.price).toLocaleString("ru-RU")} ₽</p>
              </div>
              <span class="badge text-bg-light border">Опубликовано</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderOrganizerPage() {
    renderOrganizerEvents();
  }

  createEventForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!createEventForm.checkValidity()) {
      createEventForm.classList.add("was-validated");
      return;
    }

    const newEvent = {
      name: eventNameInput.value.trim(),
      category: eventCategoryInput.value,
      date: toReadableDate(eventDateInput.value),
      city: eventCityInput.value.trim(),
      venue: eventVenueInput.value.trim(),
      price: Number(eventPriceInput.value),
    };

    currentUser.organizerEvents.unshift(newEvent);
    persistCurrentUser();
    renderOrganizerPage();

    createEventForm.reset();
    createEventForm.classList.remove("was-validated");
    showOrganizerMessage("Событие создано и опубликовано.", "success");
  });

  if (organizerLogoutBtn) {
    organizerLogoutBtn.addEventListener("click", (event) => {
      event.preventDefault();
      clearCurrentUserId();
      window.location.href = "auth.html";
    });
  }

  renderOrganizerPage();
}

function initHomeNavAuthState() {
  const guestNavActions = document.getElementById("guestNavActions");
  const userNavActions = document.getElementById("userNavActions");
  const userCabinetLink = document.getElementById("userCabinetLink");

  if (!guestNavActions || !userNavActions || !userCabinetLink) {
    return;
  }

  const currentUser = getCurrentUser();
  if (currentUser) {
    const cabinetUrl = getCabinetUrlForUser(currentUser);
    userCabinetLink.href = cabinetUrl;
    userCabinetLink.textContent = currentUser.accountType === "organizer" ? "Кабинет организатора" : "Личный кабинет";

    guestNavActions.classList.add("d-none");
    userNavActions.classList.remove("d-none");
    userNavActions.classList.add("d-flex");
  } else {
    guestNavActions.classList.remove("d-none");
    guestNavActions.classList.add("d-flex");
    userNavActions.classList.add("d-none");
    userNavActions.classList.remove("d-flex");
  }
}

function initHomePurchaseActions() {
  const buyButtons = document.querySelectorAll(".buy-ticket-btn");
  if (!buyButtons.length) {
    return;
  }

  buyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        window.location.href = "auth.html";
        return;
      }
      if (currentUser.accountType === "organizer") {
        window.location.href = "organizer.html";
        return;
      }

      const users = loadUsers();
      const userIndex = users.findIndex((user) => user.id === currentUser.id);
      if (userIndex < 0) {
        clearCurrentUserId();
        window.location.href = "auth.html";
        return;
      }

      const ticket = {
        id: `EP-${String(Date.now()).slice(-6)}`,
        category: button.dataset.category || "Мероприятие",
        eventName: button.dataset.eventName || "Событие",
        date: button.dataset.date || "Скоро",
        city: button.dataset.city || "Не указан",
        seat: button.dataset.seat || "Электронный билет",
        price: Number(button.dataset.price || 0),
        status: "paid",
        canRefund: true,
      };

      users[userIndex].tickets = Array.isArray(users[userIndex].tickets) ? users[userIndex].tickets : [];
      users[userIndex].tickets.unshift(ticket);
      saveUsers(users);

      window.location.href = "profile.html";
    });
  });
}

initAuthPage();
initProfilePage();
initOrganizerPage();
initHomeNavAuthState();
initHomePurchaseActions();
