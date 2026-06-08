function episodeUrl(episodeId) {
    return `/friends-episode.html?episode=${encodeURIComponent(episodeId)}`;
}

function renderSeasonName(seasonNumber) {
    return seasonNumber === 0 ? 'Specials' : `Season ${seasonNumber}`;
}

function renderEpisodeButton(episode) {
    return `
        <button class="friends-browser-episode" data-episode-id="${episode.id}">
            <div class="friends-browser-episode__meta">
                <span>${episode.episodeCode}</span>
                <span>${episode.speakerCount} speakers • ${episode.lineCount} lines</span>
            </div>
            <span class="friends-browser-episode__title">${episode.title}</span>
        </button>
    `;
}

function renderSeasonSection(seasonData, isOpen) {
    return `
        <section class="friends-browser-season ${isOpen ? 'is-open' : ''}" data-season="${seasonData.season}">
            <button class="friends-browser-season__header" type="button" data-season-toggle="${seasonData.season}">
                <span class="friends-browser-season__name">${renderSeasonName(seasonData.season)}</span>
                <span class="friends-browser-season__count">${seasonData.episodes.length} files</span>
            </button>
            <div class="friends-browser-season__episodes">
                ${seasonData.episodes.map(renderEpisodeButton).join('')}
            </div>
        </section>
    `;
}

function sortSeasonsForDisplay(seasons) {
    return [...seasons].sort((left, right) => {
        if (left.season === 0 && right.season !== 0) {
            return 1;
        }
        if (left.season !== 0 && right.season === 0) {
            return -1;
        }
        return left.season - right.season;
    });
}

function buildBrowserSeasons(rawSeasons) {
    const seasons = Array.isArray(rawSeasons)
        ? rawSeasons.map((season) => ({
            ...season,
            episodes: Array.isArray(season.episodes)
                ? season.episodes.map((episode) => ({ ...episode }))
                : []
        }))
        : [];

    const specialsSeason = seasons.find((season) => season.season === 0);
    const seasonSeven = seasons.find((season) => season.season === 7);

    if (specialsSeason && seasonSeven) {
        const outtakesIndex = specialsSeason.episodes.findIndex((episode) => episode.id === 'friends-07outtakes');
        if (outtakesIndex >= 0) {
            const [outtakesEpisode] = specialsSeason.episodes.splice(outtakesIndex, 1);
            seasonSeven.episodes.push({
                ...outtakesEpisode,
                season: 7,
                episodeCode: '724 OUTTAKES',
                title: 'Friends Special: The Stuff You\'ve Never Seen'
            });
        }
    }

    const nonEmptySeasons = seasons.filter((season) => season.episodes.length > 0);
    return sortSeasonsForDisplay(nonEmptySeasons);
}

function attachBrowserEvents(container) {
    container.addEventListener('click', (event) => {
        const seasonButton = event.target.closest('[data-season-toggle]');
        if (seasonButton) {
            const section = seasonButton.closest('.friends-browser-season');
            if (section) {
                section.classList.toggle('is-open');
            }
            return;
        }

        const episodeButton = event.target.closest('[data-episode-id]');
        if (episodeButton) {
            const episodeId = episodeButton.getAttribute('data-episode-id');
            if (episodeId) {
                window.location.href = episodeUrl(episodeId);
            }
        }
    });
}

async function loadBrowser() {
    const seasonList = document.getElementById('seasonList');
    const summary = document.getElementById('browserSummary');
    const countDetail = document.getElementById('browserCountDetail');

    if (!seasonList || !summary || !countDetail) {
        return;
    }

    try {
        const response = await fetch('/data/friends/index.json');
        if (!response.ok) {
            throw new Error(`Failed to load Friends index (${response.status})`);
        }

        const data = await response.json();
        const seasons = buildBrowserSeasons(data.seasons);
        const seasonCount = data.seasonCount || seasons.length;
        const episodeCount = data.episodeCount || seasons.reduce((total, season) => total + season.episodes.length, 0);
        const hasSpecials = seasons.some((season) => season.season === 0);
        const defaultOpenIndex = seasons.findIndex((season) => season.season > 0);

        summary.textContent = `${seasonCount} seasons • ${episodeCount} imported script files`;
        countDetail.textContent = hasSpecials
            ? `Imported ${episodeCount} transcript files across ${seasonCount} seasons, plus specials.`
            : `Imported ${episodeCount} transcript files across ${seasonCount} seasons.`;
        seasonList.innerHTML = seasons
            .map((season, index) => renderSeasonSection(season, index === (defaultOpenIndex >= 0 ? defaultOpenIndex : 0)))
            .join('');
        attachBrowserEvents(seasonList);
    } catch (error) {
        console.error('Friends browser load error:', error);
        summary.textContent = 'Local Friends data not found';
        countDetail.textContent = 'Run the Friends importer to generate local episode JSON.';
        seasonList.innerHTML = '<p class="friends-browser-loading">Unable to load local Friends data.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadBrowser);
