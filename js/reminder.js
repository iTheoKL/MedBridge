/* ==========================================================================
   Reminders Module
   --------------------------------------------------------------------------
   The shared header behavior (user dropdown menu, active nav highlighting,
   dismissible alerts) lives in js/script.js, which this page also loads,
   so it isn't duplicated here.

   Everything below is scoped to reminders.html via the #remindersPage
   guard, so loading this file on any other page is a no-op.

   Data is persisted to localStorage as a flat array of reminder objects:
   { id, name, dosage, time, frequency, customFrequency, startDate,
     endDate, mealTiming, priority, notes, enabled, notifyOffset,
     log: { "YYYY-MM-DD": "taken" | "skipped" }, notifiedAt: { "YYYY-MM-DD": true },
     createdAt, updatedAt }
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.getElementById("remindersPage");
  if (!page) return; // Not on the Reminders page.

  const STORAGE_KEY = "medbridge_reminders_v1";

  // ---------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  const uid = () => `rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const todayISO = () => formatDate(new Date());

  function formatDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatTime12(hhmm) {
    if (!hhmm) return "";
    const [h, m] = hhmm.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }

  function formatFriendlyDate(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  // Escapes user-entered text before it is inserted via innerHTML.
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------
  function loadReminders() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("MedBridge: failed to read reminders from storage.", err);
      return [];
    }
  }

  function saveReminders() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    } catch (err) {
      console.error("MedBridge: failed to save reminders.", err);
      showToast("Could not save — your browser storage may be full.", "error");
    }
  }

  let reminders = loadReminders();
  let calendarViewDate = new Date();
  let selectedCalendarDate = null;

  // ---------------------------------------------------------------------
  // Scheduling logic
  // ---------------------------------------------------------------------

  // Is this reminder due on the given date at all (ignoring time of day)?
  function isScheduledOn(reminder, dateISO) {
    if (!reminder.enabled) return false;
    if (dateISO < reminder.startDate) return false;
    if (reminder.endDate && dateISO > reminder.endDate) return false;

    const date = new Date(`${dateISO}T00:00:00`);
    const start = new Date(`${reminder.startDate}T00:00:00`);

    switch (reminder.frequency) {
      case "weekly":
        return date.getDay() === start.getDay();
      case "monthly":
        return date.getDate() === start.getDate();
      // Daily, twice-daily, and custom all recur every day within the
      // active date range. "Twice Daily" and "Custom" are informational
      // labels here — for two distinct times a day, add a second
      // reminder; this keeps the data model simple and avoids a second
      // hidden time field the user never asked for.
      case "daily":
      case "twice-daily":
      case "custom":
      default:
        return true;
    }
  }

  // Returns 'taken' | 'skipped' | 'missed' | 'upcoming' | null (not
  // scheduled today) for the reminder as of right now.
  function getTodayStatus(reminder) {
    const today = todayISO();
    if (!isScheduledOn(reminder, today)) return null;

    const logged = reminder.log && reminder.log[today];
    if (logged === "taken") return "taken";
    if (logged === "skipped") return "skipped";

    const [h, m] = reminder.time.split(":").map(Number);
    const reminderTime = new Date();
    reminderTime.setHours(h, m, 0, 0);

    return new Date() > reminderTime ? "missed" : "upcoming";
  }

  // Finds the next date/time this reminder will fire, looking up to 120
  // days ahead. Used for the "Next Reminder Time" shown on each card.
  function getNextOccurrence(reminder) {
    const now = new Date();
    for (let i = 0; i < 120; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = formatDate(d);
      if (!isScheduledOn(reminder, iso)) continue;

      if (i === 0) {
        const [h, m] = reminder.time.split(":").map(Number);
        const dt = new Date();
        dt.setHours(h, m, 0, 0);
        const alreadyLogged = reminder.log && reminder.log[iso];
        if (dt > now && !alreadyLogged) return { date: iso, time: reminder.time };
        continue; // today's occurrence already passed or was logged
      }
      return { date: iso, time: reminder.time };
    }
    return null;
  }

  function rangesOverlap(a, b) {
    const aStart = a.startDate;
    const aEnd = a.endDate || "9999-12-31";
    const bStart = b.startDate;
    const bEnd = b.endDate || "9999-12-31";
    return aStart <= bEnd && bStart <= aEnd;
  }

  // ---------------------------------------------------------------------
  // Toast (validation / status messages)
  // ---------------------------------------------------------------------
  let toastTimer = null;
  function showToast(message, type = "default") {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = "toast show" + (type === "error" ? " toast--error" : type === "success" ? " toast--success" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  // ---------------------------------------------------------------------
  // Rendering: Stats
  // ---------------------------------------------------------------------
  function renderStats() {
    const today = todayISO();
    const total = reminders.length;
    const active = reminders.filter((r) => r.enabled && (!r.endDate || r.endDate >= today)).length;

    let completed = 0;
    let missed = 0;
    let upcoming = 0;

    reminders.forEach((r) => {
      const status = getTodayStatus(r);
      if (status === "taken" || status === "skipped") completed++;
      else if (status === "missed") missed++;
      else if (status === "upcoming") upcoming++;
    });

    $("statTotal").textContent = total;
    $("statActive").textContent = active;
    $("statCompleted").textContent = completed;
    $("statMissed").textContent = missed;
    $("statUpcoming").textContent = upcoming;
  }

  // ---------------------------------------------------------------------
  // Rendering: Today's Schedule
  // ---------------------------------------------------------------------
  function renderTodaySchedule() {
    const list = $("scheduleList");
    const empty = $("scheduleEmpty");
    const today = todayISO();

    const todays = reminders
      .filter((r) => isScheduledOn(r, today))
      .map((r) => ({ r, status: getTodayStatus(r) }))
      .sort((a, b) => a.r.time.localeCompare(b.r.time));

    list.innerHTML = "";

    if (todays.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    const labelFor = { taken: "Completed", skipped: "Skipped", missed: "Missed", upcoming: "Upcoming" };
    const classFor = { taken: "completed", skipped: "completed", missed: "missed", upcoming: "upcoming" };

    todays.forEach(({ r, status }) => {
      const li = document.createElement("li");
      const cls = classFor[status];
      li.className = `schedule-item schedule-item--${cls}`;
      li.innerHTML = `
        <span class="schedule-item__time">${formatTime12(r.time)}</span>
        <span class="status-dot status-dot--${cls}" aria-hidden="true"></span>
        <span class="schedule-item__body">
          <p class="schedule-item__name">${escapeHtml(r.name)}</p>
          <p class="schedule-item__meta">${escapeHtml(r.dosage)} &middot; ${labelFor[status]}</p>
        </span>
      `;
      list.appendChild(li);
    });
  }

  // ---------------------------------------------------------------------
  // Rendering: Reminder cards (with search / filter / sort)
  // ---------------------------------------------------------------------
  function getFilteredSortedReminders() {
    const query = $("searchInput").value.trim().toLowerCase();
    const filter = $("filterSelect").value;
    const sort = $("sortSelect").value;
    const today = todayISO();

    let list = reminders.filter((r) => r.name.toLowerCase().includes(query));

    list = list.filter((r) => {
      const status = getTodayStatus(r);
      switch (filter) {
        case "active":
          return r.enabled && (!r.endDate || r.endDate >= today);
        case "completed":
          return status === "taken" || status === "skipped";
        case "missed":
          return status === "missed";
        case "today":
          return isScheduledOn(r, today);
        case "high-priority":
          return r.priority === "critical";
        default:
          return true;
      }
    });

    const priorityRank = { critical: 0, important: 1, normal: 2 };
    const freqRank = { daily: 0, "twice-daily": 1, weekly: 2, monthly: 3, custom: 4 };

    list = list.slice().sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "priority":
          return priorityRank[a.priority] - priorityRank[b.priority];
        case "frequency":
          return freqRank[a.frequency] - freqRank[b.frequency];
        case "time":
        default:
          return a.time.localeCompare(b.time);
      }
    });

    return list;
  }

  const FREQ_LABELS = {
    daily: "Daily",
    "twice-daily": "Twice Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    custom: "Custom",
  };
  const MEAL_LABELS = { before: "Before Food", after: "After Food", with: "With Food" };
  const PRIORITY_LABELS = { normal: "Normal", important: "Important", critical: "Critical" };
  const STATUS_BADGE = {
    taken: { label: "Completed", bg: "var(--success-tint)", fg: "var(--success-text)" },
    skipped: { label: "Skipped", bg: "var(--success-tint)", fg: "var(--success-text)" },
    missed: { label: "Missed", bg: "var(--danger-tint)", fg: "var(--danger-text)" },
    upcoming: { label: "Upcoming", bg: "var(--warning-tint)", fg: "var(--warning-text)" },
  };

  function buildReminderCard(r) {
    const today = todayISO();
    const status = getTodayStatus(r);
    const next = getNextOccurrence(r);

    const card = document.createElement("article");
    card.className = "reminder-card" + (r.enabled ? "" : " reminder-card--disabled");
    card.dataset.id = r.id;

    const freqLabel =
      r.frequency === "custom" && r.customFrequency
        ? `Custom &middot; ${escapeHtml(r.customFrequency)}`
        : FREQ_LABELS[r.frequency] || r.frequency;

    const badge = STATUS_BADGE[status];
    const statusBadgeHtml = badge
      ? `<span class="reminder-card__status" style="background:${badge.bg};color:${badge.fg}">${badge.label}</span>`
      : `<span class="reminder-card__status" style="background:var(--bg);color:var(--text-secondary)">Not scheduled today</span>`;

    const nextLabel = next
      ? `${next.date === today ? "Today" : formatFriendlyDate(next.date)} &middot; ${formatTime12(next.time)}`
      : "No upcoming occurrence";

    card.innerHTML = `
      <div class="reminder-card__top">
        <div>
          <p class="reminder-card__name">${escapeHtml(r.name)}</p>
          <p class="reminder-card__dosage">${escapeHtml(r.dosage)}</p>
        </div>
        <span class="reminder-card__time">${nextLabel}</span>
      </div>
      <div class="reminder-card__tags">
        <span class="tag tag--frequency">${freqLabel}</span>
        <span class="tag tag--meal">${MEAL_LABELS[r.mealTiming] || ""}</span>
        <span class="tag tag--priority-${r.priority}">${PRIORITY_LABELS[r.priority]}</span>
        ${statusBadgeHtml}
      </div>
      ${r.notes ? `<p class="reminder-card__notes">${escapeHtml(r.notes)}</p>` : ""}
      <div class="reminder-card__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-action="edit">Edit</button>
        <button type="button" class="btn btn--ghost btn--sm btn--danger" data-action="delete">Delete</button>
        <button type="button" class="btn btn--ghost btn--sm btn--success" data-action="taken">Mark as Taken</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="skip">Skip</button>
      </div>
    `;

    return card;
  }

  function renderReminderCards() {
    const container = $("reminderCards");
    const emptyState = $("reminderCardsEmpty");

    if (reminders.length === 0) {
      container.innerHTML = "";
      container.hidden = true;
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    container.hidden = false;

    const list = getFilteredSortedReminders();
    container.innerHTML = "";

    if (list.length === 0) {
      container.innerHTML = `<p class="empty-state">No reminders match your search or filter.</p>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    list.forEach((r) => fragment.appendChild(buildReminderCard(r)));
    container.appendChild(fragment);
  }

  // Delegated click handling for card actions (edit / delete / taken / skip)
  $("reminderCards").addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const card = event.target.closest(".reminder-card");
    if (!card) return;
    const id = card.dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") openModal(id);
    else if (action === "delete") deleteReminder(id, card);
    else if (action === "taken") logStatus(id, "taken");
    else if (action === "skip") logStatus(id, "skipped");
  });

  function deleteReminder(id, cardEl) {
    if (!window.confirm("Delete this reminder? This can't be undone.")) return;

    const finish = () => {
      reminders = reminders.filter((r) => r.id !== id);
      saveReminders();
      renderAll();
      showToast("Reminder deleted.", "success");
    };

    if (cardEl) {
      cardEl.classList.add("reminder-card--removing");
      setTimeout(finish, 180); // matches .reminder-card--removing animation duration
    } else {
      finish();
    }
  }

  function logStatus(id, status) {
    const r = reminders.find((x) => x.id === id);
    if (!r) return;
    r.log = r.log || {};
    r.log[todayISO()] = status;
    r.updatedAt = Date.now();
    saveReminders();
    renderAll();
    showToast(status === "taken" ? "Marked as taken." : "Marked as skipped.", "success");
  }

  // ---------------------------------------------------------------------
  // Rendering: Calendar
  // ---------------------------------------------------------------------
  function renderCalendar() {
    const grid = $("calendarGrid");
    const label = $("calendarMonthLabel");
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const today = todayISO();

    label.textContent = calendarViewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    grid.innerHTML = "";
    const fragment = document.createDocumentFragment();

    ["S", "M", "T", "W", "T", "F", "S"].forEach((d) => {
      const el = document.createElement("div");
      el.className = "calendar__weekday";
      el.textContent = d;
      fragment.appendChild(el);
    });

    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startOffset; i++) {
      const empty = document.createElement("div");
      empty.className = "calendar__day calendar__day--empty";
      fragment.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = formatDate(new Date(year, month, d));
      const scheduledCount = reminders.filter((r) => isScheduledOn(r, iso)).length;

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "calendar__day";
      if (iso === today) cell.classList.add("calendar__day--today");
      if (iso === selectedCalendarDate) cell.classList.add("calendar__day--selected");
      cell.dataset.date = iso;
      cell.setAttribute("aria-label", `${iso}${scheduledCount ? `, ${scheduledCount} reminder(s)` : ""}`);
      cell.textContent = String(d);

      if (scheduledCount > 0) {
        const dots = document.createElement("span");
        dots.className = "calendar__day-dots";
        for (let k = 0; k < Math.min(scheduledCount, 3); k++) {
          const dot = document.createElement("span");
          dot.className = "calendar__day-dot";
          dots.appendChild(dot);
        }
        cell.appendChild(dots);
      }

      fragment.appendChild(cell);
    }

    grid.appendChild(fragment);
  }

  function renderCalendarDayDetail() {
    const detail = $("calendarDayDetail");
    const title = $("calendarDayTitle");
    const list = $("calendarDayList");

    if (!selectedCalendarDate) {
      detail.hidden = true;
      return;
    }

    const dayReminders = reminders
      .filter((r) => isScheduledOn(r, selectedCalendarDate))
      .sort((a, b) => a.time.localeCompare(b.time));

    title.textContent = new Date(`${selectedCalendarDate}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    list.innerHTML = "";
    if (dayReminders.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No reminders scheduled.";
      list.appendChild(li);
    } else {
      dayReminders.forEach((r) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${escapeHtml(r.name)}</span><span>${formatTime12(r.time)}</span>`;
        list.appendChild(li);
      });
    }

    detail.hidden = false;
  }

  $("calendarGrid").addEventListener("click", (event) => {
    const cell = event.target.closest(".calendar__day:not(.calendar__day--empty)");
    if (!cell) return;
    selectedCalendarDate = cell.dataset.date;
    renderCalendar();
    renderCalendarDayDetail();
  });

  $("calPrevBtn").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
    renderCalendar();
  });

  $("calNextBtn").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
    renderCalendar();
  });

  // ---------------------------------------------------------------------
  // Modal: open / close / populate
  // ---------------------------------------------------------------------
  const overlay = $("reminderModalOverlay");
  const form = $("reminderForm");
  const ERROR_FIELDS = ["errorName", "errorDosage", "errorTime", "errorStartDate", "errorEndDate"];

  function clearErrors() {
    ERROR_FIELDS.forEach((id) => {
      $(id).textContent = "";
    });
  }

  function setError(id, message) {
    $(id).textContent = message;
  }

  function openModal(editId) {
    form.reset();
    clearErrors();
    $("reminderId").value = "";
    $("customFrequencyRow").hidden = true;
    $("customOffsetField").hidden = true;

    if (editId) {
      const r = reminders.find((x) => x.id === editId);
      if (!r) return;

      $("reminderModalTitle").textContent = "Edit Reminder";
      $("reminderId").value = r.id;
      $("fieldName").value = r.name;
      $("fieldDosage").value = r.dosage;
      $("fieldTime").value = r.time;
      $("fieldFrequency").value = r.frequency;
      $("fieldCustomFrequency").value = r.customFrequency || "";
      $("fieldStartDate").value = r.startDate;
      $("fieldEndDate").value = r.endDate || "";
      $("fieldMealTiming").value = r.mealTiming;
      $("fieldPriority").value = r.priority;
      $("fieldNotes").value = r.notes || "";
      $("fieldEnabled").checked = r.enabled;

      if (r.notifyOffset === 0 || r.notifyOffset === 5) {
        $("fieldNotifyOffset").value = String(r.notifyOffset);
      } else {
        $("fieldNotifyOffset").value = "custom";
        $("customOffsetField").hidden = false;
        $("fieldCustomOffset").value = r.notifyOffset;
      }

      if (r.frequency === "custom") $("customFrequencyRow").hidden = false;
    } else {
      $("reminderModalTitle").textContent = "Add Reminder";
      $("fieldStartDate").value = todayISO();
    }

    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => $("fieldName").focus());
    maybeRequestNotificationPermission();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  $("addReminderBtn").addEventListener("click", () => openModal(null));
  $("reminderModalClose").addEventListener("click", closeModal);
  $("reminderCancelBtn").addEventListener("click", closeModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) closeModal();
  });

  $("fieldFrequency").addEventListener("change", (event) => {
    $("customFrequencyRow").hidden = event.target.value !== "custom";
  });

  $("fieldNotifyOffset").addEventListener("change", (event) => {
    $("customOffsetField").hidden = event.target.value !== "custom";
  });

  // ---------------------------------------------------------------------
  // Validation + Save
  // ---------------------------------------------------------------------
  function validateForm(data, editingId) {
    clearErrors();
    let valid = true;

    if (!data.name.trim()) {
      setError("errorName", "Medicine name is required.");
      valid = false;
    }
    if (!data.dosage.trim()) {
      setError("errorDosage", "Dosage is required.");
      valid = false;
    }
    if (!data.time) {
      setError("errorTime", "Reminder time is required.");
      valid = false;
    }
    if (!data.startDate) {
      setError("errorStartDate", "Start date is required.");
      valid = false;
    }
    if (data.endDate && data.startDate && data.endDate < data.startDate) {
      setError("errorEndDate", "End date must be on or after the start date.");
      valid = false;
    }

    if (valid) {
      const duplicate = reminders.find(
        (r) =>
          r.id !== editingId &&
          r.name.trim().toLowerCase() === data.name.trim().toLowerCase() &&
          r.time === data.time &&
          rangesOverlap(r, data)
      );
      if (duplicate) {
        setError("errorTime", "A reminder for this medicine at this time already exists.");
        valid = false;
      }
    }

    return valid;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = {
      name: $("fieldName").value,
      dosage: $("fieldDosage").value,
      time: $("fieldTime").value,
      frequency: $("fieldFrequency").value,
      customFrequency: $("fieldCustomFrequency").value,
      startDate: $("fieldStartDate").value,
      endDate: $("fieldEndDate").value,
      mealTiming: $("fieldMealTiming").value,
      priority: $("fieldPriority").value,
      notes: $("fieldNotes").value,
      enabled: $("fieldEnabled").checked,
    };

    const offsetSel = $("fieldNotifyOffset").value;
    data.notifyOffset =
      offsetSel === "custom"
        ? Math.min(180, Math.max(1, parseInt($("fieldCustomOffset").value, 10) || 5))
        : parseInt(offsetSel, 10);

    const editingId = $("reminderId").value || null;
    if (!validateForm(data, editingId)) return;

    if (editingId) {
      const r = reminders.find((x) => x.id === editingId);
      Object.assign(r, data, { updatedAt: Date.now() });
      showToast("Reminder updated.", "success");
    } else {
      reminders.push({
        id: uid(),
        ...data,
        log: {},
        notifiedAt: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      showToast("Reminder added.", "success");
    }

    saveReminders();
    closeModal();
    renderAll();
  });

  // ---------------------------------------------------------------------
  // Search / filter / sort
  // ---------------------------------------------------------------------
  $("searchInput").addEventListener("input", renderReminderCards);
  $("filterSelect").addEventListener("change", renderReminderCards);
  $("sortSelect").addEventListener("change", renderReminderCards);

  // ---------------------------------------------------------------------
  // Browser notifications
  // ---------------------------------------------------------------------
  function maybeRequestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  function checkNotifications() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const now = new Date();
    const today = todayISO();
    let changed = false;

    reminders.forEach((r) => {
      if (!r.enabled || !isScheduledOn(r, today)) return;

      const [h, m] = r.time.split(":").map(Number);
      const reminderTime = new Date();
      reminderTime.setHours(h, m, 0, 0);
      const notifyTime = new Date(reminderTime.getTime() - (r.notifyOffset || 0) * 60000);

      r.notifiedAt = r.notifiedAt || {};
      if (r.notifiedAt[today]) return;

      // Fire once, within a 30s window after the scheduled notify time,
      // so a 15s polling interval never misses or double-fires it.
      if (now >= notifyTime && now - notifyTime < 30000) {
        try {
          new Notification("MedBridge Reminder", {
            body: `${r.name} (${r.dosage}) — ${formatTime12(r.time)}`,
          });
        } catch (err) {
          console.error("MedBridge: notification failed.", err);
        }
        r.notifiedAt[today] = true;
        changed = true;
      }
    });

    if (changed) saveReminders();
  }

  setInterval(checkNotifications, 15000);

  // ---------------------------------------------------------------------
  // Initial render
  // ---------------------------------------------------------------------
  function renderAll() {
    renderStats();
    renderTodaySchedule();
    renderReminderCards();
    renderCalendar();
    renderCalendarDayDetail();
  }

  renderAll();
});  if (!page) return; // Not on the Reminders page.

  const STORAGE_KEY = "medbridge_reminders_v1";

  // ---------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  const uid = () => `rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const todayISO = () => formatDate(new Date());

  function formatDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatTime12(hhmm) {
    if (!hhmm) return "";
    const [h, m] = hhmm.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }

  function formatFriendlyDate(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  // Escapes user-entered text before it is inserted via innerHTML.
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------
  function loadReminders() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("MedBridge: failed to read reminders from storage.", err);
      return [];
    }
  }

  function saveReminders() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    } catch (err) {
      console.error("MedBridge: failed to save reminders.", err);
      showToast("Could not save — your browser storage may be full.", "error");
    }
  }

  let reminders = loadReminders();
  let calendarViewDate = new Date();
  let selectedCalendarDate = null;

  // ---------------------------------------------------------------------
  // Scheduling logic
  // ---------------------------------------------------------------------

  // Is this reminder due on the given date at all (ignoring time of day)?
  function isScheduledOn(reminder, dateISO) {
    if (!reminder.enabled) return false;
    if (dateISO < reminder.startDate) return false;
    if (reminder.endDate && dateISO > reminder.endDate) return false;

    const date = new Date(`${dateISO}T00:00:00`);
    const start = new Date(`${reminder.startDate}T00:00:00`);

    switch (reminder.frequency) {
      case "weekly":
        return date.getDay() === start.getDay();
      case "monthly":
        return date.getDate() === start.getDate();
      // Daily, twice-daily, and custom all recur every day within the
      // active date range. "Twice Daily" and "Custom" are informational
      // labels here — for two distinct times a day, add a second
      // reminder; this keeps the data model simple and avoids a second
      // hidden time field the user never asked for.
      case "daily":
      case "twice-daily":
      case "custom":
      default:
        return true;
    }
  }

  // Returns 'taken' | 'skipped' | 'missed' | 'upcoming' | null (not
  // scheduled today) for the reminder as of right now.
  function getTodayStatus(reminder) {
    const today = todayISO();
    if (!isScheduledOn(reminder, today)) return null;

    const logged = reminder.log && reminder.log[today];
    if (logged === "taken") return "taken";
    if (logged === "skipped") return "skipped";

    const [h, m] = reminder.time.split(":").map(Number);
    const reminderTime = new Date();
    reminderTime.setHours(h, m, 0, 0);

    return new Date() > reminderTime ? "missed" : "upcoming";
  }

  // Finds the next date/time this reminder will fire, looking up to 120
  // days ahead. Used for the "Next Reminder Time" shown on each card.
  function getNextOccurrence(reminder) {
    const now = new Date();
    for (let i = 0; i < 120; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = formatDate(d);
      if (!isScheduledOn(reminder, iso)) continue;

      if (i === 0) {
        const [h, m] = reminder.time.split(":").map(Number);
        const dt = new Date();
        dt.setHours(h, m, 0, 0);
        const alreadyLogged = reminder.log && reminder.log[iso];
        if (dt > now && !alreadyLogged) return { date: iso, time: reminder.time };
        continue; // today's occurrence already passed or was logged
      }
      return { date: iso, time: reminder.time };
    }
    return null;
  }

  function rangesOverlap(a, b) {
    const aStart = a.startDate;
    const aEnd = a.endDate || "9999-12-31";
    const bStart = b.startDate;
    const bEnd = b.endDate || "9999-12-31";
    return aStart <= bEnd && bStart <= aEnd;
  }

  // ---------------------------------------------------------------------
  // Toast (validation / status messages)
  // ---------------------------------------------------------------------
  let toastTimer = null;
  function showToast(message, type = "default") {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = "toast show" + (type === "error" ? " toast--error" : type === "success" ? " toast--success" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  // ---------------------------------------------------------------------
  // Rendering: Stats
  // ---------------------------------------------------------------------
  function renderStats() {
    const today = todayISO();
    const total = reminders.length;
    const active = reminders.filter((r) => r.enabled && (!r.endDate || r.endDate >= today)).length;

    let completed = 0;
    let missed = 0;
    let upcoming = 0;

    reminders.forEach((r) => {
      const status = getTodayStatus(r);
      if (status === "taken" || status === "skipped") completed++;
      else if (status === "missed") missed++;
      else if (status === "upcoming") upcoming++;
    });

    $("statTotal").textContent = total;
    $("statActive").textContent = active;
    $("statCompleted").textContent = completed;
    $("statMissed").textContent = missed;
    $("statUpcoming").textContent = upcoming;
  }

  // ---------------------------------------------------------------------
  // Rendering: Today's Schedule
  // ---------------------------------------------------------------------
  function renderTodaySchedule() {
    const list = $("scheduleList");
    const empty = $("scheduleEmpty");
    const today = todayISO();

    const todays = reminders
      .filter((r) => isScheduledOn(r, today))
      .map((r) => ({ r, status: getTodayStatus(r) }))
      .sort((a, b) => a.r.time.localeCompare(b.r.time));

    list.innerHTML = "";

    if (todays.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    const labelFor = { taken: "Completed", skipped: "Skipped", missed: "Missed", upcoming: "Upcoming" };
    const classFor = { taken: "completed", skipped: "completed", missed: "missed", upcoming: "upcoming" };

    todays.forEach(({ r, status }) => {
      const li = document.createElement("li");
      const cls = classFor[status];
      li.className = `schedule-item schedule-item--${cls}`;
      li.innerHTML = `
        <span class="schedule-item__time">${formatTime12(r.time)}</span>
        <span class="status-dot status-dot--${cls}" aria-hidden="true"></span>
        <span class="schedule-item__body">
          <p class="schedule-item__name">${escapeHtml(r.name)}</p>
          <p class="schedule-item__meta">${escapeHtml(r.dosage)} &middot; ${labelFor[status]}</p>
        </span>
      `;
      list.appendChild(li);
    });
  }

  // ---------------------------------------------------------------------
  // Rendering: Reminder cards (with search / filter / sort)
  // ---------------------------------------------------------------------
  function getFilteredSortedReminders() {
    const query = $("searchInput").value.trim().toLowerCase();
    const filter = $("filterSelect").value;
    const sort = $("sortSelect").value;
    const today = todayISO();

    let list = reminders.filter((r) => r.name.toLowerCase().includes(query));

    list = list.filter((r) => {
      const status = getTodayStatus(r);
      switch (filter) {
        case "active":
          return r.enabled && (!r.endDate || r.endDate >= today);
        case "completed":
          return status === "taken" || status === "skipped";
        case "missed":
          return status === "missed";
        case "today":
          return isScheduledOn(r, today);
        case "high-priority":
          return r.priority === "critical";
        default:
          return true;
      }
    });

    const priorityRank = { critical: 0, important: 1, normal: 2 };
    const freqRank = { daily: 0, "twice-daily": 1, weekly: 2, monthly: 3, custom: 4 };

    list = list.slice().sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "priority":
          return priorityRank[a.priority] - priorityRank[b.priority];
        case "frequency":
          return freqRank[a.frequency] - freqRank[b.frequency];
        case "time":
        default:
          return a.time.localeCompare(b.time);
      }
    });

    return list;
  }

  const FREQ_LABELS = {
    daily: "Daily",
    "twice-daily": "Twice Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    custom: "Custom",
  };
  const MEAL_LABELS = { before: "Before Food", after: "After Food", with: "With Food" };
  const PRIORITY_LABELS = { normal: "Normal", important: "Important", critical: "Critical" };
  const STATUS_BADGE = {
    taken: { label: "Completed", bg: "var(--success-bg)", fg: "var(--success)" },
    skipped: { label: "Skipped", bg: "var(--success-bg)", fg: "var(--success)" },
    missed: { label: "Missed", bg: "var(--danger-bg)", fg: "var(--danger)" },
    upcoming: { label: "Upcoming", bg: "var(--warning-bg)", fg: "var(--warning)" },
  };

  function buildReminderCard(r) {
    const today = todayISO();
    const status = getTodayStatus(r);
    const next = getNextOccurrence(r);

    const card = document.createElement("article");
    card.className = "reminder-card" + (r.enabled ? "" : " reminder-card--disabled");
    card.dataset.id = r.id;

    const freqLabel =
      r.frequency === "custom" && r.customFrequency
        ? `Custom &middot; ${escapeHtml(r.customFrequency)}`
        : FREQ_LABELS[r.frequency] || r.frequency;

    const badge = STATUS_BADGE[status];
    const statusBadgeHtml = badge
      ? `<span class="reminder-card__status" style="background:${badge.bg};color:${badge.fg}">${badge.label}</span>`
      : `<span class="reminder-card__status" style="background:var(--bg);color:var(--text-secondary)">Not scheduled today</span>`;

    const nextLabel = next
      ? `${next.date === today ? "Today" : formatFriendlyDate(next.date)} &middot; ${formatTime12(next.time)}`
      : "No upcoming occurrence";

    card.innerHTML = `
      <div class="reminder-card__top">
        <div>
          <p class="reminder-card__name">${escapeHtml(r.name)}</p>
          <p class="reminder-card__dosage">${escapeHtml(r.dosage)}</p>
        </div>
        <span class="reminder-card__time">${nextLabel}</span>
      </div>
      <div class="reminder-card__tags">
        <span class="tag tag--frequency">${freqLabel}</span>
        <span class="tag tag--meal">${MEAL_LABELS[r.mealTiming] || ""}</span>
        <span class="tag tag--priority-${r.priority}">${PRIORITY_LABELS[r.priority]}</span>
        ${statusBadgeHtml}
      </div>
      ${r.notes ? `<p class="reminder-card__notes">${escapeHtml(r.notes)}</p>` : ""}
      <div class="reminder-card__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-action="edit">Edit</button>
        <button type="button" class="btn btn--ghost btn--sm btn--danger" data-action="delete">Delete</button>
        <button type="button" class="btn btn--ghost btn--sm btn--success" data-action="taken">Mark as Taken</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="skip">Skip</button>
      </div>
    `;

    return card;
  }

  function renderReminderCards() {
    const container = $("reminderCards");
    const emptyState = $("reminderCardsEmpty");

    if (reminders.length === 0) {
      container.innerHTML = "";
      container.hidden = true;
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    container.hidden = false;

    const list = getFilteredSortedReminders();
    container.innerHTML = "";

    if (list.length === 0) {
      container.innerHTML = `<p class="empty-state">No reminders match your search or filter.</p>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    list.forEach((r) => fragment.appendChild(buildReminderCard(r)));
    container.appendChild(fragment);
  }

  // Delegated click handling for card actions (edit / delete / taken / skip)
  $("reminderCards").addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const card = event.target.closest(".reminder-card");
    if (!card) return;
    const id = card.dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") openModal(id);
    else if (action === "delete") deleteReminder(id, card);
    else if (action === "taken") logStatus(id, "taken");
    else if (action === "skip") logStatus(id, "skipped");
  });

  function deleteReminder(id, cardEl) {
    if (!window.confirm("Delete this reminder? This can't be undone.")) return;

    const finish = () => {
      reminders = reminders.filter((r) => r.id !== id);
      saveReminders();
      renderAll();
      showToast("Reminder deleted.", "success");
    };

    if (cardEl) {
      cardEl.classList.add("reminder-card--removing");
      setTimeout(finish, 180); // matches .reminder-card--removing animation duration
    } else {
      finish();
    }
  }

  function logStatus(id, status) {
    const r = reminders.find((x) => x.id === id);
    if (!r) return;
    r.log = r.log || {};
    r.log[todayISO()] = status;
    r.updatedAt = Date.now();
    saveReminders();
    renderAll();
    showToast(status === "taken" ? "Marked as taken." : "Marked as skipped.", "success");
  }

  // ---------------------------------------------------------------------
  // Rendering: Calendar
  // ---------------------------------------------------------------------
  function renderCalendar() {
    const grid = $("calendarGrid");
    const label = $("calendarMonthLabel");
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const today = todayISO();

    label.textContent = calendarViewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    grid.innerHTML = "";
    const fragment = document.createDocumentFragment();

    ["S", "M", "T", "W", "T", "F", "S"].forEach((d) => {
      const el = document.createElement("div");
      el.className = "calendar__weekday";
      el.textContent = d;
      fragment.appendChild(el);
    });

    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startOffset; i++) {
      const empty = document.createElement("div");
      empty.className = "calendar__day calendar__day--empty";
      fragment.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = formatDate(new Date(year, month, d));
      const scheduledCount = reminders.filter((r) => isScheduledOn(r, iso)).length;

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "calendar__day";
      if (iso === today) cell.classList.add("calendar__day--today");
      if (iso === selectedCalendarDate) cell.classList.add("calendar__day--selected");
      cell.dataset.date = iso;
      cell.setAttribute("aria-label", `${iso}${scheduledCount ? `, ${scheduledCount} reminder(s)` : ""}`);
      cell.textContent = String(d);

      if (scheduledCount > 0) {
        const dots = document.createElement("span");
        dots.className = "calendar__day-dots";
        for (let k = 0; k < Math.min(scheduledCount, 3); k++) {
          const dot = document.createElement("span");
          dot.className = "calendar__day-dot";
          dots.appendChild(dot);
        }
        cell.appendChild(dots);
      }

      fragment.appendChild(cell);
    }

    grid.appendChild(fragment);
  }

  function renderCalendarDayDetail() {
    const detail = $("calendarDayDetail");
    const title = $("calendarDayTitle");
    const list = $("calendarDayList");

    if (!selectedCalendarDate) {
      detail.hidden = true;
      return;
    }

    const dayReminders = reminders
      .filter((r) => isScheduledOn(r, selectedCalendarDate))
      .sort((a, b) => a.time.localeCompare(b.time));

    title.textContent = new Date(`${selectedCalendarDate}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    list.innerHTML = "";
    if (dayReminders.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No reminders scheduled.";
      list.appendChild(li);
    } else {
      dayReminders.forEach((r) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${escapeHtml(r.name)}</span><span>${formatTime12(r.time)}</span>`;
        list.appendChild(li);
      });
    }

    detail.hidden = false;
  }

  $("calendarGrid").addEventListener("click", (event) => {
    const cell = event.target.closest(".calendar__day:not(.calendar__day--empty)");
    if (!cell) return;
    selectedCalendarDate = cell.dataset.date;
    renderCalendar();
    renderCalendarDayDetail();
  });

  $("calPrevBtn").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
    renderCalendar();
  });

  $("calNextBtn").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
    renderCalendar();
  });

  // ---------------------------------------------------------------------
  // Modal: open / close / populate
  // ---------------------------------------------------------------------
  const overlay = $("reminderModalOverlay");
  const form = $("reminderForm");
  const ERROR_FIELDS = ["errorName", "errorDosage", "errorTime", "errorStartDate", "errorEndDate"];

  function clearErrors() {
    ERROR_FIELDS.forEach((id) => {
      $(id).textContent = "";
    });
  }

  function setError(id, message) {
    $(id).textContent = message;
  }

  function openModal(editId) {
    form.reset();
    clearErrors();
    $("reminderId").value = "";
    $("customFrequencyRow").hidden = true;
    $("customOffsetField").hidden = true;

    if (editId) {
      const r = reminders.find((x) => x.id === editId);
      if (!r) return;

      $("reminderModalTitle").textContent = "Edit Reminder";
      $("reminderId").value = r.id;
      $("fieldName").value = r.name;
      $("fieldDosage").value = r.dosage;
      $("fieldTime").value = r.time;
      $("fieldFrequency").value = r.frequency;
      $("fieldCustomFrequency").value = r.customFrequency || "";
      $("fieldStartDate").value = r.startDate;
      $("fieldEndDate").value = r.endDate || "";
      $("fieldMealTiming").value = r.mealTiming;
      $("fieldPriority").value = r.priority;
      $("fieldNotes").value = r.notes || "";
      $("fieldEnabled").checked = r.enabled;

      if (r.notifyOffset === 0 || r.notifyOffset === 5) {
        $("fieldNotifyOffset").value = String(r.notifyOffset);
      } else {
        $("fieldNotifyOffset").value = "custom";
        $("customOffsetField").hidden = false;
        $("fieldCustomOffset").value = r.notifyOffset;
      }

      if (r.frequency === "custom") $("customFrequencyRow").hidden = false;
    } else {
      $("reminderModalTitle").textContent = "Add Reminder";
      $("fieldStartDate").value = todayISO();
    }

    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => $("fieldName").focus());
    maybeRequestNotificationPermission();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  $("addReminderBtn").addEventListener("click", () => openModal(null));
  $("reminderModalClose").addEventListener("click", closeModal);
  $("reminderCancelBtn").addEventListener("click", closeModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) closeModal();
  });

  $("fieldFrequency").addEventListener("change", (event) => {
    $("customFrequencyRow").hidden = event.target.value !== "custom";
  });

  $("fieldNotifyOffset").addEventListener("change", (event) => {
    $("customOffsetField").hidden = event.target.value !== "custom";
  });

  // ---------------------------------------------------------------------
  // Validation + Save
  // ---------------------------------------------------------------------
  function validateForm(data, editingId) {
    clearErrors();
    let valid = true;

    if (!data.name.trim()) {
      setError("errorName", "Medicine name is required.");
      valid = false;
    }
    if (!data.dosage.trim()) {
      setError("errorDosage", "Dosage is required.");
      valid = false;
    }
    if (!data.time) {
      setError("errorTime", "Reminder time is required.");
      valid = false;
    }
    if (!data.startDate) {
      setError("errorStartDate", "Start date is required.");
      valid = false;
    }
    if (data.endDate && data.startDate && data.endDate < data.startDate) {
      setError("errorEndDate", "End date must be on or after the start date.");
      valid = false;
    }

    if (valid) {
      const duplicate = reminders.find(
        (r) =>
          r.id !== editingId &&
          r.name.trim().toLowerCase() === data.name.trim().toLowerCase() &&
          r.time === data.time &&
          rangesOverlap(r, data)
      );
      if (duplicate) {
        setError("errorTime", "A reminder for this medicine at this time already exists.");
        valid = false;
      }
    }

    return valid;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = {
      name: $("fieldName").value,
      dosage: $("fieldDosage").value,
      time: $("fieldTime").value,
      frequency: $("fieldFrequency").value,
      customFrequency: $("fieldCustomFrequency").value,
      startDate: $("fieldStartDate").value,
      endDate: $("fieldEndDate").value,
      mealTiming: $("fieldMealTiming").value,
      priority: $("fieldPriority").value,
      notes: $("fieldNotes").value,
      enabled: $("fieldEnabled").checked,
    };

    const offsetSel = $("fieldNotifyOffset").value;
    data.notifyOffset =
      offsetSel === "custom"
        ? Math.min(180, Math.max(1, parseInt($("fieldCustomOffset").value, 10) || 5))
        : parseInt(offsetSel, 10);

    const editingId = $("reminderId").value || null;
    if (!validateForm(data, editingId)) return;

    if (editingId) {
      const r = reminders.find((x) => x.id === editingId);
      Object.assign(r, data, { updatedAt: Date.now() });
      showToast("Reminder updated.", "success");
    } else {
      reminders.push({
        id: uid(),
        ...data,
        log: {},
        notifiedAt: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      showToast("Reminder added.", "success");
    }

    saveReminders();
    closeModal();
    renderAll();
  });

  // ---------------------------------------------------------------------
  // Search / filter / sort
  // ---------------------------------------------------------------------
  $("searchInput").addEventListener("input", renderReminderCards);
  $("filterSelect").addEventListener("change", renderReminderCards);
  $("sortSelect").addEventListener("change", renderReminderCards);

  // ---------------------------------------------------------------------
  // Browser notifications
  // ---------------------------------------------------------------------
  function maybeRequestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  function checkNotifications() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const now = new Date();
    const today = todayISO();
    let changed = false;

    reminders.forEach((r) => {
      if (!r.enabled || !isScheduledOn(r, today)) return;

      const [h, m] = r.time.split(":").map(Number);
      const reminderTime = new Date();
      reminderTime.setHours(h, m, 0, 0);
      const notifyTime = new Date(reminderTime.getTime() - (r.notifyOffset || 0) * 60000);

      r.notifiedAt = r.notifiedAt || {};
      if (r.notifiedAt[today]) return;

      // Fire once, within a 30s window after the scheduled notify time,
      // so a 15s polling interval never misses or double-fires it.
      if (now >= notifyTime && now - notifyTime < 30000) {
        try {
          new Notification("MedBridge Reminder", {
            body: `${r.name} (${r.dosage}) — ${formatTime12(r.time)}`,
          });
        } catch (err) {
          console.error("MedBridge: notification failed.", err);
        }
        r.notifiedAt[today] = true;
        changed = true;
      }
    });

    if (changed) saveReminders();
  }

  setInterval(checkNotifications, 15000);

  // ---------------------------------------------------------------------
  // Initial render
  // ---------------------------------------------------------------------
  function renderAll() {
    renderStats();
    renderTodaySchedule();
    renderReminderCards();
    renderCalendar();
    renderCalendarDayDetail();
  }

  renderAll();
});
