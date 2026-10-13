
import { auth } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
    getIdTokenResult,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const loginForm = document.getElementById("form-login");
const registerForm = document.getElementById("form-register");
const recoveryForm = document.getElementById("form-recovery");

const loginTab = document.getElementById("tab-login");
const registerTab = document.getElementById("tab-register");

const messageBox = document.getElementById("auth-message");
const title = document.getElementById("auth-title");
const subtitle = document.getElementById("auth-subtitle");

const recoveryButton = document.getElementById("show-recovery");
const backToLoginButton = document.getElementById("back-to-login");

let isSubmitting = false;

function showMessage(message, type = "info") {
    messageBox.textContent = message;
    messageBox.dataset.type = type;
}

function clearMessage() {
    messageBox.textContent = "";
    delete messageBox.dataset.type;
}

function showView(view) {
    if (isSubmitting) return;
    clearMessage();

    const isLogin = view === "login";
    const isRegister = view === "register";
    const isRecovery = view === "recovery";

    loginForm.hidden = !isLogin;
    registerForm.hidden = !isRegister;
    recoveryForm.hidden = !isRecovery;

    loginTab.hidden = isRecovery;
    registerTab.hidden = isRecovery;

    loginTab.tabIndex = isLogin ? 0 : -1;
    registerTab.tabIndex = isRegister ? 0 : -1;
    loginTab.setAttribute("aria-selected", String(isLogin));
    registerTab.setAttribute("aria-selected", String(isRegister));

    title.textContent = isLogin
        ? "Bienvenida a Glamurosa"
        : isRegister
          ? "Crea tu cuenta"
          : "Recupera tu contraseña";

    subtitle.textContent = isLogin
        ? "Inicia sesión para continuar con tus citas."
        : isRegister
          ? "Regístrate para comenzar a reservar."
          : "Te ayudaremos a recuperar el acceso a tu cuenta.";
}

function translateFirebaseError(error) {
    switch (error?.code) {
        case "auth/invalid-email":
            return "El correo electrónico no tiene un formato válido.";

        case "auth/missing-password":
            return "Escribe tu contraseña.";

        case "auth/weak-password":
            return "La contraseña es demasiado débil. Usa al menos 6 caracteres.";

        case "auth/email-already-in-use":
            return "No se pudo crear la cuenta con esos datos. Si ya tienes una cuenta, intenta iniciar sesión.";

        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
            return "No se pudo iniciar sesión con esos datos. Comprueba tu correo y contraseña.";

        case "auth/too-many-requests":
            return "Hubo demasiados intentos. Espera un momento e inténtalo de nuevo.";

        case "auth/network-request-failed":
            return "No se pudo conectar. Comprueba tu conexión a internet.";

        case "auth/operation-not-allowed":
            return "El registro no está disponible en este momento. Contacta con el salón.";

        case "auth/user-disabled":
            return "Esta cuenta está deshabilitada. Contacta con el salón.";

        case "auth/missing-email":
            return "Escribe tu correo electrónico.";

        case "auth/invalid-action-code":
        case "auth/expired-action-code":
            return "El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo.";

        default:
            console.error("Error de Firebase Authentication:", error);
            return "Ocurrió un error inesperado. Inténtalo de nuevo.";
    }
}

function setFormBusy(form, busy, busyText = "Procesando...") {
    const submitButton = form.querySelector('button[type="submit"]');

    if (!submitButton) return;

    if (busy) {
        submitButton.dataset.originalText = submitButton.textContent;
        submitButton.textContent = busyText;
        submitButton.disabled = true;
    } else {
        submitButton.textContent =
            submitButton.dataset.originalText || submitButton.textContent;
        submitButton.disabled = false;
        delete submitButton.dataset.originalText;
    }
}

async function runFormAction(form, busyText, action) {
    if (isSubmitting) return;

    isSubmitting = true;
    setFormBusy(form, true, busyText);

    try {
        await action();
    } catch (error) {
        showMessage(translateFirebaseError(error), "error");
    } finally {
        setFormBusy(form, false);
        isSubmitting = false;
    }
}

async function goToAccount() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const { claims } = await getIdTokenResult(user);
        if (auth.currentUser !== user) return;
        window.location.replace(claims.admin === true ? "admin.html" : "reserva.html");
    } catch (error) {
        console.error("No se pudieron comprobar los permisos:", error);
        showMessage("No se pudo verificar el acceso. Comprueba tu conexión y vuelve a iniciar sesión.", "error");
    }
}

loginTab.addEventListener("click", () => showView("login"));
registerTab.addEventListener("click", () => showView("register"));

recoveryButton.addEventListener("click", () => {
    const loginEmail = document.getElementById("login-email").value.trim();
    document.getElementById("recovery-email").value = loginEmail;
    showView("recovery");
    if (!isSubmitting) document.getElementById("recovery-email").focus();
});

backToLoginButton.addEventListener("click", () => {
    showView("login");
    if (!isSubmitting) loginTab.focus();
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    if (!loginForm.reportValidity()) return;

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    await runFormAction(loginForm, "Iniciando sesión...", async () => {
        await signInWithEmailAndPassword(auth, email, password);
        await goToAccount();
    });
});

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    if (!registerForm.reportValidity()) return;

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const passwordConfirm = document.getElementById(
        "register-password-confirm",
    ).value;

    if (name.length < 2) {
        showMessage("Escribe tu nombre completo.", "error");
        return;
    }

    if (password !== passwordConfirm) {
        showMessage("Las contraseñas no coinciden.", "error");
        return;
    }

    await runFormAction(registerForm, "Creando cuenta...", async () => {
        const credential = await createUserWithEmailAndPassword(
            auth,
            email,
            password,
        );

        try {
            await updateProfile(credential.user, {
                displayName: name,
            });
        } catch (error) {
            // La cuenta ya fue creada. No se oculta el error de perfil
            // en consola, pero se permite continuar con la sesión.
            console.error("No se pudo guardar el nombre del perfil:", error);
        }

        await goToAccount();
    });
});

recoveryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    if (!recoveryForm.reportValidity()) return;

    const email = document.getElementById("recovery-email").value.trim();

    await runFormAction(
        recoveryForm,
        "Enviando...",
        async () => {
            await sendPasswordResetEmail(auth, email);

            showMessage(
                "Si existe una cuenta asociada a ese correo, recibirás instrucciones para restablecer la contraseña. Revisa también la carpeta de spam.",
                "success",
            );

            recoveryForm.reset();
        },
    );
});

// Si una sesión ya está activa, no es necesario iniciar sesión de nuevo.
// No se lee ni se utiliza ningún rol guardado en el navegador.
auth.authStateReady()
    .then(async () => {
        if (auth.currentUser && !isSubmitting) {
            await goToAccount();
        }
    })
    .catch((error) => {
        console.error("No se pudo comprobar la sesión actual:", error);
    });


[loginTab, registerTab].forEach((tab) => {
    tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || isSubmitting) return;
        event.preventDefault();
        const next = event.key === "Home" ? loginTab : event.key === "End" ? registerTab : tab === loginTab ? registerTab : loginTab;
        next.click();
        next.focus();
    });
});
if (new URLSearchParams(location.search).get("view") === "register") showView("register");
