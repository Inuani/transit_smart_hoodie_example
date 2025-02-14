
import { Auth } from './auth.js';
import { initializeComputeFuel } from './cycles-balance.js';
import { loadAudio, initUpload, initTrackPage } from './trackService.js';
import { initializeLeveling } from './leveling.js';
import { initializeBooking } from './bookings.js';
import { initializeBookingManagement } from './booking-management.js';

// const init = async () => {

//     const auth = new Auth();
//     await auth.init();
//     const isTrackPage = window.location.pathname.includes('track.html');

//     // Add compute fuel to pages that need it
//     const computeFuelContainers = document.querySelectorAll('.compute-fuel-container');
//     computeFuelContainers.forEach(container => {
//         container.appendChild(initializeComputeFuel());
//     });

//     const levelContainers = document.querySelectorAll('.level-container');
//     levelContainers.forEach(container => {
//         container.appendChild(initializeLeveling());
//     });


//     if (isTrackPage) {
//         await initTrackPage(auth);
//     } else {
//         await loadAudio(auth);
//         await initUpload(auth);
//     }

    
// };


// const init = async () => {
//     console.log('Starting initialization...');
//     const auth = new Auth();
//     await auth.init();
//     console.log('Auth initialized');

//     const currentPath = window.location.pathname;
//     console.log('Current path:', currentPath);

//     const computeFuelContainers = document.querySelectorAll('.compute-fuel-container');
//     computeFuelContainers.forEach(container => {
//         container.appendChild(initializeComputeFuel());
//     });

//     const levelContainers = document.querySelectorAll('.level-container');
//     levelContainers.forEach(container => {
//         container.appendChild(initializeLeveling());
//     });

//     if (currentPath.includes('bookings.html')) {
//         console.log('Initializing booking service');
//         initializeBooking(auth);  // Pass auth here
//     } else if (currentPath.includes('track.html')) {
//         console.log('Initializing track page');
//         await initTrackPage(auth);
//     } else {
//         console.log('Initializing main page');
//         await loadAudio(auth);
//         await initUpload(auth);
//     }
// };

const init = async () => {
    console.log('Starting initialization...');
    const auth = new Auth();
    await auth.init();
    console.log('Auth initialized');

    const currentPath = window.location.pathname;
    console.log('Current path:', currentPath);

    // Initialize compute fuel containers if present
    const computeFuelContainers = document.querySelectorAll('.compute-fuel-container');
    computeFuelContainers.forEach(container => {
        container.appendChild(initializeComputeFuel());
    });

    // Initialize level containers if present
    const levelContainers = document.querySelectorAll('.level-container');
    levelContainers.forEach(container => {
        container.appendChild(initializeLeveling());
    });

    // Initialize different pages based on current path
    if (currentPath.includes('manage-bookings.html')) {
        console.log('Initializing booking management');
        initializeBookingManagement(auth);
    } else if (currentPath.includes('bookings.html')) {
        console.log('Initializing booking service');
        initializeBooking(auth);
    } else if (currentPath.includes('track.html')) {
        console.log('Initializing track page');
        await initTrackPage(auth);
    } else {
        console.log('Initializing main page');
        await loadAudio(auth);
        await initUpload(auth);
    }
};

document.readyState === 'loading' 
    ? document.addEventListener('DOMContentLoaded', init)
    : init().catch(console.error);