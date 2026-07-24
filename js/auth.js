document.addEventListener("DOMContentLoaded", () => {
  const SESSION_KEY = "medbridge-auth";

  // Fixed allowlist of accounts for this build — no backend/database
  // required. Username and password must match exactly (case-sensitive),
  // and the password is always the same string as the username.
  const ALLOWED_USERNAMES = [
    "dhina",
    "dhinakaran",
    "Dhinakaran",
    "Barath",
    "barath",
    "vajahath",
    "Vajahath",
  ];

  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");

  function showMessage(el, text) {
    el.textContent = text;
    el.hidden = false;
  }

  function hideMessage(el) {
    el.hidden = true;
    el.textContent = "";
  }

  function saveSession(username) {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ username, loggedInAt: new Date().toISOString() })
    );
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    hideMessage(loginMessage);

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!username || !password) {
      showMessage(loginMessage, "Please enter your username and password.");
      return;
    }

    const isValid = ALLOWED_USERNAMES.includes(username) && password === username;

    if (!isValid) {
      showMessage(loginMessage, "Incorrect username or password.");
      return;
    }

    saveSession(username);
    window.location.href = "index.html";
  });
});
