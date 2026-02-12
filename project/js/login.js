async function login() {
  try {
    const res = await fetch("http://127.0.0.1:5001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
      })
    });

    const data = await res.json();

    console.log("LOGIN RESPONSE:", data); // 🔍 DEBUG
    alert("ROLE FROM BACKEND: " + data.role);

    if (!res.ok) {
      alert(data.message || data.msg || "Login failed");
      return;
    }

    // 🔥 STORE THE *REAL* JWT
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("role", data.role);

    // (optional) clean old bad key
    localStorage.removeItem("token");

    // ✅ ROLE-BASED REDIRECT
    if (data.role === "ADMIN") {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "index.html";
    }

  } catch (e) {
    alert("Login error: " + e.message);
    console.error(e);
  }
}
