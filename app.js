document.addEventListener('DOMContentLoaded', (event) => {
    // Константа с адресом сервера
    const SERVER_URL = 'http://localhost:5000';

    const tgApp = window.Telegram.WebApp;
    let telegram_id;
    let currentGameMode;

    const mainMenu = document.getElementById('main-menu');
    const gameModes = document.getElementById('game-modes');
    const lobby = document.getElementById('lobby');
    const playButton = document.getElementById('play-button');
    const backToMainButton = document.getElementById('back-to-main');
    const normalGameButton = document.getElementById('normal-game');
    const rankedGameButton = document.getElementById('ranked-game');
    const trainingButton = document.getElementById('training');
    const cancelSearchButton = document.getElementById('cancel-search');
    const lobbyStatus = document.getElementById('lobby-status');

    if (tgApp) {
        tgApp.ready();
        const user = tgApp.initDataUnsafe.user;
        if (user) {
            telegram_id = user.id;
            fetchUserData(telegram_id);
        } else {
            console.error("User data not available from Telegram WebApp");
        }
    } else {
        console.error('Telegram WebApp is not available');
    }

    function fetchUserData(telegram_id) {
        fetch(`${SERVER_URL}/api/user_data/${telegram_id}`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('user_name').textContent = `${data.first_name} ${data.last_name}`;
                localStorage.setItem('session_id', data.session_id);
            })
            .catch(error => console.error('Error fetching user data:', error));
    }

    playButton.addEventListener('click', () => {
        mainMenu.style.display = 'none';
        gameModes.style.display = 'block';
    });

    backToMainButton.addEventListener('click', () => {
        gameModes.style.display = 'none';
        mainMenu.style.display = 'block';
    });

    [normalGameButton, rankedGameButton, trainingButton].forEach(button => {
        button.addEventListener('click', (event) => {
            currentGameMode = event.target.id;
            searchLobby(currentGameMode);
        });
    });

    cancelSearchButton.addEventListener('click', cancelSearch);

    function searchLobby(gameMode) {
        gameModes.style.display = 'none';
        lobby.style.display = 'block';
        lobbyStatus.textContent = 'Постановка в очередь подбора игроков';

        fetch(`${SERVER_URL}/api/search_lobby`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_id: telegram_id,
                game_mode: gameMode
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'queued') {
                lobbyStatus.textContent = 'Ожидание соперника';
                waitForLobby();
            } else {
                lobbyStatus.textContent = 'Ошибка при поиске лобби';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            lobbyStatus.textContent = 'Ошибка при поиске лобби';
        });
    }

    function waitForLobby() {
        const intervalId = setInterval(() => {
            fetch(`${SERVER_URL}/api/check_lobby/${telegram_id}`)
                .then(response => response.json())
                .then(data => {
                    if (data.lobby_id) {
                        clearInterval(intervalId);
                        lobbyStatus.textContent = `Лобби найдено! ID: ${data.lobby_id}`;
                        // Здесь можно добавить логику для перехода в игру
                    }
                })
                .catch(error => console.error('Error checking lobby:', error));
        }, 5000); // Проверяем каждые 5 секунд
    }

    function cancelSearch() {
        fetch(`${SERVER_URL}/api/cancel_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_id: telegram_id
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'cancelled') {
                lobby.style.display = 'none';
                gameModes.style.display = 'block';
            } else {
                lobbyStatus.textContent = 'Ошибка при отмене поиска';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            lobbyStatus.textContent = 'Ошибка при отмене поиска';
        });
    }
});