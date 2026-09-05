import supabase from "../supabase.js";

// Custom SweetAlert Dark Theme Config
const swalCustom = {
    popup: 'postify-swal-popup',
    confirmButton: 'postify-swal-confirm',
    cancelButton: 'postify-swal-cancel'
};

document.addEventListener('DOMContentLoaded', () => {
    const subtitle = document.getElementById('headerSubtitle');
    const signupTab = document.getElementById('signup-tab');
    const loginTab = document.getElementById('login-tab');

    if (signupTab && loginTab && subtitle) {
        signupTab.addEventListener('click', () => {
            subtitle.textContent = "Create your account to get started!";
        });

        loginTab.addEventListener('click', () => {
            subtitle.textContent = "Welcome back! Please login to your account.";
        });
    }
});

// ================= SIGNUP =================

const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', signup);
}

async function signup(event) {
    event.preventDefault();
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('signEmail').value.trim();
    const password = document.getElementById('signPassword').value;
    const number = document.getElementById('signNumber').value.trim();

    if (!firstName || !lastName || !email || !number || !password) {
        Swal.fire({
            icon: 'error',
            title: 'Required Fields',
            text: 'Please fill in all fields!',
            customClass: swalCustom,
            buttonsStyling: false
        });
        return;
    }

    const passwordRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordRe.test(password)) {
        Swal.fire({
            icon: 'warning',
            title: 'Weak Password',
            text: 'Password must be 6+ characters with at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.',
            confirmButtonText: 'OK',
            customClass: swalCustom,
            buttonsStyling: false
        });
        return;
    }

    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRe.test(email)) {
        // FIXED SYNTAX ERROR HERE
        Swal.fire({
            icon: 'error',
            title: 'Invalid Email',
            text: 'Please enter a valid email address.',
            customClass: swalCustom,
            buttonsStyling: false
        });
        return;
    }

    const submitBtn = signupForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '.7'; }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`,
                number: number
            }
        }
    });

    if (error) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
        Swal.fire({
            icon: 'error',
            title: 'Sign Up Error',
            text: error.message,
            customClass: swalCustom,
            buttonsStyling: false
        });
        return;
    }

    Swal.fire({
        icon: 'success',
        title: `${firstName}, Registration Successful`,
        text: 'Please check your email for verification link.',
        showConfirmButton: true,
        confirmButtonText: 'OK',
        customClass: swalCustom,
        buttonsStyling: false
    });

    setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 2500);
}

// ================= LOGIN =================

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', login);
}

async function login(event) {
    event.preventDefault();
    const loginEmail = document.getElementById('email').value.trim();
    const loginPassword = document.getElementById('password').value;

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '.7'; }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: loginPassword,
        });

        if (error) {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: error.message,
                customClass: swalCustom,
                buttonsStyling: false
            });
        } else {
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Login Successful',
                showConfirmButton: false,
                timer: 1500,
                customClass: swalCustom,
                buttonsStyling: false
            });

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1500);
        }
    } catch (error) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Login failed',
            customClass: swalCustom,
            buttonsStyling: false
        });
    }
}

// ================= GOOGLE LOGIN =================

async function loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${window.location.origin}/dashboard.html`
        }
    });

    if (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            customClass: swalCustom,
            buttonsStyling: false
        });
    }
}

// ================= UI EVENTS =================

document.addEventListener("DOMContentLoaded", () => {
    const authContainer = document.getElementById("authContainer");
    const sliderToggleBtn = document.getElementById("sliderToggleBtn");
    const toLoginLink = document.getElementById("toLoginLink");
    const toSignupLink = document.getElementById("toSignupLink");

    const toggleAuthMode = () => {
        authContainer.classList.toggle("login-active");
    };

    if (sliderToggleBtn) sliderToggleBtn.addEventListener("click", toggleAuthMode);
    if (toLoginLink) toLoginLink.addEventListener("click", (e) => { e.preventDefault(); toggleAuthMode(); });
    if (toSignupLink) toSignupLink.addEventListener("click", (e) => { e.preventDefault(); toggleAuthMode(); });

    document.querySelectorAll(".toggle-password").forEach(icon => {
        icon.addEventListener("click", function() {
            const input = this.previousElementSibling;
            if (input.type === "password") {
                input.type = "text";
                this.classList.replace("fa-eye", "fa-eye-slash");
            } else {
                input.type = "password";
                this.classList.replace("fa-eye-slash", "fa-eye");
            }
        });
    });
});

window.signup = signup;
window.login = login;
window.loginWithGoogle = loginWithGoogle;

export { supabase };