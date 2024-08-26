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
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('game-modes').style.display = 'none';
    document.getElementById('search-screen').style.display = 'none';
    document.getElementById('ready-screen').style.display = 'none';
}

function showGameModes() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-modes').style.display = 'block';
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
            document.getElementById('game-modes').style.display = 'none';
            document.getElementById('search-screen').style.display = 'block';
            if (mode === 'training') {
                document.getElementById('solo-training-button').style.display = 'block';
            }
        } else {
            console.error('Error starting search:', data.message);
            alert('Ошибка при начале поиска. Пожалуйста, попробуйте еще раз.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
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
            alert('Ошибка при отмене поиска. Пожалуйста, попробуйте еще раз.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
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
        } else {
            console.error('Error starting solo training:', data.message);
            alert('Ошибка при начале одиночной тренировки. Пожалуйста, попробуйте еще раз.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
    });
}

function showReadyScreen() {
    document.getElementById('search-screen').style.display = 'none';
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
                // Здесь должна быть логика для начала игры
                alert('Игра начинается!');
            } else {
                alert('Готов к игре. Ожидание других игроков...');
                startLobbyStatusCheck();
            }
        } else {
            console.error('Error setting player ready:', data.message);
            alert('Ошибка при подготовке к игре. Пожалуйста, попробуйте еще раз.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
    });
}

function checkLobbyStatus() {
    if (currentLobbyId) {
        fetch(`${SERVER_URL}/api/lobby_status/${currentLobbyId}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'ready') {
                    clearInterval(lobbyCheckInterval);
                    // Здесь должна быть логика для начала игры
                    alert('Все игроки готовы. Игра начинается!');
                }
            })
            .catch(error => console.error('Error checking lobby status:', error));
    }
}

let lobbyCheckInterval;

function startLobbyStatusCheck() {
    lobbyCheckInterval = setInterval(checkLobbyStatus, 5000); // Проверка каждые 5 секунд
}