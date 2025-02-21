

async function loadSessions(auth, sessionsContainer, messageContainer, phoneNumber) {
    try {
      const actor = auth.getCurrentActor();
      const sessionsByDay = await actor.getSessionsByDay();
      
      // Get all bookings information
      const bookingInfo = await Promise.all(
        sessionsByDay.flatMap(([_, sessions]) =>
          sessions.map(async session => {
            const isBooked = await actor.isSessionBooked(session.id);
            
            // Check if the booking is made by the current user
            let isUsersBooking = false;
            if (phoneNumber && isBooked) {
              const userBooking = await actor.getUserBooking(phoneNumber);
              // console.log("User booking response:", userBooking);
              
              if (userBooking) {
                let bookingRecord;
                if (Array.isArray(userBooking[0])) {
                  // If nested like: [ [booking, session] ]
                  bookingRecord = userBooking[0][0];
                } else {
                  bookingRecord = userBooking[0];
                }
                
                // console.log("Booking record sessionId:", bookingRecord?.sessionId);
                // console.log("Current session ID:", session.id);
                
                isUsersBooking = String(bookingRecord?.sessionId) === String(session.id);
                // console.log("isUsersBooking:", isUsersBooking);
              }
            }
            
            return {
              sessionId: session.id,
              isBooked,
              isUsersBooking,
            };
          })
        )
      );
      
      // Create maps for booking status and user booking status
      const bookingStatusMap = new Map();
      const userBookingMap = new Map();
      let bookingIndex = 0;
      
      sessionsByDay.forEach(([_, sessions]) => {
        sessions.forEach(session => {
          const info = bookingInfo[bookingIndex];
          bookingStatusMap.set(session.id, info.isBooked);
          userBookingMap.set(session.id, info.isUsersBooking);
          bookingIndex++;
        });
      });
      
      renderSessions(auth, sessionsContainer, sessionsByDay, bookingStatusMap, userBookingMap, phoneNumber, messageContainer);
    } catch (error) {
      console.error('Error loading sessions:', error);
      showMessage(messageContainer, 'Erreur lors du chargement des sessions.', 'error');
    }
  }
  
 
  // async function loadCurrentBooking(auth, currentBookingContainer, phoneNumber) {
  //   if (!phoneNumber) return;
  
  //   try {
  //     const actor = auth.getCurrentActor();
  //     const bookingOpt = await actor.getUserBooking(phoneNumber);
  //     if (bookingOpt && bookingOpt.length === 2) {
  //       const [booking, session] = bookingOpt;
  //       renderCurrentBooking(auth, currentBookingContainer, booking, session, phoneNumber);
  //     } else {
  //       currentBookingContainer.innerHTML = '';
  //     }
  //   } catch (error) {
  //     console.error('Erreur de chargement de la réservation actuelle:', error);
  //     currentBookingContainer.innerHTML = '';
  //   }
  // }
  
  async function loadCurrentBooking(auth, currentBookingContainer, phoneNumber) {
    if (!phoneNumber) return;

    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');

    try {
        const actor = auth.getCurrentActor();
        const bookingOpt = await actor.getUserBooking(phoneNumber);
        
        console.log('Current booking:', bookingOpt); // Add this debug line
        
        // Fix the array destructuring
        if (bookingOpt && Array.isArray(bookingOpt[0])) {
            // User has a booking, disable the inputs
            nameInput.disabled = true;
            phoneInput.disabled = true;
            
            const [booking, session] = bookingOpt[0]; // Note the [0] here
            renderCurrentBooking(auth, currentBookingContainer, booking, session, phoneNumber);
        } else {
            // No booking, enable the inputs
            nameInput.disabled = false;
            phoneInput.disabled = false;
            currentBookingContainer.innerHTML = '';
        }
    } catch (error) {
        console.error('Erreur de chargement de la réservation actuelle:', error);
        currentBookingContainer.innerHTML = '';
        // Make sure inputs are enabled on error
        nameInput.disabled = false;
        phoneInput.disabled = false;
    }
}


  /**
   * Renders the sessions UI.
   */
  function renderSessions(auth, container, sessionsByDay, bookingStatusMap, userBookingMap, phoneNumber, messageContainer) {
    container.innerHTML = '';
  
    sessionsByDay.forEach(([day, sessions]) => {
      const daySection = document.createElement('div');
      daySection.className = 'day-section';
      
      daySection.innerHTML = `
        <h2 class="day-title">${day}</h2>
        ${sessions.map(session => {
          const isBooked = bookingStatusMap.get(session.id);
          const isUsersBooking = userBookingMap.get(session.id);
          
          let slotClasses = ['session-slot'];
          if (isBooked) slotClasses.push('booked');
          if (isUsersBooking) slotClasses.push('user-booking');
          
          return `
            <div class="${slotClasses.join(' ')}">
              <span class="session-time">${session.time}</span>
              ${isUsersBooking ? `
                <div class="booking-controls">
                  <span class="your-booking-badge">Ma session</span>
                  <button class="cancel-btn" data-id="${session.id}">Annuler</button>
                </div>
              ` : `
                <button class="book-btn" 
                        data-id="${session.id}"
                        ${isBooked || !session.isEnabled ? 'disabled' : ''}>
                  ${isBooked ? 'Déjà réservé' : 'Je réserve'}
                </button>
              `}
            </div>
          `;
        }).join('')}
      `;
  
      // Add event listeners for booking buttons
      const bookButtons = daySection.querySelectorAll('.book-btn');
      bookButtons.forEach(btn => {
        if (!btn.disabled) {
          btn.addEventListener('click', () => handleBooking(auth, btn.dataset.id, phoneNumber, messageContainer));
        }
      });
  
      // Add event listeners for cancellation buttons
      const cancelButtons = daySection.querySelectorAll('.cancel-btn');
      cancelButtons.forEach(btn => {
        btn.addEventListener('click', (event) => handleCancellation(auth, event, phoneNumber, messageContainer));
      });
  
      container.appendChild(daySection);
    });
  }
  
  /**
   * Renders the current booking UI.
   */
  function renderCurrentBooking(auth, container, booking, session, phoneNumber) {
    if (!booking || !session) {
      container.innerHTML = '';
      return;
    }
  
    container.innerHTML = `
      <div class="current-booking">
        <h3>Ma session :</h3>
        <h3>${session.day} ${session.time}</h3>
        <button class="cancel-booking-btn book-btn">Annuler ma réservation</button>
      </div>
    `;
  
    const cancelButton = container.querySelector('.cancel-booking-btn');
    if (cancelButton) {
      cancelButton.addEventListener('click', (event) => handleCancellation(auth, event, phoneNumber, document.getElementById('message')));
    }
  }

  // async function handleBooking(auth, sessionId, phoneNumber, messageContainer) {
  //   const nameInput = document.getElementById('name');
  //   const phoneInput = document.getElementById('phone');
  //   const name = nameInput.value.trim();
  //   const phone = phoneInput.value.trim();
  
  //   if (!name || !phone) {
  //     showMessage(messageContainer, 'Écris ton blaz et ton num ci-dessus', 'error');
  //     return;
  //   }
  
  //   const button = document.querySelector(`button.book-btn[data-id="${sessionId}"]`);
  //   if (button) {
  //     button.classList.add('loading');
  //     button.disabled = true;
  //   }
  
  //   try {
  //     const actor = auth.getCurrentActor();
  //     const success = await actor.makeBooking(Number(sessionId), { name, phone });
  //     if (success) {
  //       showMessage(messageContainer, 'Réservation effectuée avec succès!', 'success');
  //       await reloadBookings(auth, phoneNumber);
  //     } else {
  //       showMessage(messageContainer, 'Réservation échouée. Ce créneau est peut-être déjà réservé ou t\'as déjà réservé une session.', 'error');
  //       await reloadBookings(auth, phoneNumber);
  //     }
  //   } catch (error) {
  //     console.error('Booking error:', error);
  //     showMessage(messageContainer, 'Erreur lors de la réservation. Réessaye.', 'error');
  //   } finally {
  //     if (button) {
  //       button.classList.remove('loading');
  //       button.disabled = false;
  //     }
  //   }
  // }
  
  // Update the handleBooking function
async function handleBooking(auth, sessionId, phoneNumber, messageContainer) {
  const nameInput = document.getElementById('name');
  const phoneInput = document.getElementById('phone');
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();

  if (!name || !phone) {
      showMessage(messageContainer, 'Écris ton blaz et ton num ci-dessus', 'error');
      return;
  }

  const button = document.querySelector(`button.book-btn[data-id="${sessionId}"]`);
  if (button) {
      button.classList.add('loading');
      button.disabled = true;
  }

  try {
      const actor = auth.getCurrentActor();
      const success = await actor.makeBooking(Number(sessionId), { name, phone });
      if (success) {
          showPopup('Réservation réussie! 🎉', 'Ta session a été réservée avec succès.');
          await reloadBookings(auth, phoneNumber);
      } else {
          showMessage(messageContainer, 'Réservation échouée. Ce créneau est peut-être déjà réservé ou t\'as déjà réservé une session.', 'error');
          await reloadBookings(auth, phoneNumber);
      }
  } catch (error) {
      console.error('Booking error:', error);
      showMessage(messageContainer, 'Erreur lors de la réservation. Réessaye.', 'error');
  } finally {
      if (button) {
          button.classList.remove('loading');
          button.disabled = false;
      }
  }
}

// Add new function for popup
function showPopup(title, message) {
  // Create popup elements
  const popup = document.createElement('div');
  popup.className = 'success-popup';
  
  popup.innerHTML = `
      <div class="popup-content">
          <div class="popup-header">
              <h3>${title}</h3>
              <button class="close-popup">&times;</button>
          </div>
          <div class="popup-body">
              <p>${message}</p>
          </div>
      </div>
  `;

  // Add to document
  document.body.appendChild(popup);

  // Add close button functionality
  const closeButton = popup.querySelector('.close-popup');
  closeButton.addEventListener('click', () => {
      popup.classList.add('fade-out');
      setTimeout(() => {
          popup.remove();
      }, 300);
  });

  // Auto close after 5 seconds
  setTimeout(() => {
      if (popup && document.body.contains(popup)) {
          popup.classList.add('fade-out');
          setTimeout(() => {
              popup.remove();
          }, 300);
      }
  }, 8000);
}
  
  // async function handleCancellation(auth, event, phoneNumber, messageContainer) {
  //   const button = event.currentTarget;
  //   button.classList.add('loading');
    
  //   try {
  //     const actor = auth.getCurrentActor();
  //     const success = await actor.cancelBooking(phoneNumber);
  //     if (success) {
  //       showMessage(messageContainer, 'Réservation annulée avec succès', 'success');
  //       await reloadBookings(auth, phoneNumber);
  //     } else {
  //       showMessage(messageContainer, 'Erreur lors de l\'annulation de la réservation', 'error');
  //     }
  //   } catch (error) {
  //     console.error('Cancel booking error:', error);
  //     showMessage(messageContainer, 'Erreur lors de l\'annulation de la réservation. Réessayes.', 'error');
  //   } finally {
  //     button.classList.remove('loading');
  //   }
  // }


  async function handleCancellation(auth, event, phoneNumber, messageContainer) {
    const button = event.currentTarget;
    button.classList.add('loading');
    
    try {
        const actor = auth.getCurrentActor();
        const success = await actor.cancelBooking(phoneNumber);
        if (success) {
            // Enable inputs after successful cancellation
            const nameInput = document.getElementById('name');
            const phoneInput = document.getElementById('phone');
            nameInput.disabled = false;
            phoneInput.disabled = false;
            
            showMessage(messageContainer, 'Réservation annulée avec succès', 'success');
            await reloadBookings(auth, phoneNumber);
        } else {
            showMessage(messageContainer, 'Erreur lors de l\'annulation de la réservation', 'error');
        }
    } catch (error) {
        console.error('Cancel booking error:', error);
        showMessage(messageContainer, 'Erreur lors de l\'annulation de la réservation. Réessayes.', 'error');
    } finally {
        button.classList.remove('loading');
    }
}
  
  /**
   * Reloads both sessions and current booking information.
   */
  async function reloadBookings(auth, phoneNumber) {
    const sessionsContainer = document.getElementById('sessions-container');
    const currentBookingContainer = document.getElementById('current-booking');
    const messageContainer = document.getElementById('message');
    
    await loadSessions(auth, sessionsContainer, messageContainer, phoneNumber);
    await loadCurrentBooking(auth, currentBookingContainer, phoneNumber);
  }
  
  /**
   * Displays a temporary message to the user.
   */
  function showMessage(container, text, type = 'success') {
    container.innerHTML = `<div class="message ${type}">${text}</div>`;
    setTimeout(() => {
      container.innerHTML = '';
    }, 5000);
  }
  
  /**
   * Initializes booking functionality:
   * - Loads saved user info from localStorage.
   * - Sets up event listeners for user info changes.
   * - Loads sessions and current booking.
   * - Starts auto-refresh.
   */
  function initializeBooking(auth) {
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const sessionsContainer = document.getElementById('sessions-container');
    const messageContainer = document.getElementById('message');
    const currentBookingContainer = document.getElementById('current-booking');
  
    // Load saved user info
    const savedName = localStorage.getItem('bookingName') || '';
    const savedPhone = localStorage.getItem('bookingPhone') || '';
    nameInput.value = savedName;
    phoneInput.value = savedPhone;
  
    // Save user info on change
    nameInput.addEventListener('change', () => {
      localStorage.setItem('bookingName', nameInput.value);
    });
  
    phoneInput.addEventListener('change', () => {
      localStorage.setItem('bookingPhone', phoneInput.value);
      reloadBookings(auth, phoneInput.value);
    });
  
    // Initial load of bookings
    reloadBookings(auth, phoneInput.value);
  
    // Start auto-refresh every 10 seconds
    setInterval(() => {
      reloadBookings(auth, phoneInput.value);
    }, 10000);
  
    return {
      reload: () => reloadBookings(auth, phoneInput.value)
    };
  }
  
  export { initializeBooking };
  