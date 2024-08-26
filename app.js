const tg = window.Telegram.WebApp;
const SERVER_URL = 'http://localhost:5000';
let telegram_id;
let currentLobbyId = null;
let currentGameMode = null;

document.addEventListener('DOMContentLoaded', (event) => {
    if (tg) {
        tg.ready();
        const user = tg.initDataUnsafe.user;
        if (user) {
            telegram_id = user.id;
            fetchUserData(telegram_id);
        } else {
            console.error("User data not available from Telegram WebApp");
        }
    } else {
        console.error('Telegram WebApp is not available');
    }

    document.getElementById('play-button').addEventListener('click', showGameModes);
    document.getElementById('roll-dice').addEventListener('click', rollDice);
});

function fetchUserData(telegram_id) {
    fetch(`${SERVER_URL}/api/user_data/${telegram_id}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('user_name').textContent = `${data.first_name} ${data.last_name}`;
            document.getElementById('user_name_modes').textContent = `${data.first_name} ${data.last_name}`;
            localStorage.setItem('session_id', data.session_id);
        })
        .catch(error => console.error('Error fetching user data:', error));
}

function showMainMenu() {
    hideAllScreens();
    document.getElementById('main-menu').style.display = 'block';
}

function showGameModes() {
    hideAllScreens();
    document.getElementById('game-modes').style.display = 'block';
}

function hideAllScreens() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-modes').style.display = 'none';
    document.getElementById('game-table').style.display = 'none';
    document.getElementById('error-screen').style.display = 'none';
}

function startGame(mode) {
    currentGameMode = mode;
    fetch(`${SERVER_URL}/api/start_game`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegram_id: telegram_id, game_type: mode }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            currentLobbyId = data.lobby_id;
            showGameTable();
        } else {
            console.error('Error starting game:', data.message);
            showError('Ошибка при начале игры. Пожалуйста, попробуйте еще раз.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
    });
}

function showGameTable() {
    hideAllScreens();
    document.getElementById('game-table').style.display = 'block';
    initializeScoreTable();
}

function initializeScoreTable() {
    const table = document.getElementById('score-table');
    table.innerHTML = ''; // Clear existing table

    const combinations = [
        'Школа на 1', 'Школа на 2', 'Школа на 3', 'Школа на 4', 'Школа на 5', 'Школа на 6',
        'Школа всего', 'Пара', 'Две пары', 'Тройник', 'Фул-хаус', 'Каре', 'Покер',
        'Большой стрит', 'Малый стрит', 'Шанс', 'ИТОГО'
    ];

    combinations.forEach(combination => {
        const row = table.insertRow();
        const cellCombination = row.insertCell(0);
        const cellPlayer = row.insertCell(1);
        const cellOpponent = currentGameMode === 'solo' ? null : row.insertCell(2);

        cellCombination.textContent = combination;
        cellCombination.addEventListener('click', () => selectCombination(combination));

        cellPlayer.textContent = '-';
        if (cellOpponent) cellOpponent.textContent = '-';
    });
}

function rollDice() {
    const diceToRoll = getSelectedDice();
    fetch(`${SERVER_URL}/api/roll_dice`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegram_id: telegram_id, lobby_id: currentLobbyId, dice_to_roll: diceToRoll }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            updateDiceDisplay(data.dice_values);
        } else {
            console.error('Error rolling dice:', data.message);
            showError('Ошибка при броске кубиков. Пожалуйста, попробуйте еще раз.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
    });
}

function getSelectedDice() {
    // Implement logic to determine which dice to roll based on user selection
    // For now, we'll just roll all dice
    return [1, 2, 3, 4, 5];
}

function updateDiceDisplay(diceValues) {
    const playerDiceLid = document.querySelector('#player-dice .dice-lid');
    playerDiceLid.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const dieValue = diceValues[`d${i}`];
        const dieElement = createDieElement(dieValue);
        playerDiceLid.appendChild(dieElement);
    }
}

function createDieElement(value) {
    const die = document.createElement('div');
    die.classList.add('die');
    die.textContent = value;
    die.draggable = true;
    die.addEventListener('dragstart', dragStart);
    return die;
}

function dragStart(event) {
    event.dataTransfer.setData('text/plain', event.target.textContent);
}

function selectCombination(combination) {
    if (combination === 'Школа всего' || combination === 'ИТОГО') {
        return; // These combinations are calculated automatically
    }

    fetch(`${SERVER_URL}/api/score_combination`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegram_id: telegram_id, lobby_id: currentLobbyId, combination: combination }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            updateScoreTable(data.player1_score, data.player2_score);
        } else {
            console.error('Error scoring combination:', data.message);
            showError('Ошибка при записи комбинации. Пожалуйста, попробуйте еще раз.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
    });
}

function updateScoreTable(player1Score, player2Score) {
    const table = document.getElementById('score-table');
    for (let i = 0; i < table.rows.length; i++) {
        const combination = table.rows[i].cells[0].textContent;
        if (player1Score[combination] !== undefined) {
            table.rows[i].cells[1].textContent = player1Score[combination];
        }
        if (currentGameMode !== 'solo' && player2Score[combination] !== undefined) {
            table.rows[i].cells[2].textContent = player2Score[combination];
        }
    }
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    hideAllScreens();
    document.getElementById('error-screen').style.display = 'block';
}

// Add event listeners for drag and drop functionality
document.querySelector('#player-dice .dice-lid').addEventListener('dragover', dragOver);
document.querySelector('#player-dice .dice-lid').addEventListener('drop', drop);
document.querySelector('#player-dice .dice-box').addEventListener('dragover', dragOver);
document.querySelector('#player-dice .dice-box').addEventListener('drop', drop);

function dragOver(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();
    const data = event.dataTransfer.getData('text');
    const dieElement = createDieElement(parseInt(data));
    event.target.appendChild(dieElement);
}