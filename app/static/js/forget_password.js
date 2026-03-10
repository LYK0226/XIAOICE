// Forget Password Page JavaScript — Routes through backend for verification policy.

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forget-password-form');
    const stepVerify = document.getElementById('step-verify');
    const stepSuccess = document.getElementById('step-success');
    const backLink = document.getElementById('back-link');

    const emailInput = document.getElementById('reset-email');
    const sendBtn = document.getElementById('verify-btn');
    const resetError = document.getElementById('reset-error');
    const resetSuccess = document.getElementById('reset-success');
    const resendBtn = document.getElementById('resend-reset-btn');

    let lastEmail = '';

    // Handle form submission — send reset request to backend
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await handleSendResetEmail();
    });

    // Resend button handler
    resendBtn?.addEventListener('click', async function() {
        if (!lastEmail) return;
        resendBtn.textContent = 'Sending...';
        resendBtn.disabled = true;
        try {
            const res = await fetch('/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: lastEmail })
            });
            const data = await res.json();
            if (res.ok && data.code === 'reset_sent') {
                resendBtn.textContent = 'Email sent! Check your inbox.';
            } else {
                resendBtn.textContent = data.error || data.message || 'Failed to resend.';
            }
        } catch (_) {
            resendBtn.textContent = 'Network error — try again';
        }
        setTimeout(() => {
            resendBtn.textContent = 'Resend Email';
            resendBtn.disabled = false;
        }, 30000); // 30s cooldown
    });

    async function handleSendResetEmail() {
        const email = emailInput.value.trim();

        resetError.textContent = '';
        resetError.style.display = 'none';
        resetError.style.color = '';

        if (!email) {
            showError(resetError, 'Please enter your email address.');
            return;
        }

        if (!isValidEmail(email)) {
            showError(resetError, 'Please enter a valid email address.');
            return;
        }

        lastEmail = email;
        showLoading(sendBtn, 'Sending...');

        try {
            const res = await fetch('/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (!res.ok) {
                // Error from server (e.g. Google account)
                showError(resetError, data.error || 'Failed to process request.');
                return;
            }

            // Unverified account — needs email verification first
            if (data.code === 'verification_needed') {
                goToStep('success');
                const successIcon = document.querySelector('#step-success .success-icon i');
                if (successIcon) {
                    successIcon.className = 'fas fa-exclamation-triangle';
                    successIcon.style.color = '#e67e22';
                }
                resetSuccess.style.color = '#e67e22';
                resetSuccess.innerHTML = '<strong>Email Not Verified</strong><br>' + data.message +
                    '<br><small style="color: #888; margin-top: 6px; display: inline-block;"><i class="fas fa-info-circle"></i> Please sign in first to resend the verification email.</small>';
                resetSuccess.style.display = 'block';
                // Hide resend for verification_needed (they need to verify first via login page)
                resendBtn.style.display = 'none';
                return;
            }

            // Reset email sent successfully
            if (data.code === 'reset_sent') {
                goToStep('success');
                const successIcon = document.querySelector('#step-success .success-icon i');
                if (successIcon) {
                    successIcon.className = 'fas fa-check-circle';
                    successIcon.style.color = '';
                }
                resetSuccess.style.color = '';
                resetSuccess.innerHTML = (data.message || 'A password reset email has been sent. Please check your inbox.') +
                    '<br><small style="color: #888; margin-top: 6px; display: inline-block;"><i class="fas fa-info-circle"></i> Can\'t find it? Check your spam or junk folder.</small>';
                resetSuccess.style.display = 'block';
                resendBtn.style.display = 'inline-block';
                return;
            }

            // Generic success (e.g. anti-enumeration for unknown emails)
            goToStep('success');
            const successIcon = document.querySelector('#step-success .success-icon i');
            if (successIcon) {
                successIcon.className = 'fas fa-check-circle';
                successIcon.style.color = '';
            }
            resetSuccess.style.color = '';
            resetSuccess.innerHTML = (data.message || 'If an account exists with that email, we have sent you an email. Please check your inbox.') +
                '<br><small style="color: #888; margin-top: 6px; display: inline-block;"><i class="fas fa-info-circle"></i> Can\'t find it? Check your spam or junk folder.</small>';
            resetSuccess.style.display = 'block';
            resendBtn.style.display = 'inline-block';
        } catch (err) {
            console.error('Forgot password error:', err);
            showError(resetError, 'Network error. Please check your connection.');
        } finally {
            hideLoading(sendBtn, 'Send Reset Link');
        }
    }

    function goToStep(step) {
        stepVerify.style.display = step === 'verify' ? 'flex' : 'none';
        stepSuccess.style.display = step === 'success' ? 'flex' : 'none';
        backLink.style.display = 'flex';
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

    // Auto-focus email input
    setTimeout(() => emailInput.focus(), 300);
});