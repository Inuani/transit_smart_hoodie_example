// booking-management.js

let currentActor = null;
let refreshInterval = null;

function initializeEventListeners() {
    console.log('Initializing event listeners');
    const addButton = document.getElementById('add-session-btn');
    const resetButton = document.getElementById('reset-bookings-btn');
    
    console.log('Found buttons:', { addButton, resetButton });
    
    if (addButton) {
        addButton.addEventListener('click', () => addSession());
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', () => resetAllBookings());
    }
}

// async function loadSessions() {
//     console.log('Starting loadSessions');
//     try {
//         const sessionsList = document.getElementById('sessions-list');
//         if (!sessionsList) {
//             console.log('No sessions-list element found');
//             return;
//         }
        
//         console.log('Fetching sessions from actor...');
//         const sessionsByDay = await currentActor.getSessionsByDay();
//         console.log('Received sessions by day:', sessionsByDay);
        
//         sessionsList.innerHTML = '';

//         for (const [day, sessions] of sessionsByDay) {
//             console.log(`Processing day: ${day}, Number of sessions: ${sessions.length}`);
//             const daySection = document.createElement('div');
//             daySection.className = 'day-section';
//             daySection.innerHTML = `<h3>${day}</h3>`;

//             for (const session of sessions) {
//                 console.log(`Processing session:`, session);
//                 const sessionItem = document.createElement('div');
//                 sessionItem.className = 'session-item';
                
//                 // Check if session is booked
//                 console.log(`Checking booking status for session ${session.id}`);
//                 const isBooked = await currentActor.isSessionBooked(session.id);
//                 console.log(`Session ${session.id} booked status:`, isBooked);
//                 let bookingInfo = '';
                
//                 if (isBooked) {
//                     console.log(`Fetching booking details for session ${session.id}`);
//                     const bookingDetails = await getBookingDetails(session.id);
//                     console.log(`Booking details for session ${session.id}:`, bookingDetails);
//                     if (bookingDetails) {
//                         bookingInfo = `
//                             <div class="booking-info">
//                                 <p>Booked by: ${bookingDetails.name}</p>
//                                 <p>Phone: ${bookingDetails.phone}</p>
//                             </div>
//                         `;
//                     }
//                 }

//                 sessionItem.innerHTML = `
//                     <div>
//                         <strong>${session.time}</strong>
//                         <span>(ID: ${session.id})</span>
//                     </div>
//                     <button class="action-btn danger" data-id="${session.id}">
//                         Remove Session
//                     </button>
//                     ${bookingInfo}
//                 `;

//                 // Add event listener directly to the button
//                 const removeButton = sessionItem.querySelector('.action-btn');
//                 removeButton.addEventListener('click', () => removeSession(session.id));

//                 daySection.appendChild(sessionItem);
//             }


            
//             sessionsList.appendChild(daySection);
//         }
//         console.log('Finished loading all sessions');
//     } catch (error) {
//         console.error('Error loading sessions:', error);
//         showError('Error loading sessions');
//     }
// }

async function loadSessions() {
    console.log('Starting loadSessions');
    try {
        const sessionsList = document.getElementById('sessions-list');
        if (!sessionsList) {
            console.log('No sessions-list element found');
            return;
        }
        
        console.log('Fetching sessions from actor...');
        const sessionsByDay = await currentActor.getSessionsByDay();
        console.log('Received sessions by day:', sessionsByDay);
        
        sessionsList.innerHTML = '';

        // Loop over each day and its sessions
        for (const [day, sessions] of sessionsByDay) {
            console.log(`Processing day: ${day}, Number of sessions: ${sessions.length}`);
            const daySection = document.createElement('div');
            daySection.className = 'day-section';
            daySection.innerHTML = `<h3>${day}</h3>`;

            // Loop over each session in this day
            for (const session of sessions) {
                console.log(`Processing session:`, session);
                const sessionItem = document.createElement('div');
                sessionItem.className = 'session-item';
                
                // Check if session is booked
                console.log(`Checking booking status for session ${session.id}`);
                const isBooked = await currentActor.isSessionBooked(session.id);
                console.log(`Session ${session.id} booked status:`, isBooked);
                let bookingInfo = '';
                
                if (isBooked) {
                    console.log(`Fetching booking details for session ${session.id}`);
                    const bookingDetails = await getBookingDetails(session.id);
                    console.log(`Booking details for session ${session.id}:`, bookingDetails);
                    if (bookingDetails) {
                        bookingInfo = `
                            <div class="booking-info">
                                <p>Réservé par : ${bookingDetails.name}</p>
                                <p> Contact : ${bookingDetails.phone}</p>
<button class="action-btn remove-booking-btn" data-phone="${bookingDetails.phone}" style="margin-top: 10px;">
                                    Annuler la réservation
                                </button>
                            </div>
                        `;
                    }
                }

                sessionItem.innerHTML = `
                    <div>
                        <strong>${session.time}</strong>
                        
                    </div>
                    <button class="action-btn danger" data-id="${session.id}">
                        Retirer la session
                    </button>
                    ${bookingInfo}
                `;

                // Attach event listener for removing session
                const removeSessionButton = sessionItem.querySelector('.action-btn.danger');
                removeSessionButton.addEventListener('click', () => removeSession(session.id));

                // Attach event listener for removing booking if it exists
                const removeBookingButton = sessionItem.querySelector('.remove-booking-btn');
                if (removeBookingButton) {
                    removeBookingButton.addEventListener('click', () => removeBooking(removeBookingButton.dataset.phone));
                }

                daySection.appendChild(sessionItem);
            }
            sessionsList.appendChild(daySection);
        }
        // console.log('Finished loading all sessions');
    } catch (error) {
        console.error('Error loading sessions:', error);
        showError('Error loading sessions');
    }
}


async function removeBooking(phone) {
    if (!confirm(`Sûr de vouloir supprimer la réservation pour le téléphone ${phone}?`)) {
        return;
    }

    try {
        await currentActor.cancelBooking(phone);
        await loadSessions();
        showSuccess('Réservation supprimée avec succès');
    } catch (error) {
        console.error('Erreur lors de la suppression de la réservation:', error);
        showError('Error removing booking');
    }
}


async function addSession() {
    const daySelect = document.getElementById('day-select');
    const timeInput = document.getElementById('time-input');
    const addButton = document.getElementById('add-session-btn');

    if (!daySelect || !timeInput || !addButton) {
        showError('Missing form elements');
        return;
    }

    if (!timeInput.value) {
        showError('Please select a time');
        return;
    }

    try {
        addButton.disabled = true;
        addButton.classList.add('loading');

        await currentActor.addSession(daySelect.value, timeInput.value);
        await loadSessions();
        timeInput.value = '';
        
        showSuccess('Session ajoutée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la session:', error);
        showError('Error adding session');
    } finally {
        addButton.disabled = false;
        addButton.classList.remove('loading');
    }
}

async function removeSession(id) {
    if (!confirm('Sûr de vouloir supprimer cette session?')) {
        return;
    }

    try {
        await currentActor.removeSession(id);
        await loadSessions();
        showSuccess('Session supprimée avec succès');
    } catch (error) {
        console.error('Error removing session:', error);
        showError('Error removing session');
    }
}

async function resetAllBookings() {
    if (!confirm('Sûr de vouloir réinitialiser toutes les réservations? Cette action est irréversible.')) {
        return;
    }

    try {
        await currentActor.resetAllBookings();
        await loadSessions();
        showSuccess('Toutes les réservations ont été réinitialisées');
    } catch (error) {
        console.error('Error resetting bookings:', error);
        showError('Error resetting bookings');
    }
}

// async function getBookingDetails(sessionId) {
//     try {
//         console.log(`Getting booking details for session ${sessionId}`);
//         const bookingInfo = await currentActor.getSessionBooking(sessionId);
//         console.log(`Received booking info:`, bookingInfo);
//         if (bookingInfo && bookingInfo.length > 0) {
//             return bookingInfo[0].user;
//         }
//         return null;
//     } catch (error) {
//         console.error('Error getting booking details:', error);
//         return null;
//     }
// }

async function getBookingDetails(sessionId) {
    try {
        // console.log(`Getting booking details for session ${sessionId}`);
        const bookingInfo = await currentActor.getSessionBooking(sessionId);
        // console.log(`Received booking info:`, bookingInfo);
        if (bookingInfo) {
            // If bookingInfo is an array, use the first element.
            if (Array.isArray(bookingInfo) && bookingInfo.length > 0) {
                return bookingInfo[0].user;
            }
            // If it's an object with a user property, return that.
            if (bookingInfo.user) {
                return bookingInfo.user;
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting booking details:', error);
        return null;
    }
}


function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message error';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.basic-container');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    } else {
        alert(message);
    }
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'message success';
    successDiv.textContent = message;
    
    const container = document.querySelector('.basic-container');
    if (container) {
        container.insertBefore(successDiv, container.firstChild);
        
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    } else {
        alert(message);
    }
}

export function initializeBookingManagement(auth) {
    currentActor = auth.getCurrentActor();
    initializeEventListeners();
    loadSessions();

    // Refresh sessions every 30 seconds
    // if (refreshInterval) {
    //     clearInterval(refreshInterval);
    // }
    // refreshInterval = setInterval(() => loadSessions(), 30000);

    return {
        loadSessions,
        addSession,
        removeSession,
        resetAllBookings
    };
}