async function loadFriendsLibrarySummary() {
    const countElement = document.getElementById('friendsEpisodeCount');
    const statusElement = document.getElementById('friendsStatus');
    const browseButton = document.getElementById('btn-friends');

    if (!countElement || !statusElement || !browseButton) {
        return;
    }

    try {
        const response = await fetch('/data/friends/index.json');
        if (!response.ok) {
            throw new Error(`Failed to load Friends index (${response.status})`);
        }

        const data = await response.json();
        const seasonCount = data.seasonCount || (Array.isArray(data.seasons) ? data.seasons.length : 0);
        const episodeCount = data.episodeCount || 0;

        countElement.textContent = `${seasonCount} seasons • ${episodeCount} script files`;
        statusElement.textContent = 'Ready';
        browseButton.disabled = false;
    } catch (error) {
        console.error('Friends library summary error:', error);
        countElement.textContent = 'Import required';
        statusElement.textContent = 'Missing local data';
        browseButton.disabled = true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const backButton = document.getElementById('backBtn');
    const browseButton = document.getElementById('btn-friends');

    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    if (browseButton) {
        browseButton.addEventListener('click', () => {
            if (!browseButton.disabled) {
                window.location.href = '/friends-scripts.html';
            }
        });
    }

    loadFriendsLibrarySummary();
});
