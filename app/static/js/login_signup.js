const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

// Toggle between sign-in and sign-up forms
registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

// Handle Sign Up form submission
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
        const response = await fetch('/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Registration successful! Please sign in.');
            // Switch to sign-in form
            container.classList.remove("active");
            // Clear the form
            document.getElementById('signup-form').reset();
        } else {
            errorDiv.textContent = data.error || 'Registration failed';
        }
    } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
        console.error('Error:', error);
    }
});

// Handle Sign In form submission
document.getElementById('signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    const errorDiv = document.getElementById('signin-error');
    
    errorDiv.textContent = '';
    
    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, remember: rememberMe })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Redirect to index page on successful login
            window.location.href = '/';
        } else {
            errorDiv.textContent = data.error || 'Login failed';
        }
    } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
        console.error('Error:', error);
    }
});

// Handle "Forget Your Password?" link
document.addEventListener('DOMContentLoaded', function() {
    const forgetPasswordLink = document.querySelector('a[href="#"]');
    if (forgetPasswordLink && forgetPasswordLink.textContent.includes('Forget Your Password')) {
        forgetPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/forgot-password';
        });
    }
});