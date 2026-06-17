document.addEventListener('DOMContentLoaded', () => {
    // State
    let allUpdates = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedUpdate = null;

    // DOM Elements
    const notesGrid = document.getElementById('notes-grid');
    const feedLoader = document.getElementById('feed-loader');
    const emptyState = document.getElementById('empty-state');
    const refreshBtn = document.getElementById('refresh-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const btnSpinner = document.getElementById('btn-spinner');
    const btnText = refreshBtn.querySelector('.btn-text');
    const retryBtn = document.getElementById('retry-btn');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    
    // Status Elements
    const statusText = document.getElementById('status-text');
    const sourceText = document.getElementById('source-text');
    const totalCount = document.getElementById('total-count');
    
    // Category Count Badges
    const countAll = document.getElementById('count-all');
    const countFeature = document.getElementById('count-feature');
    const countFix = document.getElementById('count-fix');
    const countIssue = document.getElementById('count-issue');
    const countDeprecation = document.getElementById('count-deprecation');

    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const submitTweetBtn = document.getElementById('submit-tweet-btn');
    const previewType = document.getElementById('preview-type');
    const previewDate = document.getElementById('preview-date');
    const previewContent = document.getElementById('preview-content');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const tweetLinkText = document.getElementById('tweet-link-text');

    // Max length for tweet text (X/Twitter counts URLs as 23 characters, leaving 256 for text)
    const MAX_TWEET_TEXT_LEN = 256;

    // Initialize Theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }

    // Fetch releases from local Flask API
    async function fetchReleases(forceRefresh = false) {
        setLoadingState(true);
        try {
            const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }
            const result = await response.json();
            
            if (result.status === 'error') {
                throw new Error(result.message);
            }

            allUpdates = result.data || [];
            
            // Update UI status details
            updateStatusDetails(result);
            
            // Update category badge counters
            updateCategoryCounters();
            
            // Render the items
            renderUpdates();
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showErrorState(error.message);
        } finally {
            setLoadingState(false);
        }
    }

    // Set Loading State
    function setLoadingState(isLoading) {
        if (isLoading) {
            feedLoader.classList.remove('hidden');
            notesGrid.classList.add('hidden');
            emptyState.classList.add('hidden');
            btnSpinner.classList.add('active');
            btnText.textContent = 'Refreshing...';
            refreshBtn.disabled = true;
            if (exportCsvBtn) exportCsvBtn.disabled = true;
            statusText.textContent = 'Refreshing...';
            statusText.className = 'status-badge loading';
        } else {
            feedLoader.classList.add('hidden');
            btnSpinner.classList.remove('active');
            btnText.textContent = 'Refresh Feed';
            refreshBtn.disabled = false;
            if (exportCsvBtn) exportCsvBtn.disabled = false;
        }
    }

    // Show Error State
    function showErrorState(message) {
        notesGrid.innerHTML = '';
        notesGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        
        statusText.textContent = 'Error';
        statusText.className = 'status-badge error';
        sourceText.textContent = '-';
        
        // Show message in empty state description
        emptyState.querySelector('p').textContent = `Something went wrong: ${message}`;
    }

    // Update Status Badge Details
    function updateStatusDetails(result) {
        if (result.status === 'warning') {
            statusText.textContent = 'Warning';
            statusText.className = 'status-badge error';
        } else {
            statusText.textContent = 'Online';
            statusText.className = 'status-badge success';
        }
        
        // Source info
        if (result.source === 'cache') {
            sourceText.textContent = 'Cache';
        } else if (result.source === 'cache_fallback') {
            sourceText.textContent = 'Cache (Fallback)';
        } else {
            sourceText.textContent = 'Live Feed';
        }
        
        totalCount.textContent = allUpdates.length;
    }

    // Calculate Category Counters
    function updateCategoryCounters() {
        let counts = {
            all: allUpdates.length,
            feature: 0,
            fix: 0,
            issue: 0,
            deprecation: 0
        };

        allUpdates.forEach(update => {
            const type = update.type.toLowerCase();
            if (type.includes('feature')) counts.feature++;
            else if (type.includes('fix')) counts.fix++;
            else if (type.includes('issue')) counts.issue++;
            else if (type.includes('deprecation') || type.includes('disable')) counts.deprecation++;
            else counts.feature++; // fallback
        });

        countAll.textContent = counts.all;
        countFeature.textContent = counts.feature;
        countFix.textContent = counts.fix;
        countIssue.textContent = counts.issue;
        countDeprecation.textContent = counts.deprecation;
    }

    // Get Clean Update Type
    function normalizeType(typeStr) {
        const type = typeStr.toLowerCase();
        if (type.includes('feature')) return 'feature';
        if (type.includes('fix')) return 'fix';
        if (type.includes('issue')) return 'issue';
        if (type.includes('deprecation') || type.includes('disable')) return 'deprecation';
        return 'feature'; // Default fallback
    }

    // Helper to strip HTML tags for search/tweet preview
    function stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    // Render cards to Grid
    function renderUpdates() {
        notesGrid.innerHTML = '';
        
        const filtered = allUpdates.filter(update => {
            // Type Filter
            if (activeFilter !== 'all') {
                const normType = normalizeType(update.type);
                if (normType !== activeFilter) return false;
            }
            
            // Search Query Filter
            if (searchQuery) {
                const text = (update.type + ' ' + update.date + ' ' + stripHtml(update.content)).toLowerCase();
                if (!text.includes(searchQuery)) return false;
            }
            
            return true;
        });

        if (filtered.length === 0) {
            notesGrid.classList.add('hidden');
            emptyState.classList.remove('hidden');
            emptyState.querySelector('p').textContent = 'No updates match your current search or filter criteria.';
            return;
        }

        emptyState.classList.add('hidden');
        notesGrid.classList.remove('hidden');

        filtered.forEach(update => {
            const card = document.createElement('div');
            const normType = normalizeType(update.type);
            card.className = `note-card ${normType}`;
            card.dataset.id = update.id;
            
            card.innerHTML = `
                <div class="card-header">
                    <span class="tag-badge">${update.type}</span>
                    <span class="card-date">${update.date}</span>
                </div>
                <div class="card-body">
                    ${update.content}
                </div>
                <div class="card-footer">
                    <span class="read-more">
                        Tweet / Copy
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </span>
                    <div class="card-actions-row">
                        <button class="card-action-icon-btn copy-btn" title="Copy plain text update">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <button class="card-action-icon-btn tweet-btn" title="Tweet this update">
                            <svg viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            
            // Add click handlers: Clicking the card opens the tweet composer
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') return;
                openTweetModal(update);
            });

            // Copy button click (stops bubbling so it doesn't open modal)
            const copyBtn = card.querySelector('.copy-btn');
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(update, copyBtn);
            });

            // Tweet button click (stops bubbling so it doesn't trigger generic card click)
            const tweetBtn = card.querySelector('.tweet-btn');
            tweetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openTweetModal(update);
            });
            
            notesGrid.appendChild(card);
        });
    }

    // Copy update content to clipboard with feedback
    function copyToClipboard(update, btnElement) {
        const plainText = stripHtml(update.content).replace(/\s+/g, ' ').trim();
        const fullShareText = `Google BigQuery ${update.type} (${update.date}):\n${plainText}\n\nLink: ${update.link}`;
        
        navigator.clipboard.writeText(fullShareText).then(() => {
            // Apply visual copied success state
            btnElement.classList.add('copied');
            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
            
            setTimeout(() => {
                btnElement.classList.remove('copied');
                btnElement.innerHTML = originalHTML;
            }, 1800);
        }).catch(err => {
            console.error('Failed to copy release update: ', err);
            alert("Could not copy release update to clipboard.");
        });
    }

    // Export current filtered updates to CSV
    function exportToCSV() {
        const filtered = allUpdates.filter(update => {
            if (activeFilter !== 'all') {
                const normType = normalizeType(update.type);
                if (normType !== activeFilter) return false;
            }
            if (searchQuery) {
                const text = (update.type + ' ' + update.date + ' ' + stripHtml(update.content)).toLowerCase();
                if (!text.includes(searchQuery)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            alert("No release notes available to export under current search/filters.");
            return;
        }

        // CSV Header
        let csvContent = "\ufeffDate,Type,Link,Description\n"; // Added BOM for UTF-8 compatibility with Excel

        filtered.forEach(update => {
            const date = escapeCSVField(update.date);
            const type = escapeCSVField(update.type);
            const link = escapeCSVField(update.link);
            const desc = escapeCSVField(stripHtml(update.content).replace(/\s+/g, ' ').trim());
            csvContent += `${date},${type},${link},${desc}\n`;
        });

        // Trigger CSV File Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_release_notes_${activeFilter}_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Helper to format string values safely for CSV cells
    function escapeCSVField(field) {
        if (field === null || field === undefined) return '""';
        let stringVal = String(field);
        stringVal = stringVal.replace(/"/g, '""'); // Double up double-quotes to escape them
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
            return `"${stringVal}"`; // Wrap cell in quotes if it contains separators
        }
        return stringVal;
    }

    // Modal Actions
    function openTweetModal(update) {
        selectedUpdate = update;
        
        const normType = normalizeType(update.type);
        previewType.textContent = update.type;
        previewType.className = `tag-badge ${normType}`;
        previewDate.textContent = update.date;
        previewContent.innerHTML = update.content;
        
        // Format default tweet text
        const plainText = stripHtml(update.content).replace(/\s+/g, ' ').trim();
        
        // Format: "Google BigQuery [Type] ([Date]): [Snippet...]"
        const prefix = `Google BigQuery ${update.type} (${update.date}): `;
        const maxTextSpace = MAX_TWEET_TEXT_LEN - prefix.length - 4; // leaving room for "..." or similar
        
        let snippet = plainText;
        if (snippet.length > maxTextSpace) {
            snippet = snippet.substring(0, maxTextSpace).trim() + '...';
        }
        
        const defaultTweet = `${prefix}"${snippet}"`;
        tweetTextarea.value = defaultTweet;
        tweetLinkText.textContent = update.link;
        
        updateCharCounter();
        
        tweetModal.classList.add('open');
        tweetTextarea.focus();
    }

    function closeTweetModal() {
        tweetModal.classList.remove('open');
        selectedUpdate = null;
    }

    // Update Tweet Character Counter
    function updateCharCounter() {
        const textLen = tweetTextarea.value.length;
        charCount.textContent = textLen;
        
        // Styling based on length remaining
        if (textLen > MAX_TWEET_TEXT_LEN) {
            charCount.className = 'char-counter error';
            submitTweetBtn.disabled = true;
        } else if (textLen > MAX_TWEET_TEXT_LEN - 30) {
            charCount.className = 'char-counter warning';
            submitTweetBtn.disabled = false;
        } else {
            charCount.className = 'char-counter';
            submitTweetBtn.disabled = false;
        }
    }

    // Handle Tweet Submission (Open Twitter Web Intent)
    function submitTweet() {
        if (!selectedUpdate) return;
        
        const tweetText = tweetTextarea.value;
        const link = selectedUpdate.link;
        
        // Build Twitter Intent URL
        // text and url parameters are separated, Twitter handles length automatically
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(link)}`;
        
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
    }

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    retryBtn.addEventListener('click', () => fetchReleases(true));
    exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Theme Toggle Handler
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const updatedTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', updatedTheme);
    });

    // Search input handler
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderUpdates();
    });

    // Filter click handler
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            
            // Add active to clicked button (or its parent if clicked dot/badge)
            const targetBtn = e.target.closest('.filter-btn');
            targetBtn.classList.add('active');
            
            activeFilter = targetBtn.dataset.type;
            renderUpdates();
        });
    });

    // Modal Close Triggers
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    
    // Close modal on clicking overlay background
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('open')) {
            closeTweetModal();
        }
    });

    // Textarea input character count handler
    tweetTextarea.addEventListener('input', updateCharCounter);
    
    // Submit Tweet handler
    submitTweetBtn.addEventListener('click', submitTweet);

    // Initial Fetch
    fetchReleases();
});
