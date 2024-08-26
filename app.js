const tg = window.Telegram.WebApp;
const SERVER_URL = 'http://localhost:5000';
let telegram_id;
let currentLobbyId = null;
let currentGameMode = null;
let lobbyCheckInterval;

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
    document.getElementById('search-screen').style.display = 'none';
    document.getElementById('ready-screen').style.display = 'none';
    document.getElementById('error-screen').style.display = 'none';
    document.getElementById('game-table').style.display = 'none';
}

function startSearch(mode) {
    currentGameMode = mode;
    fetch(`${SERVER_URL}/api/start_search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegram_id: telegram_id, queue_type: mode }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            hideAllScreens();
            document.getElementById('search-screen').style.display = 'block';
            if (mode === 'training') {
                document.getElementById('solo-training-button').style.display = 'block';
            }
        } else {
            console.error('Error starting search:', data.message);
            showError('Ошибка при начале поиска. Пожалуйста, попробуйте еще раз.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
    });
}

function cancelSearch() {
    fetch(`${SERVER_URL}/api/cancel_search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegram_id: telegram_id }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showGameModes();
        } else {
            console.error('Error cancelling search:', data.message);
            showError('Ошибка при отмене поиска. Пожалуйста, попробуйте еще раз.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
    });
}

function startSoloTraining() {
    fetch(`${SERVER_URL}/api/start_solo_training`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegram_id: telegram_id }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            currentLobbyId = data.lobby_id;
            showReadyScreen();
            startLobbyStatusCheck();
        } else {
            console.error('Error starting solo training:', data.message);
            showError('Ошибка при начале одиночной тренировки. Пожалуйста, попробуйте еще раз.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
    });
}

function showReadyScreen() {
    hideAllScreens();
    document.getElementById('ready-screen').style.display = 'block';
}

function playerReady() {
    fetch(`${SERVER_URL}/api/player_ready`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegram_id: telegram_id, lobby_id: currentLobbyId }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            if (data.message === 'Game starting') {
                startGame();
            } else {
                alert('Готов к игре. Ожидание других игроков...');
            }
        } else {
            console.error('Error setting player ready:', data.message);
            showError('Ошибка при подготовке к игре. Пожалуйста, попробуйте еще раз.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
    });
}

function startLobbyStatusCheck() {
    lobbyCheckInterval = setInterval(() => {
        fetch(`${SERVER_URL}/api/lobby_status/${currentLobbyId}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'disbanded') {
                    clearInterval(lobbyCheckInterval);
                    showError('Ваша игра не может быть начата, т.к. один из игроков не готов');
                } else if (data.status === 'ready') {
                    clearInterval(lobbyCheckInterval);
                    startGame();
                }
            })
            .catch(error => {
                console.error('Error checking lobby status:', error);
                clearInterval(lobbyCheckInterval);
                showError('Произошла ошибка при проверке статуса лобби');
            });
    }, 5000);
}

function showError(message) {
    hideAllScreens();
    document.getElementById('error-screen').style.display = 'block';
    document.getElementById('error-message').textContent = message;
}

function startGame() {
    hideAllScreens();
    document.getElementById('game-table').style.display = 'block';
    initializeGameTable();
    requestDiceRoll();
}

function initializeGameTable() {
    // Инициализация игрового стола
    // Создание таблицы результатов, интерактивных областей и т.д.
    createResultTable();
    createInteractiveAreas();
}

function createResultTable() {
    const tableBody = document.querySelector('#result-table tbody');
    const combinations = [
        'Школа на 1', 'Школа на 2', 'Школа на 3', 'Школа на 4', 'Школа на 5', 'Школа на 6',
        'Школа всего', 'Пара', 'Две пары', 'Тройник', 'Фул-хаус', 'Каре', 'Покер',
        'Большой стрит', 'Малый стрит', 'Шанс', 'ИТОГО'
    ];

    combinations.forEach(combination => {
        const row = document.createElement('tr');
        const combinationCell = document.createElement('td');
        combinationCell.textContent = combination;
        row.appendChild(combinationCell);

        const playerScoreCell = document.createElement('td');
        playerScoreCell.id = `player-${combination.replace(/\s+/g, '-').toLowerCase()}`;
        playerScoreCell.addEventListener('click', () => selectCombination(combination));
        row.appendChild(playerScoreCell);

        if (currentGameMode !== 'solo_training') {
            const opponentScoreCell = document.createElement('td');
            opponentScoreCell.id = `opponent-${combination.replace(/\s+/g, '-').toLowerCase()}`;
            row.appendChild(opponentScoreCell);
        }

        tableBody.appendChild(row);
    });
}

function createInteractiveAreas() {
    const playerLidArea = document.getElementById('player-lid');
    const playerBoxArea = document.getElementById('player-box');

    for (let i = 1; i <= 5; i++) {
        const diceElement = document.createElement('div');
        diceElement.className = 'dice';
        diceElement.id = `dice-${i}`;
        diceElement.draggable = true;
        diceElement.addEventListener('dragstart', drag);
        playerLidArea.appendChild(diceElement);
    }

    playerLidArea.addEventListener('dragover', allowDrop);
    playerLidArea.addEventListener('drop', drop);
    playerBoxArea.addEventListener('dragover', allowDrop);
    playerBoxArea.addEventListener('drop', drop);

    playerLidArea.addEventListener('touchstart', handleTouchStart);
    playerLidArea.addEventListener('touchmove', handleTouchMove);
    playerLidArea.addEventListener('touchend', handleTouchEnd);
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drop(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    ev.target.appendChild(document.getElementById(data));
}

let touchStartX = 0;
let touchEndX = 0;

function handleTouchStart(event) {
    touchStartX = event.touches[0].clientX;
}

function handleTouchMove(event) {
    touchEndX = event.touches[0].clientX;
}

function handleTouchEnd() {
    if (touchStartX - touchEndX > 50) {
        // Свайп влево
        rerollDice();
    } else if (touchEndX - touchStartX > 50) {
        // Свайп вправо
        requestDiceRoll();
    }
}

function requestDiceRoll() {
    fetch(`${SERVER_URL}/api/roll_dice`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegram_id: telegram_id, lobby_id: currentLobbyId }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            updateDiceDisplay(data.dice);
            if (data.opponent_dice) {
                updateOpponentDiceDisplay(data.opponent_dice);
            }
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

function rerollDice() {
    const diceToReroll = Array.from(document.getElementById('player-lid').children).map(dice => dice.id.split('-')[1]);

    fetch(`${SERVER_URL}/api/reroll_dice`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            telegram_id: telegram_id,
            lobby_id: currentLobbyId,
            dice_to_reroll: diceToReroll
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            updateDiceDisplay(data.dice);
            if (data.opponent_dice) {
                updateOpponentDiceDisplay(data.opponent_dice);
            }
        } else {
            console.error('Error rerolling dice:', data.message);
            showError('Ошибка при перебрасывании кубиков. Пожалуйста, попробуйте еще раз.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
    });
}

function updateDiceDisplay(dice) {
    const playerLidArea = document.getElementById('player-lid');
    dice.forEach((value, index) => {
        const diceElement = document.getElementById(`dice-${index + 1}`);
        diceElement.textContent = value;
        diceElement.className = `dice dice-${value}`;
        playerLidArea.appendChild(diceElement);
    });
}

function updateOpponentDiceDisplay(dice) {
    const opponentLidArea = document.getElementById('opponent-lid');
    dice.forEach((value, index) => {
        const diceElement = document.createElement('div');
        diceElement.id = `opponent-dice-${index + 1}`;
        diceElement.textContent = value;
        diceElement.className = `dice dice-${value}`;
        opponentLidArea.appendChild(diceElement);
    });
}

function selectCombination(combination) {
    const diceValues = Array.from(document.getElementById('player-lid').children)
        .map(dice => parseInt(dice.textContent));

    const score = calculateScore(combination, diceValues);

    if (confirm(`Вы хотите внести ${score} очков в "${combination}"?`)) {
        submitCombination(combination, score);
    }
}

function calculateScore(combination, diceValues) {
    switch(combination) {
        case 'Школа на 1':
        case 'Школа на 2':
        case 'Школа на 3':
        case 'Школа на 4':
        case 'Школа на 5':
        case 'Школа на 6':
            const value = parseInt(combination.split(' ')[2]);
            return diceValues.filter(d => d === value).reduce((a, b) => a + b, 0);
        case 'Пара':
            return isPair(diceValues) ? Math.max(...getPairValues(diceValues)) * 2 : 0;
        case 'Две пары':
            return isTwoPairs(diceValues) ? getTwoPairsSum(diceValues) : 0;
        case 'Тройник':
            return isThreeOfAKind(diceValues) ? getThreeOfAKindValue(diceValues) * 3 : 0;
        case 'Фул-хаус':
            return isFullHouse(diceValues) ? diceValues.reduce((a, b) => a + b, 0) : 0;
        case 'Каре':
            return isFourOfAKind(diceValues) ? getFourOfAKindValue(diceValues) * 4 : 0;
        case 'Покер':
            return isYahtzee(diceValues) ? 50 : 0;
        case 'Малый стрит':
            return isSmallStraight(diceValues) ? 25 : 0;
        case 'Большой стрит':
            return isLargeStraight(diceValues) ? 40 : 0;
        case 'Шанс':
            return diceValues.reduce((a, b) => a + b, 0);
        case 'Школа всего':
        case 'ИТОГО':
            // Эти комбинации обычно рассчитываются автоматически на основе других комбинаций
            return 0;
        default:
            console.error('Unknown combination:', combination);
            return 0;
    }
}

function getPairValues(diceValues) {
    const valueCounts = countValues(diceValues);
    return Object.entries(valueCounts)
        .filter(([_, count]) => count >= 2)
        .map(([value, _]) => parseInt(value));
}

function getTwoPairsSum(diceValues) {
    const pairValues = getPairValues(diceValues);
    return pairValues.length >= 2 ? (pairValues[0] * 2 + pairValues[1] * 2) : 0;
}

function getThreeOfAKindValue(diceValues) {
    const valueCounts = countValues(diceValues);
    return parseInt(Object.entries(valueCounts).find(([_, count]) => count >= 3)[0]);
}

function getFourOfAKindValue(diceValues) {
    const valueCounts = countValues(diceValues);
    return parseInt(Object.entries(valueCounts).find(([_, count]) => count >= 4)[0]);
}

function submitCombination(combination, score) { fetch(${SERVER_URL}/api/submit_combination, { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify({ telegram_id: telegram_id, lobby_id: currentLobbyId, combination: combination, score: score }), }) .then(response => response.json()) .then(data => { if (data.status === 'success') { updateScoreTable(data.score_table); if (data.game_over) { endGame(data.final_scores); } else { startNewRound(); } } else { console.error('Error submitting combination:', data.message); showError('Ошибка при отправке комбинации. Пожалуйста, попробуйте еще раз.'); } }) .catch(error => { console.error('Error:', error); showError('Произошла ошибка. Пожалуйста, попробуйте еще раз.'); }); }

function updateScoreTable(scoreTable) { for (const [combination, scores] of Object.entries(scoreTable)) { document.getElementById(player-${combination.replace(/\s+/g, '-').toLowerCase()}).textContent = scores.player; if (currentGameMode !== 'solo_training') { document.getElementById(opponent-${combination.replace(/\s+/g, '-').toLowerCase()}).textContent = scores.opponent; } } }

function startNewRound() { // Очистка областей с кубиками document.getElementById('player-lid').innerHTML = ''; document.getElementById('player-box').innerHTML = ''; if (currentGameMode !== 'solo_training') { document.getElementById('opponent-lid').innerHTML = ''; document.getElementById('opponent-box').innerHTML = ''; }

// Запрос новых кубиков
requestDiceRoll();
}

function endGame(finalScores) { hideAllScreens(); const gameOverScreen = document.getElementById('game-over-screen'); gameOverScreen.style.display = 'block';

const resultMessage = document.getElementById('result-message');
if (currentGameMode === 'solo_training') {
    resultMessage.textContent = `Игра окончена! Ваш финальный счет: ${finalScores.player}`;
} else {
    if (finalScores.player > finalScores.opponent) {
        resultMessage.textContent = `Поздравляем! Вы выиграли со счетом ${finalScores.player} против ${finalScores.opponent}`;
    } else if (finalScores.player < finalScores.opponent) {
        resultMessage.textContent = `К сожалению, вы проиграли. Ваш счет: ${finalScores.player}, счет противника: ${finalScores.opponent}`;
    } else {
        resultMessage.textContent = `Ничья! Оба игрока набрали по ${finalScores.player} очков`;
    }
}

document.getElementById('return-to-menu-button').addEventListener('click', showMainMenu);
}

// Дополнительные вспомогательные функции

function isSchoolCombination(combination) { return combination.startsWith('Школа на'); }

function isPair(diceValues) { const valueCounts = countValues(diceValues); return Object.values(valueCounts).some(count => count >= 2); }

function isTwoPairs(diceValues) { const valueCounts = countValues(diceValues); const pairCount = Object.values(valueCounts).filter(count => count >= 2).length; return pairCount >= 2; }

function isThreeOfAKind(diceValues) { const valueCounts = countValues(diceValues); return Object.values(valueCounts).some(count => count >= 3); }

function isFullHouse(diceValues) { const valueCounts = countValues(diceValues); return Object.values(valueCounts).includes(3) && Object.values(valueCounts).includes(2); }

function isFourOfAKind(diceValues) { const valueCounts = countValues(diceValues); return Object.values(valueCounts).some(count => count >= 4); }

function isYahtzee(diceValues) { return new Set(diceValues).size === 1; }

function isSmallStraight(diceValues) { const uniqueSortedValues = Array.from(new Set(diceValues)).sort((a, b) => a - b); return uniqueSortedValues.length >= 4 && (arrayEquals(uniqueSortedValues.slice(0, 4), [1, 2, 3, 4]) || arrayEquals(uniqueSortedValues.slice(0, 4), [2, 3, 4, 5]) || arrayEquals(uniqueSortedValues.slice(0, 4), [3, 4, 5, 6])); }

function isLargeStraight(diceValues) { const sortedValues = diceValues.sort((a, b) => a - b); return arrayEquals(sortedValues, [1, 2, 3, 4, 5]) || arrayEquals(sortedValues, [2, 3, 4, 5, 6]); }

function countValues(diceValues) { return diceValues.reduce((counts, value) => { counts[value] = (counts[value] || 0) + 1; return counts; }, {}); }

function arrayEquals(a, b) { return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index]); }

// Экспорт функций для использования в других модулях (если необходимо) 
export { startSearch, cancelSearch, startSoloTraining, playerReady, showError, startGame, requestDiceRoll, rerollDice, selectCombination, submitCombination };