// Forget Password Page JavaScript — Multi-step: verify identity → set new password

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forget-password-form');
    const stepVerify = document.getElementById('step-verify');
    const stepPassword = document.getElementById('step-password');
    const stepSuccess = document.getElementById('step-success');
    const backLink = document.getElementById('back-link');

    // Step 1 elements
    const emailInput = document.getElementById('reset-email');
    const usernameInput = document.getElementById('reset-username');
    const verifyBtn = document.getElementById('verify-btn');
    const resetError = document.getElementById('reset-error');

    // Step 2 elements
    const newPasswordInput = document.getElementById('new-password');
    const resetBtn = document.getElementById('reset-btn');
    const passwordError = document.getElementById('password-error');

    // Step 3 elements
    const resetSuccess = document.getElementById('reset-success');

    let currentStep = 'verify'; // 'verify' | 'password' | 'success'
    let verifiedEmail = '';
    let verifiedUsername = '';

    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (currentStep === 'verify') {
            await handleVerify();
        } else if (currentStep === 'password') {
            await handleReset();
        }
    });

    // Step 1: Verify identity
    async function handleVerify() {
        const email = emailInput.value.trim();
        const username = usernameInput.value.trim();

        resetError.textContent = '';
        resetError.style.display = 'none';

        if (!email) {
            showError(resetError, 'Please enter your email address.');
            return;
        }

        if (!isValidEmail(email)) {
            showError(resetError, 'Please enter a valid email address.');
            return;
        }

        if (!username) {
            showError(resetError, 'Please enter your username.');
            return;
        }

        showLoading(verifyBtn, 'Verifying...');

        try {
            const response = await fetch('/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username })
            });

            const data = await response.json();

            if (response.ok && data.verified) {
                verifiedEmail = email;
                verifiedUsername = username;
                goToStep('password');
            } else {
                showError(resetError, data.error || 'Verification failed. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            showError(resetError, 'Network error. Please check your connection.');
        } finally {
            hideLoading(verifyBtn, 'Verify Identity');
        }
    }

    // Step 2: Reset password
    async function handleReset() {
        const newPassword = newPasswordInput.value;

        passwordError.textContent = '';
        passwordError.style.display = 'none';

        if (!newPassword) {
            showError(passwordError, 'Please enter a new password.');
            return;
        }

        if (newPassword.length < 6) {
            showError(passwordError, 'Password must be at least 6 characters.');
            return;
        }

        showLoading(resetBtn, 'Resetting...');

        try {
            const response = await fetch('/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: verifiedEmail,
                    username: verifiedUsername,
                    new_password: newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                goToStep('success');
                resetSuccess.textContent = data.message || 'Password reset successfully!';
                resetSuccess.style.display = 'block';
            } else {
                showError(passwordError, data.error || 'Reset failed. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            showError(passwordError, 'Network error. Please check your connection.');
        } finally {
            hideLoading(resetBtn, 'Reset Password');
        }
    }

    function goToStep(step) {
        currentStep = step;
        stepVerify.style.display = step === 'verify' ? 'flex' : 'none';
        stepPassword.style.display = step === 'password' ? 'flex' : 'none';
        stepSuccess.style.display = step === 'success' ? 'flex' : 'none';
        backLink.style.display = step === 'success' ? 'none' : 'flex';

        if (step === 'password') {
            setTimeout(() => newPasswordInput.focus(), 200);
        }
    }

    function showError(el, msg) {
        el.textContent = msg;
        el.style.display = 'block';
    }

    function showLoading(btn, text) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    }

    function hideLoading(btn, text) {
        btn.disabled = false;
        btn.textContent = text;
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Auto-focus first input
    setTimeout(() => emailInput.focus(), 300);
});

// Toggle password visibility
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}