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
    const btnSpinner = document.getElementById('btn-spinner');
    const btnText = refreshBtn.querySelector('.btn-text');
    const retryBtn = document.getElementById('retry-btn');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
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
            statusText.textContent = 'Refreshing...';
            statusText.className = 'status-badge loading';
        } else {
            feedLoader.classList.add('hidden');
            btnSpinner.classList.remove('active');
            btnText.textContent = 'Refresh Feed';
            refreshBtn.disabled = false;
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
                        Tweet this
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </span>
                    <button class="card-tweet-btn" title="Tweet this update">
                        <svg viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                    </button>
                </div>
            `;
            
            // Add click handlers: Clicking the card opens the tweet composer
            card.addEventListener('click', (e) => {
                // If they clicked a link inside the card, ignore (though we disabled pointer events on links in cards via CSS anyway)
                if (e.target.tagName === 'A') return;
                openTweetModal(update);
            });
            
            notesGrid.appendChild(card);
        });
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
