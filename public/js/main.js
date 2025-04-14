// Check for token and set auth header
function getToken() {
    return localStorage.getItem('token');
  }
  
  // Logout function
  function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  
  // Format currency
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  // API request helper with authorization
  async function apiRequest(url, options = {}) {
    const token = getToken();
    
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      };
    }
    
    options.credentials = 'same-origin';
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.status === 401) {
      // Token expired or invalid, redirect to login
      logout();
    }
    
    return data;
  }
  
  // Initialize Stripe
  let stripe;
  if (window.Stripe) {
    stripe = Stripe('your_stripe_publishable_key'); // Replace with your actual publishable key
  }
  
  // Initialize page-specific scripts
  document.addEventListener('DOMContentLoaded', function() {
    // Handle logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        logout();
      });
    }
    
    // Add any other initialization code here
  });

// Initialize Bootstrap components
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all dropdowns
    var dropdowns = document.querySelectorAll('.dropdown-toggle');
    dropdowns.forEach(dropdown => {
        new bootstrap.Dropdown(dropdown);
    });

    // Initialize all tooltips
    var tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => {
        new bootstrap.Tooltip(tooltip);
    });

    // Initialize all popovers
    var popovers = document.querySelectorAll('[data-bs-toggle="popover"]');
    popovers.forEach(popover => {
        new bootstrap.Popover(popover);
    });

    // Auto-hide alerts after 5 seconds
    var alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            var bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
});

// Active link highlighting
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
});

// Form validation
document.addEventListener('DOMContentLoaded', function() {
    const forms = document.querySelectorAll('form.needs-validation');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
});

// File input customization
document.addEventListener('DOMContentLoaded', function() {
    const fileInputs = document.querySelectorAll('.custom-file-input');
    
    fileInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const fileName = e.target.files[0]?.name;
            const label = input.nextElementSibling;
            if (label) {
                label.textContent = fileName || 'Choose file';
            }
        });
    });
});

// Confirm actions
function confirmAction(message = 'Are you sure you want to proceed?') {
    return confirm(message);
}

// Format currency
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Format date
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

// Handle AJAX errors
function handleAjaxError(error) {
    console.error('AJAX Error:', error);
    const message = error.responseJSON?.message || 'An error occurred. Please try again.';
    alert(message);
}

// Show loading spinner
function showLoading(element) {
    element.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
    element.disabled = true;
}

// Hide loading spinner
function hideLoading(element, originalText) {
    element.innerHTML = originalText;
    element.disabled = false;
}