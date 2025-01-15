
import { Auth } from './auth.js';
import { initializeComputeFuel } from './cycles-balance.js';
import { loadAudio, initUpload, initTrackPage } from './trackService.js';

const init = async () => {

    const auth = new Auth();
    await auth.init();
    const isTrackPage = window.location.pathname.includes('track.html');

    // Add compute fuel to pages that need it
    const computeFuelContainers = document.querySelectorAll('.compute-fuel-container');
    computeFuelContainers.forEach(container => {
        container.appendChild(initializeComputeFuel());
    });

    if (isTrackPage) {
        await initTrackPage(auth);
    } else {
        await loadAudio(auth);
        await initUpload(auth);
    }
};

document.readyState === 'loading' 
    ? document.addEventListener('DOMContentLoaded', init)
    : init().catch(console.error);