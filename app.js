const $ = id => document.getElementById(id);


/* BOSHLANG'ICH PAROL */
const DEFAULT_PASSWORD = "B2008U2011";


/* MA'LUMOTLAR */
const DATA_KEY = "private_vault_data";
const PASSWORD_KEY = "private_vault_password";


let currentTab = "logins";
let editIndex = -1;

let vault = loadVault();


function loadVault() {

  try {

    const data = JSON.parse(
      localStorage.getItem(DATA_KEY)
    );

    if (
      data &&
      Array.isArray(data.logins) &&
      Array.isArray(data.phones)
    ) {
      return data;
    }

  } catch {}

  return {
    logins: [],
    phones: []
  };
}


function saveVault() {

  localStorage.setItem(
    DATA_KEY,
    JSON.stringify(vault)
  );

}


/* PASSWORD HASH */

async function hashPassword(password) {

  const data =
    new TextEncoder().encode(password);

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return [...new Uint8Array(hash)]
    .map(x =>
      x.toString(16).padStart(2, "0")
    )
    .join("");
}


async function getPasswordHash() {

  let hash =
    localStorage.getItem(PASSWORD_KEY);

  if (!hash) {

    hash =
      await hashPassword(DEFAULT_PASSWORD);

    localStorage.setItem(
      PASSWORD_KEY,
      hash
    );
  }

  return hash;
}


/* LOGIN */

document
  .getElementById("loginBtn")
  .onclick = async function () {

    const password =
      $("loginPassword").value;

    const enteredHash =
      await hashPassword(password);

    const realHash =
      await getPasswordHash();

    if (enteredHash !== realHash) {

      $("loginError").textContent =
        "Parol noto‘g‘ri";

      return;
    }

    sessionStorage.setItem(
      "vault_logged_in",
      "1"
    );

    $("loginPassword").value = "";

    $("loginError").textContent = "";

    showVault();

  };


$("loginPassword").onkeydown =
  function (event) {

    if (event.key === "Enter") {
      $("loginBtn").click();
    }

  };


function showVault() {

  $("loginPage").classList.add("hidden");

  $("vaultPage").classList.remove("hidden");

  render();

}


function showLogin() {

  $("vaultPage").classList.add("hidden");

  $("loginPage").classList.remove("hidden");

}


/* LOGOUT */

$("logoutBtn").onclick = function () {

  sessionStorage.removeItem(
    "vault_logged_in"
  );

  showLogin();

};


/* TABS */

document
  .querySelectorAll(".tab")
  .forEach(button => {

    button.onclick = function () {

      currentTab =
        button.dataset.tab;

      document
        .querySelectorAll(".tab")
        .forEach(x =>
          x.classList.remove("active")
        );

      button.classList.add("active");

      render();

    };

  });


/* SEARCH */

$("searchInput").oninput = render;


/* ADD */

$("addBtn").onclick = function () {

  editIndex = -1;

  $("formTitle").textContent =
    currentTab === "logins"
      ? "Login qo‘shish"
      : "Raqam qo‘shish";

  $("loginForm")
    .classList
    .toggle(
      "hidden",
      currentTab !== "logins"
    );

  $("phoneForm")
    .classList
    .toggle(
      "hidden",
      currentTab !== "phones"
    );

  clearForm();

  $("addModal")
    .classList
    .remove("hidden");

};


/* SAVE */

$("saveBtn").onclick = function () {

  if (currentTab === "logins") {

    const item = {

      service:
        $("serviceInput").value.trim(),

      username:
        $("usernameInput").value.trim(),

      password:
        $("passwordInput").value

    };

    if (
      !item.service ||
      !item.username ||
      !item.password
    ) {

      alert("Barcha joyni to‘ldiring.");

      return;
    }


    if (editIndex === -1) {

      vault.logins.push(item);

    } else {

      vault.logins[editIndex] = item;

    }

  }


  else {

    const item = {

      phone:
        $("phoneInput").value.trim(),

      name:
        $("phoneNameInput").value.trim()

    };


    if (!item.phone) {

      alert("Raqamni kiriting.");

      return;
    }


    if (editIndex === -1) {

      vault.phones.push(item);

    } else {

      vault.phones[editIndex] = item;

    }

  }


  saveVault();

  $("addModal")
    .classList
    .add("hidden");

  render();

};


function clearForm() {

  [
    "serviceInput",
    "usernameInput",
    "passwordInput",
    "phoneInput",
    "phoneNameInput"
  ]
  .forEach(id => {

    $(id).value = "";

  });

}


/* RENDER */

function render() {

  const search =
    $("searchInput")
      .value
      .toLowerCase()
      .trim();

  const array =
    vault[currentTab];

  const filtered =
    array
      .map((item, index) => ({
        item,
        index
      }))
      .filter(x =>
        JSON.stringify(x.item)
          .toLowerCase()
          .includes(search)
      );


  if (!filtered.length) {

    $("list").innerHTML =
      '<div class="empty">Hozircha ma’lumot yo‘q</div>';

    return;
  }


  $("list").innerHTML =
    filtered.map(({ item, index }) => {

      if (currentTab === "phones") {

        return `

          <div class="card">

            <div>

              <h3>
                ${escapeHTML(
                  item.name ||
                  "Telefon raqami"
                )}
              </h3>

              <div class="sub">
                ${escapeHTML(item.phone)}
              </div>

            </div>


            <div class="card-actions">

              <button
                class="small"
                onclick="copyText('${safe(item.phone)}')"
              >
                Nusxalash
              </button>

              <button
                class="small"
                onclick="editItem(${index})"
              >
                O‘zgartirish
              </button>

              <button
                class="small danger"
                onclick="deleteItem(${index})"
              >
                O‘chirish
              </button>

            </div>

          </div>

        `;

      }


      return `

        <div class="card">

          <div>

            <h3>
              ${escapeHTML(item.service)}
            </h3>

            <div class="sub">
              ${escapeHTML(item.username)}
            </div>

            <div
              class="password"
              id="password-${index}"
            >
              ••••••••
            </div>

          </div>


          <div class="card-actions">

            <button
              class="small"
              onclick="togglePassword(
                ${index},
                this
              )"
            >
              Ko‘rsatish
            </button>


            <button
              class="small"
              onclick="copyText(
                '${safe(item.password)}'
              )"
            >
              Parolni nusxalash
            </button>


            <button
              class="small"
              onclick="editItem(${index})"
            >
              O‘zgartirish
            </button>


            <button
              class="small danger"
              onclick="deleteItem(${index})"
            >
              O‘chirish
            </button>

          </div>

        </div>

      `;

    }).join("");

}


/* PASSWORD SHOW/HIDE */

window.togglePassword =
  function (index, button) {

    const element =
      $("password-" + index);

    if (
      element.textContent ===
      "••••••••"
    ) {

      element.textContent =
        vault.logins[index].password;

      button.textContent =
        "Yashirish";

    }

    else {

      element.textContent =
        "••••••••";

      button.textContent =
        "Ko‘rsatish";

    }

  };


/* COPY */

window.copyText =
  async function (text) {

    try {

      await navigator.clipboard
        .writeText(text);

      alert("Nusxalandi");

    } catch {

      alert("Nusxalash ishlamadi");

    }

  };


/* EDIT */

window.editItem =
  function (index) {

    editIndex = index;

    const item =
      vault[currentTab][index];


    $("formTitle").textContent =
      currentTab === "logins"
        ? "Loginni o‘zgartirish"
        : "Raqamni o‘zgartirish";


    $("loginForm")
      .classList
      .toggle(
        "hidden",
        currentTab !== "logins"
      );


    $("phoneForm")
      .classList
      .toggle(
        "hidden",
        currentTab !== "phones"
      );


    if (currentTab === "logins") {

      $("serviceInput").value =
        item.service || "";

      $("usernameInput").value =
        item.username || "";

      $("passwordInput").value =
        item.password || "";

    }

    else {

      $("phoneInput").value =
        item.phone || "";

      $("phoneNameInput").value =
        item.name || "";

    }


    $("addModal")
      .classList
      .remove("hidden");

  };


/* DELETE */

window.deleteItem =
  function (index) {

    if (
      !confirm("O‘chirilsinmi?")
    ) return;


    vault[currentTab]
      .splice(index, 1);

    saveVault();

    render();

  };


/* SETTINGS */

$("settingsBtn").onclick =
  function () {

    $("oldPasswordInput").value = "";
    $("newPasswordInput").value = "";
    $("newPassword2Input").value = "";

    $("settingsMessage").textContent = "";

    $("settingsModal")
      .classList
      .remove("hidden");

  };


/* CHANGE PASSWORD */

$("changePasswordBtn").onclick =
  async function () {

    const oldPassword =
      $("oldPasswordInput").value;

    const newPassword =
      $("newPasswordInput").value;

    const repeatPassword =
      $("newPassword2Input").value;


    if (newPassword.length < 6) {

      $("settingsMessage").textContent =
        "Yangi parol kamida 6 ta belgi bo‘lsin.";

      return;

    }


    if (
      newPassword !== repeatPassword
    ) {

      $("settingsMessage").textContent =
        "Yangi parollar bir xil emas.";

      return;

    }


    const oldHash =
      await hashPassword(oldPassword);

    const realHash =
      await getPasswordHash();


    if (oldHash !== realHash) {

      $("settingsMessage").textContent =
        "Eski parol noto‘g‘ri.";

      return;

    }


    const newHash =
      await hashPassword(newPassword);


    localStorage.setItem(
      PASSWORD_KEY,
      newHash
    );


    $("settingsMessage").textContent =
      "Parol muvaffaqiyatli o‘zgartirildi.";

  };


/* CLOSE */

document
  .querySelectorAll("[data-close]")
  .forEach(button => {

    button.onclick = function () {

      $(button.dataset.close)
        .classList
        .add("hidden");

    };

  });


/* HTML XAVFSIZLIGI */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/[&<>"']/g, char => ({

      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"

    }[char]));

}


function safe(value) {

  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n");

}


/* START */

if (
  sessionStorage.getItem(
    "vault_logged_in"
  ) === "1"
) {

  showVault();

} else {

  showLogin();

}


getPasswordHash();
