// Forget Password Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const forgetPasswordForm = document.getElementById('forget-password-form');
    const resetEmailInput = document.getElementById('reset-email');
    const resetErrorDiv = document.getElementById('reset-error');
    const resetSuccessDiv = document.getElementById('reset-success');
    const submitButton = forgetPasswordForm.querySelector('button[type="submit"]');
    const backToLoginBtn = document.getElementById('back-to-login');

    // Handle form submission
    forgetPasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = resetEmailInput.value.trim();

        // Clear previous messages
        resetErrorDiv.textContent = '';
        resetSuccessDiv.textContent = '';

        // Basic validation
        if (!email) {
            resetErrorDiv.textContent = 'Please enter your email address.';
            return;
        }

        if (!isValidEmail(email)) {
            resetErrorDiv.textContent = 'Please enter a valid email address.';
            return;
        }

        // Disable button and show loading state
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        try {
            const response = await fetch('/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email })
            });

            const data = await response.json();

            if (response.ok) {
                // Success
                resetSuccessDiv.textContent = data.message || 'Password reset link sent! Please check your email.';
                resetEmailInput.value = '';
            } else {
                // Error
                resetErrorDiv.textContent = data.error || 'An error occurred. Please try again.';
            }
        } catch (error) {
            console.error('Error:', error);
            resetErrorDiv.textContent = 'Network error. Please check your connection and try again.';
        } finally {
            // Re-enable button
            submitButton.disabled = false;
            submitButton.textContent = 'Send Reset Link';
        }
    });

    // Handle back to login button
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', function() {
            window.location.href = '/login';
        });
    }

    // Email validation helper
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Add input focus/blur effects
    resetEmailInput.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
    });

    resetEmailInput.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });

    // Auto-focus email input on page load
    setTimeout(() => {
        resetEmailInput.focus();
    }, 500);

    // Handle Enter key for better UX
    resetEmailInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            forgetPasswordForm.dispatchEvent(new Event('submit'));
        }
    });

    // Add loading animation for better UX
    function showLoading(button, text) {
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    }

    function hideLoading(button, text) {
        button.disabled = false;
        button.innerHTML = text;
    }

    // Enhanced form submission with loading
    const originalSubmitHandler = forgetPasswordForm.onsubmit;
    forgetPasswordForm.addEventListener('submit', function(e) {
        if (submitButton.disabled) return;

        showLoading(submitButton, 'Sending...');

        // Call original handler
        if (originalSubmitHandler) {
            originalSubmitHandler.call(this, e);
        }
    });

    // Listen for successful submission to hide loading
    forgetPasswordForm.addEventListener('success', function() {
        hideLoading(submitButton, 'Send Reset Link');
    });

    forgetPasswordForm.addEventListener('error', function() {
        hideLoading(submitButton, 'Send Reset Link');
    });
});