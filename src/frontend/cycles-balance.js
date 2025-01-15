// src/frontend/compute-fuel.js
import { actor } from './actor.js';
import elements from './elements.js';

function formatCycles(cycles) {
    if (cycles >= 1_000_000_000_000) {
        return (cycles / 1_000_000_000_000).toFixed(2) + ' T';
    } else if (cycles >= 1_000_000_000) {
        return (cycles / 1_000_000_000).toFixed(2) + ' B';
    } else if (cycles >= 1_000_000) {
        return (cycles / 1_000_000).toFixed(2) + ' M';
    } else if (cycles >= 1_000) {
        return (cycles / 1_000).toFixed(2) + ' K';
    }
    return cycles.toString();
}

const MAX_CYCLES = 5_000_000_000_000;

async function updateBalance() {
    try {
        const balance = Number(await actor.get_cycle_balance());
        const percentage = Math.min((balance / MAX_CYCLES) * 100, 100);
        
        const energyFill = elements.energy.fill();
        const energyText = elements.energy.text();
        const rawBalance = elements.energy.balance();
        const percentageElement = elements.energy.percentage();

        energyFill.style.width = `${percentage}%`;
            
        if (percentage < 20) {
            energyFill.style.background = 'linear-gradient(90deg, #ff5252, #ff8a80)';
        } else if (percentage < 50) {
            energyFill.style.background = 'linear-gradient(90deg, #ffd740, #ffecb3)';
        } else {
            energyFill.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
        }
      
        energyText.innerText = `${formatCycles(balance)} cycles`;
        rawBalance.innerText = `Total: ${formatCycles(balance)} cycles`;
        percentageElement.innerText = `${percentage.toFixed(1)}% of max capacity`;
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}

function openRefuelWindow() {
    const width = 400;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const windowFeatures = `
        width=${width},
        height=${height},
        left=${left},
        top=${top},
        toolbar=0,
        location=0,
        menubar=0,
        status=0
    `.replace(/\s/g, '');

    const refuelUrl = `https://cycle.express/?to=${process.env.CANISTER_ID_SMART_RAP_CLOTH}`;
    window.open(refuelUrl, 'Refuel Window', windowFeatures);
}

function initializeComputeFuel() {
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="basic-container">
            <h3>Compute fuel</h3>
            <div class="energy-bar">
                <div class="energy-fill" id="energy-fill"></div>
                <div class="energy-text" id="energy-text"></div>
            </div>
            <div class="energy-details">
                <span id="raw-balance">⚡</span>
                <span id="percentage">🔋</span>
            </div>
            <button id="refuel-button" class="btn">Refuel</button>
        </div>
    `;
    
    // Add event listener for refuel button
    const refuelButton = container.querySelector('#refuel-button');
    if (refuelButton) {
        refuelButton.addEventListener('click', openRefuelWindow);
    }

    // Update the balance immediately and start periodic updates
    updateBalance();
    setInterval(updateBalance, 60000); // Update every minute

    return container;
}

export { initializeComputeFuel, updateBalance };