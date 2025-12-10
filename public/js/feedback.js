// Check if user is authenticated
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = '/login.html';
            return;
        }

        if (data.user.isAdmin) {
            window.location.href = '/admin.html';
            return;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login.html';
    }
}

const feedbackForm = document.getElementById('feedbackForm');
const alertContainer = document.getElementById('alertContainer');
const submitBtn = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');
const submitSpinner = document.getElementById('submitSpinner');

function showAlert(message, type) {
    alertContainer.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Scroll to alert
    alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const facultyName = document.getElementById('facultyName').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const feedbackText = document.getElementById('feedbackText').value.trim();
    const isAnonymous = document.getElementById('isAnonymous').checked;

    // Show loading state
    submitBtn.disabled = true;
    submitBtnText.style.display = 'none';
    submitSpinner.style.display = 'inline-block';

    try {
        const response = await fetch('/api/feedback/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                facultyName, 
                subject, 
                feedbackText, 
                isAnonymous 
            })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(
                `✅ Feedback submitted successfully! AI Sentiment: <strong>${data.feedback.sentiment.toUpperCase()}</strong>`, 
                'success'
            );
            feedbackForm.reset();
        } else {
            showAlert(data.error || 'Failed to submit feedback. Please try again.', 'danger');
        }
    } catch (error) {
        console.error('Submit error:', error);
        showAlert('An error occurred. Please try again later.', 'danger');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtnText.style.display = 'inline';
        submitSpinner.style.display = 'none';
    }
});

async function handleLogout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        if (response.ok) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out');
    }
}

// Check auth on page load
checkAuth();
