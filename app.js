const $ = (id) => document.getElementById(id);

let vault = { logins: [], phones: [] };
let currentTab = "logins";
let editIndex = null;

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Xatolik");
  return data;
}

async function start() {
  try {
    const s = await api("/api/session");
    if (s.authenticated) {
      await openVault();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  $("loginScreen").classList.remove("hidden");
  $("vaultScreen").classList.add("hidden");
}

async function openVault() {
  vault = await api("/api/vault");
  $("loginScreen").classList.add("hidden");
  $("vaultScreen").classList.remove("hidden");
  render();
}

$("loginBtn").onclick = async () => {
  $("loginError").textContent = "";
  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ password: $("loginPassword").value })
    });
    $("loginPassword").value = "";
    await openVault();
  } catch (e) {
    $("loginError").textContent = e.message;
  }
};

$("loginPassword").addEventListener("keydown", e => {
  if (e.key === "Enter") $("loginBtn").click();
});

$("logoutBtn").onclick = async () => {
  await api("/api/logout", { method: "POST" });
  showLogin();
};

document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => {
    currentTab = btn.dataset.tab;
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    render();
  };
});

$("search").oninput = render;

$("addBtn").onclick = () => {
  editIndex = null;
  $("modalTitle").textContent = currentTab === "logins" ? "Login qo'shish" : "Raqam qo'shish";
  $("loginFields").classList.toggle("hidden", currentTab !== "logins");
  $("phoneFields").classList.toggle("hidden", currentTab !== "phones");
  clearForm();
  $("addModal").classList.remove("hidden");
};

$("saveBtn").onclick = async () => {
  const arr = vault[currentTab];

  if (currentTab === "logins") {
    const item = {
      title: $("titleInput").value.trim(),
      username: $("usernameInput").value.trim(),
      password: $("passwordInput").value
    };
    if (!item.title || !item.username || !item.password) return alert("Barcha joyni to'ldiring.");
    if (editIndex === null) arr.push(item);
    else arr[editIndex] = item;
  } else {
    const item = {
      phone: $("phoneInput").value.trim(),
      name: $("phoneNameInput").value.trim()
    };
    if (!item.phone) return alert("Raqamni kiriting.");
    if (editIndex === null) arr.push(item);
    else arr[editIndex] = item;
  }

  await saveVault();
  $("addModal").classList.add("hidden");
  render();
};

async function saveVault() {
  await api("/api/vault", {
    method: "PUT",
    body: JSON.stringify(vault)
  });
}

function clearForm() {
  ["titleInput","usernameInput","passwordInput","phoneInput","phoneNameInput"]
    .forEach(id => $(id).value = "");
}

function render() {
  const q = $("search").value.toLowerCase().trim();
  const arr = vault[currentTab] || [];

  const filtered = arr.map((item, index) => ({ item, index })).filter(({ item }) =>
    JSON.stringify(item).toLowerCase().includes(q)
  );

  if (!filtered.length) {
    $("content").innerHTML = `<div class="empty">Hozircha ma'lumot yo'q</div>`;
    return;
  }

  $("content").innerHTML = filtered.map(({ item, index }) => {
    if (currentTab === "phones") {
      return `
        <div class="card">
          <div>
            <h3>${esc(item.name || "Telefon raqami")}</h3>
            <div class="muted">${esc(item.phone)}</div>
          </div>
          <div class="card-actions">
            <button class="small" onclick="copyText(${JSON.stringify(item.phone)})">Nusxalash</button>
            <button class="small" onclick="editItem(${index})">O'zgartirish</button>
            <button class="small danger" onclick="deleteItem(${index})">O'chirish</button>
          </div>
        </div>`;
    }

    return `
      <div class="card">
        <div>
          <h3>${esc(item.title)}</h3>
          <div class="muted">${esc(item.username)}</div>
          <div class="password" id="pw-${index}">••••••••</div>
        </div>
        <div class="card-actions">
          <button class="small" onclick="togglePassword(${index})">Ko'rsatish</button>
          <button class="small" onclick="copyText(${JSON.stringify(item.password)})">Parolni nusxalash</button>
          <button class="small" onclick="editItem(${index})">O'zgartirish</button>
          <button class="small danger" onclick="deleteItem(${index})">O'chirish</button>
        </div>
      </div>`;
  }).join("");
}

function togglePassword(index) {
  const el = $(`pw-${index}`);
  if (el.textContent === "••••••••") {
    el.textContent = vault.logins[index].password;
  } else {
    el.textContent = "••••••••";
  }
}

window.copyText = async (text) => {
  await navigator.clipboard.writeText(text);
  alert("Nusxalandi");
};

window.editItem = (index) => {
  editIndex = index;
  const item = vault[currentTab][index];

  $("modalTitle").textContent = currentTab === "logins" ? "Loginni o'zgartirish" : "Raqamni o'zgartirish";
  $("loginFields").classList.toggle("hidden", currentTab !== "logins");
  $("phoneFields").classList.toggle("hidden", currentTab !== "phones");

  if (currentTab === "logins") {
    $("titleInput").value = item.title || "";
    $("usernameInput").value = item.username || "";
    $("passwordInput").value = item.password || "";
  } else {
    $("phoneInput").value = item.phone || "";
    $("phoneNameInput").value = item.name || "";
  }

  $("addModal").classList.remove("hidden");
};

window.deleteItem = async (index) => {
  if (!confirm("O'chirilsinmi?")) return;
  vault[currentTab].splice(index, 1);
  await saveVault();
  render();
};

$("settingsBtn").onclick = () => {
  $("settingsMessage").textContent = "";
  $("oldPassword").value = "";
  $("newPassword").value = "";
  $("settingsModal").classList.remove("hidden");
};

$("changePasswordBtn").onclick = async () => {
  try {
    await api("/api/change-password", {
      method: "POST",
      body: JSON.stringify({
        oldPassword: $("oldPassword").value,
        newPassword: $("newPassword").value
      })
    });
    $("settingsMessage").textContent = "Parol muvaffaqiyatli o'zgartirildi.";
    $("oldPassword").value = "";
    $("newPassword").value = "";
  } catch (e) {
    $("settingsMessage").textContent = e.message;
  }
};

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.onclick = () => $(btn.dataset.close).classList.add("hidden");
});

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

start();
