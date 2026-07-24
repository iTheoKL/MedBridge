document.addEventListener("DOMContentLoaded", () => {
  const profileForm = document.getElementById("profileForm");
  const passwordForm = document.getElementById("passwordForm");
  const passwordHint = document.getElementById("passwordHint");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showToast("Profile updated");
  });

  passwordForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword.length < 8) {
      passwordHint.textContent = "Password must be at least 8 characters.";
      passwordHint.style.color = "var(--danger)";
      return;
    }

    if (newPassword !== confirmPassword) {
      passwordHint.textContent = "New password and confirmation don't match.";
      passwordHint.style.color = "var(--danger)";
      return;
    }

    passwordHint.textContent = "Use at least 8 characters, with a number and a symbol.";
    passwordHint.style.color = "var(--text-tertiary)";
    passwordForm.reset();
    showToast("Password updated");
  });

  deleteAccountBtn.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account? This cannot be undone."
    );
    if (confirmed) {
      showToast("Account deletion requested");
    }
  });

  function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    toastMessage.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
  }
});
