```javascript
const STORAGE_KEY = "private_vault_data";

let accounts = [];
let masterKey = null;


/* =========================
   ELEMENTS
========================= */

const loginScreen =
  document.getElementById("loginScreen");

const app =
  document.getElementById("app");

const masterPassword =
  document.getElementById("masterPassword");

const loginBtn =
  document.getElementById("loginBtn");

const loginMessage =
  document.getElementById("loginMessage");

const addBtn =
  document.getElementById("addBtn");

const logoutBtn =
  document.getElementById("logoutBtn");

const settingsBtn =
  document.getElementById("settingsBtn");

const settingsModal =
  document.getElementById("settingsModal");

const closeSettings =
  document.getElementById("closeSettings");

const changePasswordBtn =
  document.getElementById("changePasswordBtn");

const passwordModal =
  document.getElementById("passwordModal");

const closePasswordModal =
  document.getElementById("closePasswordModal");

const oldPassword =
  document.getElementById("oldPassword");

const newPassword =
  document.getElementById("newPassword");

const confirmPassword =
  document.getElementById("confirmPassword");

const changePasswordSave =
  document.getElementById("changePasswordSave");

const passwordMessage =
  document.getElementById("passwordMessage");

const modal =
  document.getElementById("modal");

const closeModal =
  document.getElementById("closeModal");

const site =
  document.getElementById("site");

const username =
  document.getElementById("username");

const password =
  document.getElementById("password");

const note =
  document.getElementById("note");

const saveBtn =
  document.getElementById("saveBtn");

const showPassword =
  document.getElementById("showPassword");

const vault =
  document.getElementById("vault");

const empty =
  document.getElementById("empty");


/* =========================
   CRYPTO
========================= */

async function makeKey(passwordText) {

  const encoder = new TextEncoder();

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(passwordText)
    );

  return crypto.subtle.importKey(
    "raw",
    hash,
    {
      name: "AES-GCM"
    },
    false,
    [
      "encrypt",
      "decrypt"
    ]
  );
}


async function encryptData(data, key = masterKey) {

  const iv =
    crypto.getRandomValues(
      new Uint8Array(12)
    );

  const encoded =
    new TextEncoder().encode(
      JSON.stringify(data)
    );

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      encoded
    );

  return {
    iv: Array.from(iv),

    data: Array.from(
      new Uint8Array(encrypted)
    )
  };
}


async function decryptData(saved, key = masterKey) {

  const iv =
    new Uint8Array(saved.iv);

  const encrypted =
    new Uint8Array(saved.data);

  const decrypted =
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      encrypted
    );

  return JSON.parse(
    new TextDecoder().decode(decrypted)
  );
}


/* =========================
   LOGIN
========================= */

loginBtn.addEventListener(
  "click",
  login
);

masterPassword.addEventListener(
  "keydown",
  function(event) {

    if (event.key === "Enter") {
      login();
    }

  }
);


async function login() {

  const pass =
    masterPassword.value;

  if (!pass) {

    loginMessage.textContent =
      "Master passwordni kiriting.";

    return;
  }


  try {

    const key =
      await makeKey(pass);

    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );


    if (saved) {

      accounts =
        await decryptData(
          JSON.parse(saved),
          key
        );

    } else {

      /*
        Birinchi kirish.
        Shu parol birinchi master
        password bo‘ladi.
      */

      accounts = [];

      masterKey = key;

      await saveVault();

    }


    masterKey = key;

    loginScreen.classList.add(
      "hidden"
    );

    app.classList.remove(
      "hidden"
    );

    masterPassword.value = "";

    loginMessage.textContent = "";

    render();


  } catch {

    masterKey = null;

    loginMessage.textContent =
      "Master password noto‘g‘ri.";

  }

}


/* =========================
   SAVE VAULT
========================= */

async function saveVault() {

  const encrypted =
    await encryptData(accounts);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(encrypted)
  );
}


/* =========================
   RENDER
========================= */

function render() {

  vault.innerHTML = "";


  if (accounts.length === 0) {

    empty.classList.remove(
      "hidden"
    );

    return;
  }


  empty.classList.add(
    "hidden"
  );


  accounts.forEach(
    (account, index) => {

      const card =
        document.createElement(
          "div"
        );

      card.className = "card";


      card.innerHTML = `

        <div class="card-top">

          <div>

            <div class="site-name">
              ${escapeHTML(account.site)}
            </div>

            <small>
              ${
                account.note
                ? escapeHTML(account.note)
                : "Shaxsiy akkaunt"
              }
            </small>

          </div>

          <div>🔐</div>

        </div>


        <div class="info">

          <span>LOGIN</span>

          <strong>
            ${escapeHTML(account.username)}
          </strong>

        </div>


        <div class="info">

          <span>PAROL</span>

          <strong id="pass-${index}">
            ••••••••••••
          </strong>

        </div>


        <div class="actions">

          <button
            onclick="togglePassword(${index})">
            👁 Ko‘rish
          </button>

          <button
            onclick="copyPassword(${index})">
            📋 Nusxalash
          </button>

          <button
            class="delete"
            onclick="deleteAccount(${index})">
            🗑
          </button>

        </div>

      `;


      vault.appendChild(card);

    }
  );
}


/* =========================
   ADD ACCOUNT
========================= */

addBtn.addEventListener(
  "click",
  function() {

    site.value = "";
    username.value = "";
    password.value = "";
    note.value = "";

    modal.classList.remove(
      "hidden"
    );

  }
);


closeModal.addEventListener(
  "click",
  function() {

    modal.classList.add(
      "hidden"
    );

  }
);


saveBtn.addEventListener(
  "click",
  async function() {

    if (
      !site.value.trim() ||
      !username.value.trim() ||
      !password.value
    ) {

      alert(
        "Platforma, login va parolni kiriting."
      );

      return;
    }


    accounts.push({

      site:
        site.value.trim(),

      username:
        username.value.trim(),

      password:
        password.value,

      note:
        note.value.trim()

    });


    await saveVault();

    modal.classList.add(
      "hidden"
    );

    render();

  }
);


/* =========================
   PASSWORD ACTIONS
========================= */

window.togglePassword =
  function(index) {

    const element =
      document.getElementById(
        `pass-${index}`
      );


    if (
      element.textContent ===
      "••••••••••••"
    ) {

      element.textContent =
        accounts[index].password;

    } else {

      element.textContent =
        "••••••••••••";

    }

  };


window.copyPassword =
  async function(index) {

    await navigator.clipboard.writeText(
      accounts[index].password
    );

    alert(
      "Parol nusxalandi."
    );

  };


window.deleteAccount =
  async function(index) {

    const ok =
      confirm(
        "Bu akkauntni o‘chirmoqchimisiz?"
      );

    if (!ok) return;


    accounts.splice(
      index,
      1
    );


    await saveVault();

    render();

  };


/* =========================
   SHOW PASSWORD
========================= */

showPassword.addEventListener(
  "click",
  function() {

    if (
      password.type === "password"
    ) {

      password.type = "text";

    } else {

      password.type = "password";

    }

  }
);


/* =========================
   SETTINGS
========================= */

settingsBtn.addEventListener(
  "click",
  function() {

    settingsModal.classList.remove(
      "hidden"
    );

  }
);


closeSettings.addEventListener(
  "click",
  function() {

    settingsModal.classList.add(
      "hidden"
    );

  }
);


changePasswordBtn.addEventListener(
  "click",
  function() {

    settingsModal.classList.add(
      "hidden"
    );

    oldPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    passwordMessage.textContent = "";

    passwordModal.classList.remove(
      "hidden"
    );

  }
);


closePasswordModal.addEventListener(
  "click",
  function() {

    passwordModal.classList.add(
      "hidden"
    );

  }
);


/* =========================
   CHANGE MASTER PASSWORD
========================= */

changePasswordSave.addEventListener(
  "click",
  async function() {

    const oldPass =
      oldPassword.value;

    const newPass =
      newPassword.value;

    const confirmPass =
      confirmPassword.value;


    if (
      !oldPass ||
      !newPass ||
      !confirmPass
    ) {

      passwordMessage.textContent =
        "Barcha maydonlarni to‘ldiring.";

      return;
    }


    if (
      newPass.length < 8
    ) {

      passwordMessage.textContent =
        "Yangi parol kamida 8 ta belgidan iborat bo‘lsin.";

      return;
    }


    if (
      newPass !== confirmPass
    ) {

      passwordMessage.textContent =
        "Yangi parollar bir xil emas.";

      return;
    }


    try {

      /*
        Eski parol bilan yangi key yaratamiz.
      */

      const oldKey =
        await makeKey(oldPass);


      /*
        Eski ma'lumotlarni eski key bilan
        tekshirib ochamiz.
      */

      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );


      if (!saved) {

        passwordMessage.textContent =
          "Vault ma'lumotlari topilmadi.";

        return;
      }


      const currentAccounts =
        await decryptData(
          JSON.parse(saved),
          oldKey
        );


      /*
        Yangi master passworddan
        yangi encryption key yaratamiz.
      */

      const newKey =
        await makeKey(newPass);


      /*
        Ma'lumotlarni yangi key bilan
        qayta shifrlaymiz.
      */

      const newEncrypted =
        await encryptData(
          currentAccounts,
          newKey
        );


      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(newEncrypted)
      );


      /*
        Hozirgi session ham yangi
        key bilan ishlaydi.
      */

      masterKey = newKey;

      accounts =
        currentAccounts;


      passwordModal.classList.add(
        "hidden"
      );


      alert(
        "Master password muvaffaqiyatli o‘zgartirildi."
      );


    } catch {

      passwordMessage.textContent =
        "Eski master password noto‘g‘ri.";

    }

  }
);


/* =========================
   LOGOUT
========================= */

logoutBtn.addEventListener(
  "click",
  function() {

    masterKey = null;

    accounts = [];

    app.classList.add(
      "hidden"
    );

    loginScreen.classList.remove(
      "hidden"
    );

    loginMessage.textContent = "";

  }
);


/* =========================
   HTML ESCAPE
========================= */

function escapeHTML(value) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}
```
