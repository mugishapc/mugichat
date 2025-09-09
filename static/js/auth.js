// Authentication related functions

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuthStatus();
    
    // Initialize auth form validation
    initAuthForms();
});

function checkAuthStatus() {
    // Check if user is authenticated
    if (currentUser) {
        // Redirect to chat if already logged in
        window.location.href = '/';
    }
}

function initAuthForms() {
    // Initialize login form validation
    const loginForm = document.querySelector('.auth-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            if (!validateLoginForm()) {
                e.preventDefault();
            }
        });
    }
    
    // Initialize register form validation
    const registerForm = document.querySelector('.auth-form');
    if (registerForm && registerForm.action.includes('register')) {
        registerForm.addEventListener('submit', function(e) {
            if (!validateRegisterForm()) {
                e.preventDefault();
            }
        });
        
        // Add password strength checker
        const passwordInput = document.querySelector('input[name="password"]');
        if (passwordInput) {
            passwordInput.addEventListener('input', checkPasswordStrength);
        }
        
        // Add password confirmation check
        const passwordConfirmInput = document.querySelector('input[name="password_confirm"]');
        if (passwordConfirmInput) {
            passwordConfirmInput.addEventListener('input', checkPasswordMatch);
        }
    }
}

function validateLoginForm() {
    const username = document.querySelector('input[name="username"]').value.trim();
    const password = document.querySelector('input[name="password"]').value;
    
    if (!username) {
        showError('Username or email is required');
        return false;
    }
    
    if (!password) {
        showError('Password is required');
        return false;
    }
    
    return true;
}

function validateRegisterForm() {
    const username = document.querySelector('input[name="username"]').value.trim();
    const email = document.querySelector('input[name="email"]').value.trim();
    const password = document.querySelector('input[name="password"]').value;
    const passwordConfirm = document.querySelector('input[name="password_confirm"]').value;
    
    if (!username) {
        showError('Username is required');
        return false;
    }
    
    if (username.length < 3) {
        showError('Username must be at least 3 characters long');
        return false;
    }
    
    if (!email) {
        showError('Email is required');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return false;
    }
    
    if (!password) {
        showError('Password is required');
        return false;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return false;
    }
    
    if (password !== passwordConfirm) {
        showError('Passwords do not match');
        return false;
    }
    
    return true;
}

function checkPasswordStrength() {
    const password = document.querySelector('input[name="password"]').value;
    const strengthIndicator = document.getElementById('password-strength') || createPasswordStrengthIndicator();
    
    if (!password) {
        strengthIndicator.textContent = '';
        strengthIndicator.className = 'password-strength';
        return;
    }
    
    let strength = 0;
    let tips = '';
    
    // Check password length
    if (password.length >= 8) {
        strength += 1;
    } else {
        tips += 'Make the password longer. ';
    }
    
    // Check for mixed case
    if (password.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/)) {
        strength += 1;
    } else {
        tips += 'Use both uppercase and lowercase letters. ';
    }
    
    // Check for numbers
    if (password.match(/([0-9])/)) {
        strength += 1;
    } else {
        tips += 'Include at least one number. ';
    }
    
    // Check for special characters
    if (password.match(/([!,@,#,$,%,^,&,*,?,_,~])/)) {
        strength += 1;
    } else {
        tips += 'Include at least one special character. ';
    }
    
    // Update strength indicator
    let strengthText = '';
    let strengthClass = '';
    
    switch (strength) {
        case 0:
        case 1:
            strengthText = 'Weak';
            strengthClass = 'weak';
            break;
        case 2:
            strengthText = 'Fair';
            strengthClass = 'fair';
            break;
        case 3:
            strengthText = 'Good';
            strengthClass = 'good';
            break;
        case 4:
            strengthText = 'Strong';
            strengthClass = 'strong';
            break;
    }
    
    strengthIndicator.textContent = strengthText;
    strengthIndicator.className = `password-strength ${strengthClass}`;
    
    if (tips && strength < 4) {
        strengthIndicator.title = tips;
    }
}

function createPasswordStrengthIndicator() {
    const passwordGroup = document.querySelector('input[name="password"]').closest('.form-group');
    const strengthIndicator = document.createElement('div');
    strengthIndicator.id = 'password-strength';
    strengthIndicator.className = 'password-strength';
    passwordGroup.appendChild(strengthIndicator);
    return strengthIndicator;
}

function checkPasswordMatch() {
    const password = document.querySelector('input[name="password"]').value;
    const passwordConfirm = document.querySelector('input[name="password_confirm"]').value;
    const matchIndicator = document.getElementById('password-match') || createPasswordMatchIndicator();
    
    if (!passwordConfirm) {
        matchIndicator.textContent = '';
        matchIndicator.className = 'password-match';
        return;
    }
    
    if (password === passwordConfirm) {
        matchIndicator.textContent = 'Passwords match';
        matchIndicator.className = 'password-match match';
    } else {
        matchIndicator.textContent = 'Passwords do not match';
        matchIndicator.className = 'password-match no-match';
    }
}

function createPasswordMatchIndicator() {
    const passwordConfirmGroup = document.querySelector('input[name="password_confirm"]').closest('.form-group');
    const matchIndicator = document.createElement('div');
    matchIndicator.id = 'password-match';
    matchIndicator.className = 'password-match';
    passwordConfirmGroup.appendChild(matchIndicator);
    return matchIndicator;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(message) {
    // Remove any existing error messages
    const existingErrors = document.querySelectorAll('.alert-error');
    existingErrors.forEach(error => error.remove());
    
    // Create new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.textContent = message;
    
    // Insert error message before the form
    const form = document.querySelector('.auth-form');
    form.parentNode.insertBefore(errorDiv, form);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

function logout() {
    fetch('/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => {
        if (response.redirected) {
            window.location.href = response.url;
        }
    })
    .catch(error => {
        console.error('Logout error:', error);
    });
}

// Password visibility toggle
function togglePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = document.querySelector(`[data-toggle="${inputId}"]`);
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Add password visibility toggles
document.addEventListener('DOMContentLoaded', function() {
    // Add toggle buttons to password fields
    const passwordFields = document.querySelectorAll('input[type="password"]');
    passwordFields.forEach(field => {
        const toggleButton = document.createElement('span');
        toggleButton.className = 'password-toggle';
        toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
        toggleButton.dataset.toggle = field.id;
        toggleButton.onclick = () => togglePasswordVisibility(field.id);
        
        field.parentNode.appendChild(toggleButton);
    });
});