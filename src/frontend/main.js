
import { Auth } from './auth.js';
import { updateBalance } from './cycles-balance.js';
import { loadAudio, initUpload, initTrackPage } from './trackService.js';

const init = async () => {

    const auth = new Auth();
    await auth.init();
    const isTrackPage = window.location.pathname.includes('track.html');

    if (isTrackPage) {
        await initTrackPage(auth);
    } else {
        await updateBalance();
        await loadAudio(auth);
        await initUpload(auth);
    }
};

document.readyState === 'loading' 
    ? document.addEventListener('DOMContentLoaded', init)
    : init().catch(console.error);