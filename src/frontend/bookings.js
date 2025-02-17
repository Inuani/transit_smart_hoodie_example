

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
  
  /**
   * Loads the current booking for the given phone number.
   */
  async function loadCurrentBooking(auth, currentBookingContainer, phoneNumber) {
    if (!phoneNumber) return;
  
    try {
      const actor = auth.getCurrentActor();
      const bookingOpt = await actor.getUserBooking(phoneNumber);
      if (bookingOpt && bookingOpt.length === 2) {
        const [booking, session] = bookingOpt;
        renderCurrentBooking(auth, currentBookingContainer, booking, session, phoneNumber);
      } else {
        currentBookingContainer.innerHTML = '';
      }
    } catch (error) {
      console.error('Erreur de chargement de la réservation actuelle:', error);
      currentBookingContainer.innerHTML = '';
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
                  <span class="your-booking-badge">Ma résa</span>
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
        <h3>Your Current Booking</h3>
        <p>Day: ${session.day}</p>
        <p>Time: ${session.time}</p>
        <button class="cancel-booking-btn book-btn">Annuler réservation</button>
      </div>
    `;
  
    const cancelButton = container.querySelector('.cancel-booking-btn');
    if (cancelButton) {
      cancelButton.addEventListener('click', (event) => handleCancellation(auth, event, phoneNumber, document.getElementById('message')));
    }
  }
  
  /**
   * Handles making a booking.
   */
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
        showMessage(messageContainer, 'Réservation effectuée avec succès!', 'success');
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
  
  /**
   * Handles cancelling a booking.
   */
  async function handleCancellation(auth, event, phoneNumber, messageContainer) {
    const button = event.currentTarget;
    button.classList.add('loading');
    
    try {
      const actor = auth.getCurrentActor();
      const success = await actor.cancelBooking(phoneNumber);
      if (success) {
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
  