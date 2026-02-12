console.log("register.js LOADED");

document.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("registerBtn");

  if (!btn) {
    console.error("Register button not found");
    return;
  }

  btn.addEventListener("click", async () => {
    console.log("REGISTER BUTTON CLICKED");

    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();
    const confirmPassword = document.getElementById("confirmPassword")?.value;

    if (!name || !email || !password || !confirmPassword) {
      alert("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:5001/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          password
        })
      });

      const data = await res.json().catch(() => ({}));

      console.log("REGISTER RESPONSE:", res.status, data);

      if (!res.ok) {
        alert(data.message || "Registration failed");
        return;
      }

      alert("Registration successful. Please login.");
      window.location.href = "login.html";

    } catch (err) {
      console.error("Register error:", err);
      alert("Unable to reach server");
    }
  });

});
