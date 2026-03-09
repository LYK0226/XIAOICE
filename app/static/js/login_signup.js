/**
 * Login & Sign-Up page with Firebase Authentication.
 *
 * Flow:
 * 1. Fetch Firebase config from /auth/firebase-config
 * 2. Initialize Firebase client SDK
 * 3. Support Email/Password sign-up & sign-in via Firebase
 * 4. Support Google sign-in via Firebase popup
 * 5. On Firebase login success -> send Firebase ID token to /auth/firebase-login
 *    -> receive local JWT -> store & redirect
 */

// ============================================================================
// UI toggle between sign-in / sign-up panels
// ============================================================================
const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

// Password visibility toggles
document.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;
        const isVisible = input.type === 'text';
        input.type = isVisible ? 'password' : 'text';

        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye', isVisible);
            icon.classList.toggle('fa-eye-slash', !isVisible);
        }
        btn.setAttribute('aria-pressed', String(!isVisible));
    });
});

// ============================================================================
// Firebase Initialization
// ============================================================================
let firebaseReady = false;

async function initFirebase() {
    try {
        const res = await fetch('/auth/firebase-config');
        if (!res.ok) {
            console.warn('Firebase config not available — Google sign-in disabled');
            return;
        }
        const config = await res.json();

        if (!config.apiKey || !config.authDomain || !config.projectId) {
            console.warn('Firebase config incomplete — Google sign-in disabled');
            return;
        }

        firebase.initializeApp(config);
        firebaseReady = true;
        console.log('Firebase initialized');
    } catch (e) {
        console.warn('Failed to initialize Firebase:', e);
    }
}

// Initialize Firebase on page load
initFirebase();

// ============================================================================
// Sign-In verification card helpers
// ============================================================================
function getSignInFormElements() {
    return {
        form: document.getElementById('signin-form'),
        title: document.querySelector('#signin-form h1'),
        googleButton: document.getElementById('google-signin-btn'),
        divider: document.querySelector('#signin-form .divider'),
        emailInput: document.getElementById('signin-email'),
        passwordField: document.querySelector('#signin-form .password-field'),
        rememberContainer: document.querySelector('#signin-form .remember-me-container'),
        forgotLink: document.querySelector('#signin-form a[href="/forgot_password"]'),
        submitButton: document.querySelector('#signin-form button[type="submit"]'),
        errorDiv: document.getElementById('signin-error')
    };
}

function setSignInFormVisibility(isVisible) {
    const signInElements = getSignInFormElements();
    const displayValue = isVisible ? '' : 'none';

    [
        signInElements.title,
        signInElements.googleButton,
        signInElements.divider,
        signInElements.emailInput,
        signInElements.passwordField,
        signInElements.rememberContainer,
        signInElements.forgotLink,
        signInElements.submitButton,
        signInElements.errorDiv
    ].forEach((element) => {
        if (element) {
            element.style.display = displayValue;
        }
    });
}

function restoreSignInForm() {
    const { errorDiv } = getSignInFormElements();
    const verifyCard = document.getElementById('signin-verify-card');

    if (verifyCard) {
        verifyCard.remove();
    }

    setSignInFormVisibility(true);

    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.color = 'red';
    }
}

function showSignInVerificationCard(email, password) {
    const { form, errorDiv } = getSignInFormElements();
    if (!form || !errorDiv) {
        return;
    }

    setSignInFormVisibility(false);

    let verifyCard = document.getElementById('signin-verify-card');
    if (!verifyCard) {
        verifyCard = document.createElement('div');
        verifyCard.id = 'signin-verify-card';
        verifyCard.className = 'verify-card verify-card--warning verify-card--standalone';
        form.appendChild(verifyCard);
    }

    verifyCard.innerHTML =
        '<div class="verify-card__icon"><i class="fas fa-exclamation-triangle"></i></div>' +
        '<div class="verify-card__title">Email Not Verified</div>' +
        '<div class="verify-card__text">Please verify your email address before signing in.</div>' +
        '<div class="verify-card__text"><span class="verify-card__email">' + email + '</span></div>' +
        '<div class="verify-card__spam"><i class="fas fa-info-circle"></i> Check your spam or junk folder for the verification email.</div>' +
        '<div class="verify-card__actions verify-card__actions--stacked">' +
            '<button type="button" class="verify-card__btn" id="resend-signin-verify"><i class="fas fa-paper-plane"></i> Resend Verification Email</button>' +
            '<button type="button" class="verify-card__btn verify-card__btn--secondary" id="signin-back-to-login"><i class="fas fa-arrow-left"></i> Back to Sign In</button>' +
        '</div>';

    document.getElementById('resend-signin-verify')?.addEventListener('click', async () => {
        const resendBtn = document.getElementById('resend-signin-verify');
        if (!resendBtn) {
            return;
        }

        resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        resendBtn.disabled = true;

        try {
            const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
            await cred.user.sendEmailVerification();
            await firebase.auth().signOut();
            resendBtn.innerHTML = '<i class="fas fa-check"></i> Sent! Check your inbox.';
            setTimeout(() => {
                resendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Resend Verification Email';
                resendBtn.disabled = false;
            }, 30000);
        } catch (resendErr) {
            console.error('Resend verification error:', resendErr);
            await firebase.auth().signOut().catch(() => {});
            if (resendErr.code === 'auth/too-many-requests') {
                resendBtn.innerHTML = '<i class="fas fa-clock"></i> Too many attempts';
            } else {
                resendBtn.innerHTML = '<i class="fas fa-redo"></i> Retry';
                resendBtn.disabled = false;
            }
        }
    });

    document.getElementById('signin-back-to-login')?.addEventListener('click', () => {
        restoreSignInForm();
    });
}

// ============================================================================
// Helper: Exchange Firebase ID token for local JWT
// ============================================================================
async function exchangeFirebaseToken(idToken, remember = false) {
    const response = await fetch('/auth/firebase-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, remember })
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        window.location.href = '/';
        return;
    }

    // Attach code for caller to handle specific cases
    const err = new Error(data.error || 'Firebase login failed');
    err.code = data.code || '';
    err.email = data.email || '';
    throw err;
}

// ============================================================================
// Google Sign-In (Firebase popup)
// ============================================================================
async function handleGoogleSignIn(errorDiv) {
    if (!firebaseReady) {
        errorDiv.textContent = 'Google sign-in is not available. Please use email/password.';
        return;
    }

    try {
        errorDiv.textContent = '';
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        const idToken = await result.user.getIdToken();
        const remember = document.getElementById('remember-me')?.checked || false;
        await exchangeFirebaseToken(idToken, remember);
    } catch (e) {
        console.error('Google sign-in error:', e);
        if (e.code === 'auth/popup-closed-by-user') {
            return; // User closed the popup — not an error worth showing
        }
        errorDiv.textContent = e.message || 'Google sign-in failed. Please try again.';
    }
}

// Wire up Google sign-in buttons
document.getElementById('google-signin-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    handleGoogleSignIn(document.getElementById('signin-error'));
});

document.getElementById('google-signup-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    handleGoogleSignIn(document.getElementById('signup-error'));
});

// ============================================================================
// Email/Password Sign-Up
// ============================================================================
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const errorDiv = document.getElementById('signup-error');

    errorDiv.textContent = '';

    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        return;
    }

    try {
        // All sign-ups go through Firebase
        if (!firebaseReady) {
            errorDiv.textContent = 'Firebase is not available. Please try again later.';
            return;
        }

        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            // Update displayName on Firebase side
            if (username) {
                await userCredential.user.updateProfile({ displayName: username });
            }

            // Send email verification
            try {
                await userCredential.user.sendEmailVerification();
            } catch (verifyErr) {
                console.warn('Failed to send verification email:', verifyErr);
            }

            // Sync to local DB (creates user record with email_verified=false)
            try {
                const idToken = await userCredential.user.getIdToken();
                await fetch('/auth/firebase-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_token: idToken })
                });
                // 403 is expected for unverified — we just want the DB record created
            } catch (syncErr) {
                console.warn('Local DB sync on signup:', syncErr);
            }

            // Sign out immediately — user must verify email first, then log in
            await firebase.auth().signOut();

            // Hide form inputs and show verification card
            const submitBtn = document.querySelector('#signup-form button[type="submit"]');
            if (submitBtn) submitBtn.style.display = 'none';
            // Hide form fields
            document.querySelectorAll('#signup-form input:not([type="hidden"]):not([aria-hidden])').forEach(el => el.style.display = 'none');
            document.querySelectorAll('#signup-form .password-field').forEach(el => el.style.display = 'none');
            document.querySelectorAll('#signup-form .divider, #signup-form .google-btn').forEach(el => el.style.display = 'none');

            // Build the verification card
            errorDiv.style.color = '';
            errorDiv.className = '';
            errorDiv.innerHTML = '';
            errorDiv.style.display = 'none';

            let verifyCard = document.getElementById('signup-verify-card');
            if (!verifyCard) {
                verifyCard = document.createElement('div');
                verifyCard.id = 'signup-verify-card';
                verifyCard.className = 'verify-card';
                errorDiv.parentNode.insertBefore(verifyCard, errorDiv);
            }

            verifyCard.innerHTML =
                '<div class="verify-card__icon"><i class="fas fa-envelope-open-text"></i></div>' +
                '<div class="verify-card__title">Registration Successful!</div>' +
                '<div class="verify-card__text">A verification email has been sent to</div>' +
                '<div class="verify-card__text"><span class="verify-card__email">' + email + '</span></div>' +
                '<div class="verify-card__text">Please verify your email before signing in.</div>' +
                '<div class="verify-card__spam"><i class="fas fa-info-circle"></i> Can\'t find it? Check your spam or junk folder.</div>' +
                '<div class="verify-card__actions">' +
                    '<button type="button" class="verify-card__btn" id="resend-signup-verify"><i class="fas fa-paper-plane"></i> Resend Email</button>' +
                    '<a href="#" class="verify-card__link" id="back-to-signin-link"><i class="fas fa-sign-in-alt"></i> Go to Sign In</a>' +
                '</div>';

            document.getElementById('resend-signup-verify')?.addEventListener('click', async () => {
                const resendBtn = document.getElementById('resend-signup-verify');
                resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                resendBtn.disabled = true;
                try {
                    // Re-sign in with Firebase to get the user object, then send verification
                    const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
                    await cred.user.sendEmailVerification();
                    await firebase.auth().signOut();
                    resendBtn.innerHTML = '<i class="fas fa-check"></i> Sent! Check your inbox.';
                    setTimeout(() => {
                        resendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Resend Email';
                        resendBtn.disabled = false;
                    }, 30000); // 30s cooldown
                } catch (resendErr) {
                    console.error('Resend verification error:', resendErr);
                    await firebase.auth().signOut().catch(() => {});
                    if (resendErr.code === 'auth/too-many-requests') {
                        resendBtn.innerHTML = '<i class="fas fa-clock"></i> Too many attempts';
                    } else {
                        resendBtn.innerHTML = '<i class="fas fa-redo"></i> Retry';
                        resendBtn.disabled = false;
                    }
                }
            });

            document.getElementById('back-to-signin-link')?.addEventListener('click', (ev) => {
                ev.preventDefault();
                const container = document.getElementById('container');
                if (container) container.classList.remove('active');
                // Reset the form
                errorDiv.textContent = '';
                errorDiv.style.color = '';
                errorDiv.style.display = '';
                if (submitBtn) submitBtn.style.display = '';
                if (verifyCard) verifyCard.remove();
                // Restore form fields
                document.querySelectorAll('#signup-form input:not([type="hidden"]):not([aria-hidden])').forEach(el => el.style.display = '');
                document.querySelectorAll('#signup-form .password-field').forEach(el => el.style.display = '');
                document.querySelectorAll('#signup-form .divider, #signup-form .google-btn').forEach(el => el.style.display = '');
            });

            return;
        } catch (firebaseError) {
            console.error('Firebase signup error:', firebaseError);
            const errorMap = {
                'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
                'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
                'auth/invalid-email': 'Invalid email format.'
            };
            errorDiv.textContent = errorMap[firebaseError.code] || firebaseError.message || 'Registration failed';
            return;
        }
    } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
        console.error('Error:', error);
    }
});

// ============================================================================
// Email/Password Sign-In
// ============================================================================
document.getElementById('signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    const errorDiv = document.getElementById('signin-error');

    errorDiv.textContent = '';
    errorDiv.style.color = 'red';
    restoreSignInForm();

    try {
        // All sign-ins go through Firebase
        if (!firebaseReady) {
            errorDiv.textContent = 'Firebase is not available. Please try again later.';
            return;
        }

        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const idToken = await userCredential.user.getIdToken();
            try {
                await exchangeFirebaseToken(idToken, rememberMe);
            } catch (exchangeErr) {
                // Sign out from Firebase since local JWT exchange failed
                await firebase.auth().signOut();
                if (exchangeErr.code === 'email_not_verified') {
                    showSignInVerificationCard(email, password);
                    return;
                }
                throw exchangeErr;
            }
            return;
        } catch (firebaseError) {
            restoreSignInForm();

            console.error('Firebase email login failed:', firebaseError.code);
            const errorMap = {
                'auth/user-not-found': 'No account found with this email.',
                'auth/wrong-password': 'Invalid password.',
                'auth/invalid-credential': 'Invalid email or password.',
                'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
                'auth/user-disabled': 'This account has been disabled.'
            };
            errorDiv.textContent = errorMap[firebaseError.code] || firebaseError.message || 'Login failed';
        }
    } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
        console.error('Error:', error);
    }
});