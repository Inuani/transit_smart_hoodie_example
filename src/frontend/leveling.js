// src/frontend/leveling.js
import { actor } from './actor.js';

async function updateLevelDisplay() {
    try {
        const stats = await actor.getLevelingStats();
        
        // Convert BigInts to numbers
        const currentLevel = Number(stats.current_level);
        const currentLevelXp = Number(stats.current_level_xp);
        const progress = Number(stats.current_level_progress);
        const totalPlays = Number(stats.total_plays);
        const xpToNext = Number(stats.xp_to_next_level);

        const levelFill = document.getElementById('level-fill');
        const levelText = document.getElementById('level-text');
        const xpProgress = document.getElementById('xp-progress');
        const playsCount = document.getElementById('plays-count');
        const levelHeader = document.getElementById('level-header');

        if (levelFill && levelText && xpProgress && playsCount && levelHeader) {
            levelHeader.textContent = `Level ${currentLevel}`;
            levelFill.style.width = `${progress}%`;
            levelFill.style.background = 'linear-gradient(45deg, #ff3366, #ff6b8b)';
            levelFill.innerHTML = `<span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 20px; color: white;">${progress}%</span>`;
            
            levelText.textContent = `Level ${currentLevel}`;
            // Calculate total XP needed for this level (current XP + remaining XP)
            const totalXpNeeded = currentLevelXp + xpToNext;
            xpProgress.innerHTML = `⭐ XP: ${currentLevelXp}/${totalXpNeeded}`;
            playsCount.innerHTML = `🎵 Total Plays: ${totalPlays}`;
        }
    } catch (error) {
        console.error('Error updating level:', error);
    }
}

function initializeLeveling() {
    const container = document.createElement('div');
    container.className = 'level-container';
    container.innerHTML = `
        <div class="basic-container">
            <h3 id="level-header">Level</h3>
            <div id="level-fill-container">
                <div class="energy-fill" id="level-fill"></div>
                <div class="energy-text" id="level-text"></div>
            </div>
            <div class="energy-details">
                <span id="xp-progress">⭐</span>
                <span id="plays-count">🎵</span>
            </div>
        </div>
    `;

    updateLevelDisplay();
    setInterval(updateLevelDisplay, 60000);
    return container;
}

export { initializeLeveling, updateLevelDisplay };