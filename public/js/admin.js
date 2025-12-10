let allFeedback = [];
let currentFilter = 'all';

// Check if user is admin
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = '/login.html';
            return;
        }

        if (!data.user.isAdmin) {
            alert('Access denied. Admin only.');
            window.location.href = '/feedback.html';
            return;
        }

        // Display admin name
        document.getElementById('adminName').innerHTML = `
            <i class="bi bi-person-circle"></i> ${data.user.name}
        `;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login.html';
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('/api/feedback/stats');
        const data = await response.json();

        document.getElementById('totalFeedback').textContent = data.total;
        document.getElementById('positiveFeedback').textContent = data.positive;
        document.getElementById('negativeFeedback').textContent = data.negative;
        document.getElementById('neutralFeedback').textContent = data.neutral;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load all feedback
async function loadFeedback() {
    try {
        const response = await fetch('/api/feedback/all');
        const data = await response.json();

        allFeedback = data.feedback;
        
        // Hide loading spinner
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('feedbackTableContainer').style.display = 'block';
        
        displayFeedback(allFeedback);
    } catch (error) {
        console.error('Error loading feedback:', error);
        document.getElementById('loadingSpinner').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error loading feedback data.
            </div>
        `;
    }
}

// Display feedback in table
function displayFeedback(feedbackList) {
    const tbody = document.getElementById('feedbackTableBody');
    const noDataMessage = document.getElementById('noDataMessage');
    
    if (feedbackList.length === 0) {
        tbody.innerHTML = '';
        noDataMessage.style.display = 'block';
        return;
    }
    
    noDataMessage.style.display = 'none';
    
    tbody.innerHTML = feedbackList.map((feedback, index) => {
        const date = new Date(feedback.created_at);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td>
                    ${feedback.is_anonymous 
                        ? '<i class="bi bi-incognito"></i> Anonymous' 
                        : feedback.student_name}
                </td>
                <td>${feedback.faculty_name}</td>
                <td>${feedback.subject}</td>
                <td>
                    <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                         title="${feedback.feedback_text}">
                        ${feedback.feedback_text}
                    </div>
                </td>
                <td>
                    <span class="sentiment-badge ${feedback.sentiment}">
                        ${feedback.sentiment === 'positive' ? '<i class="bi bi-emoji-smile"></i>' : 
                          feedback.sentiment === 'negative' ? '<i class="bi bi-emoji-frown"></i>' : 
                          '<i class="bi bi-emoji-neutral"></i>'}
                        ${feedback.sentiment}
                    </span>
                </td>
                <td style="white-space: nowrap;">${formattedDate}</td>
            </tr>
        `;
    }).join('');
}

// Filter feedback
function filterFeedback(sentiment) {
    currentFilter = sentiment;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === sentiment) {
            btn.classList.add('active');
        }
    });
    
    // Filter and display
    if (sentiment === 'all') {
        displayFeedback(allFeedback);
    } else {
        const filtered = allFeedback.filter(f => f.sentiment === sentiment);
        displayFeedback(filtered);
    }
}

// Refresh all data
async function refreshData() {
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('feedbackTableContainer').style.display = 'none';
    
    await loadStats();
    await loadFeedback();
}

// Handle logout
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

// Setup filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        filterFeedback(btn.dataset.filter);
    });
});

// Initialize on page load
async function init() {
    await checkAuth();
    await loadStats();
    await loadFeedback();
}

init();
