document.addEventListener("DOMContentLoaded", () => {
  let nextId = 100;

  const data = {
    today: [
      { id: 1, medName: "Metformin", dosage: "500mg", time: "8:00 AM", note: "With breakfast", taken: false, risk: false },
      { id: 2, medName: "Ibuprofen", dosage: "200mg", time: "1:00 PM", note: "After lunch", taken: false, risk: true },
      { id: 3, medName: "Warfarin", dosage: "5mg", time: "8:00 PM", note: "Before bed", taken: false, risk: true },
    ],
    upcoming: [
      { id: 4, medName: "Metformin", dosage: "500mg", time: "8:00 AM", day: "Tomorrow", note: "With breakfast", risk: false },
      { id: 5, medName: "Ibuprofen", dosage: "200mg", time: "1:00 PM", day: "Tomorrow", note: "After lunch", risk: true },
      { id: 6, medName: "Metformin", dosage: "500mg", time: "8:00 AM", day: "In 2 days", note: "With breakfast", risk: false },
    ],
    history: [
      { id: 7, medName: "Metformin", dosage: "500mg", time: "8:00 AM", day: "Yesterday", status: "taken" },
      { id: 8, medName: "Warfarin", dosage: "5mg", time: "8:00 PM", day: "Yesterday", status: "taken" },
      { id: 9, medName: "Ibuprofen", dosage: "200mg", time: "1:00 PM", day: "2 days ago", status: "missed" },
    ],
  };

  const reminderList = document.getElementById("reminderList");
  const listTitle = document.getElementById("listTitle");
  const emptyState = document.getElementById("emptyState");
  const takenTodayStat = document.getElementById("takenTodayStat");
  const tabs = document.getElementById("tabs");

  let activeTab = "today";

  const titles = { today: "Today", upcoming: "Upcoming", history: "History" };

  function renderTodayItem(item) {
    return `
      <li class="reminder-item">
        <div class="reminder-item__time">
          <span class="reminder-item__hour">${item.time}</span>
          <span class="reminder-item__day">Today</span>
        </div>
        <div class="reminder-item__details">
          <p class="reminder-item__name">${item.medName} — ${item.dosage}</p>
          <p class="reminder-item__meta">${item.note}</p>
        </div>
        ${
          item.taken
            ? `<span class="pill pill--success">Taken</span>`
            : item.risk
            ? `<span class="pill pill--warning">Interaction Risk</span>`
            : `<span class="pill pill--upcoming">Upcoming</span>`
        }
        <label class="check" style="margin-left: 4px;">
          <input type="checkbox" data-id="${item.id}" ${item.taken ? "checked" : ""} />
          <span class="check__box"></span>
        </label>
      </li>
    `;
  }

  function renderUpcomingItem(item) {
    return `
      <li class="reminder-item">
        <div class="reminder-item__time">
          <span class="reminder-item__hour">${item.time}</span>
          <span class="reminder-item__day">${item.day}</span>
        </div>
        <div class="reminder-item__details">
          <p class="reminder-item__name">${item.medName} — ${item.dosage}</p>
          <p class="reminder-item__meta">${item.note}</p>
        </div>
        ${item.risk ? `<span class="pill pill--warning">Interaction Risk</span>` : `<span class="pill pill--upcoming">Upcoming</span>`}
      </li>
    `;
  }

  function renderHistoryItem(item) {
    return `
      <li class="reminder-item">
        <div class="reminder-item__time">
          <span class="reminder-item__hour">${item.time}</span>
          <span class="reminder-item__day">${item.day}</span>
        </div>
        <div class="reminder-item__details">
          <p class="reminder-item__name">${item.medName} — ${item.dosage}</p>
        </div>
        ${
          item.status === "taken"
            ? `<span class="pill pill--success">Taken</span>`
            : `<span class="pill" style="background: var(--danger-tint); color: var(--danger);">Missed</span>`
        }
      </li>
    `;
  }

  function render() {
    listTitle.textContent = titles[activeTab];
    const items = data[activeTab];

    if (!items || items.length === 0) {
      reminderList.innerHTML = "";
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;

    if (activeTab === "today") {
      reminderList.innerHTML = items.map(renderTodayItem).join("");
    } else if (activeTab === "upcoming") {
      reminderList.innerHTML = items.map(renderUpcomingItem).join("");
    } else {
      reminderList.innerHTML = items.map(renderHistoryItem).join("");
    }

    updateStats();
  }

  function updateStats() {
    const takenCount = data.today.filter((item) => item.taken).length;
    takenTodayStat.textContent = takenCount;
  }

  tabs.addEventListener("click", (event) => {
    const button = event.target.closest(".segmented__option");
    if (!button) return;

    tabs.querySelectorAll(".segmented__option").forEach((el) => el.classList.remove("active"));
    button.classList.add("active");
    activeTab = button.dataset.tab;
    render();
  });

  reminderList.addEventListener("change", (event) => {
    const checkbox = event.target.closest("input[type='checkbox']");
    if (!checkbox) return;

    const id = Number(checkbox.dataset.id);
    const item = data.today.find((entry) => entry.id === id);
    if (!item) return;

    item.taken = checkbox.checked;
    showToast(item.taken ? `Marked ${item.medName} as taken` : `Marked ${item.medName} as not taken`);
    render();
  });

  // Add Reminder modal
  const modalOverlay = document.getElementById("reminderModalOverlay");
  const reminderForm = document.getElementById("reminderForm");

  function openModal() {
    modalOverlay.classList.add("open");
  }

  function closeModal() {
    modalOverlay.classList.remove("open");
    reminderForm.reset();
    document.getElementById("reminderTime").value = "08:00";
  }

  document.getElementById("addReminderBtn").addEventListener("click", openModal);
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalCancel").addEventListener("click", closeModal);

  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  reminderForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const [medName, dosage] = document.getElementById("reminderMed").value.split(" — ");
    const time24 = document.getElementById("reminderTime").value;
    const day = document.getElementById("reminderDay").value;
    const note = document.getElementById("reminderNotes").value.trim() || "As scheduled";

    const time = formatTime(time24);
    const newReminder = { id: nextId++, medName, dosage, time, note, risk: false };

    if (day === "Today") {
      data.today.push({ ...newReminder, taken: false });
    } else {
      data.upcoming.push({ ...newReminder, day });
    }

    showToast(`Reminder added for ${medName}`);
    closeModal();

    if ((day === "Today" && activeTab === "today") || (day !== "Today" && activeTab === "upcoming")) {
      render();
    } else {
      updateStats();
    }
  });

  function formatTime(time24) {
    const [hourStr, minute] = time24.split(":");
    let hour = Number(hourStr);
    const suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${suffix}`;
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    toastMessage.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
  }

  render();
});
