/* WebSocket communication handler */
var CONNECTION_ID = -1;
var SOCKET_KEY = null;
var ROOM_ID = -1;
var webSocket = null;
var showRoomsModal = true;
var actionButtonsEnabled = false;
var actionButtonsSafetyTimer = null; // set by app.js's disableActionButtons(), cleared here once the server confirms the turn changed
var autoPlay = false; // Set true makes logged in player play automatically
var autoPlayCommandRequested = false;


// Instantiate webSocket
function startWebSocket(boolMode) {
  console.log("Using url: " + boolMode ? API_URL_DEVELOPMENT : API_URL_PRODUCTION);
  webSocket = new WebSocket(boolMode ? API_URL_DEVELOPMENT : API_URL_PRODUCTION);
  // WebSocket events
  webSocket.onopen = function (event) {
  };
  webSocket.onmessage = function (event) {
    onMessageHandler(JSON.parse(event.data));
  };
  webSocket.onclose = function () {
    toastr["error"]("WebSocket closed!");
    var $noSocketConnection = $('#noSocketConnection');
    $noSocketConnection.css("height", 'auto').css("visibility", 'visible')
  };
}


// ----------------------------------------------------
// To Server commands

function getRooms(roomSortParam) {
  if (checkSocketStatus()) {
    if (ROOM_ID === -1) {
      webSocket.send(JSON.stringify({
        "connectionId": CONNECTION_ID,
        "socketKey": SOCKET_KEY,
        "key": "getRooms",
        "playerName": playerNickname,
        "roomId": ROOM_ID,
        "roomSortParam": roomSortParam
      }))
    } else {
      location.reload();
    }
  }
}

function selectRoom() {
  if (checkSocketStatus()) {
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "selectRoom",
      "roomId": ROOM_ID
    }))
  }
}

// Player chose a specific seat number and a buy-in amount for that table
function selectSeat(seatIndex, buyIn) {
  if (checkSocketStatus()) {
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "selectSeat",
      "roomId": ROOM_ID,
      "seatIndex": seatIndex,
      "buyIn": buyIn
    }))
  }
}

function getSpectateRooms() {
  if (checkSocketStatus()) {
    if (ROOM_ID == -1) {
      webSocket.send(JSON.stringify({
        "connectionId": CONNECTION_ID,
        "socketKey": SOCKET_KEY,
        "key": "getSpectateRooms",
        "roomId": ROOM_ID
      }))
    } else {
      //toastr["info"]("Spectating is only possible if room selection is not done. Refresh browser, close room list and click \"Spectate\"");
      location.reload();
    }
  }
}

function getRankings() {
  if (checkSocketStatus()) {
    webSocket.send(JSON.stringify({"connectionId": CONNECTION_ID, "socketKey": SOCKET_KEY, "key": "getRankings"}))
  }
}

function getPlayerChartData() {
  if (checkSocketStatus()) {
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "getPlayerChartData"
    }))
  }
}

function selectSpectateRoom() {
  if (checkSocketStatus()) {
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "selectSpectateRoom",
      "roomId": ROOM_ID
    }));
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "getRoomParams",
      "roomId": ROOM_ID
    }))
  }
}

function setFold() {
  if (checkSocketStatus()) {
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "setFold",
      "roomId": ROOM_ID
    }))
  }
}

function setCheck() {
  if (checkSocketStatus()) {
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "setCheck",
      "roomId": ROOM_ID
    }))
  }
}

function setRaise(amount) {
  if (checkSocketStatus() && amount > 0) {
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "setRaise",
      "roomId": ROOM_ID,
      "amount": amount
    }))
  }
}

function getGameInformation() {
  if (checkSocketStatus()) {
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "getGameInformation"
    }))
  }
}

function createAccount(username, password, email) { // SHA3-512
  var passwordSha3 = sha3_512(password);
  console.log("RegisterHash: " + passwordSha3);
  if (checkSocketStatus()) {
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "createAccount",
      "name": username,
      "password": passwordSha3,
      "email": email
    }));
  }
}

function userLogin(username, password) { // SHA3-512
  var passwordSha3 = sha3_512(password);
  console.log("Login hash: " + passwordSha3);
  if (checkSocketStatus()) {
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "userLogin",
      "name": username,
      "password": passwordSha3
    }));
  }
}


function setLoggedInUserParams() { // SHA3-512
  var username = localStorage.getItem(LS_USERNAME);
  var passwordHash = localStorage.getItem(LS_PASSWORD);
  if (checkSocketStatus() && localStorage.getItem(LS_LOGGED_IN) === 'true') {
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "loggedInUserParams",
      "name": username,
      "password": passwordHash
    }));
    console.log("Set logged in user prms for: " + username);
  }
}


function sendServerCommand() {
  if (checkSocketStatus()) {
    var lineOne = $('#cmdCommandLineOne').val();
    var lineTwo = $('#cmdCommandLineTwo').val();
    var lineThree = $('#cmdCommandLineThree').val();
    var password = sha3_512($('#cmdPassword').val());
    console.log(password);
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "serverCommand",
      "lineOne": lineOne,
      "lineTwo": lineTwo,
      "lineThree": lineThree,
      "password": password
    }))
  }
}


function getLoggedInUserStatistics() {
  if (checkSocketStatus() && localStorage.getItem(LS_LOGGED_IN) === 'true') {
    webSocket.send(JSON.stringify({
      "connectionId": CONNECTION_ID,
      "socketKey": SOCKET_KEY,
      "key": "loggedInUserStatistics"
    }));
  }
}


// If auto play enabled, request action via this function
function getAutoPlayAction() {
  if (checkSocketStatus() && localStorage.getItem(LS_LOGGED_IN) === 'true') {
    console.log("# Requesting auto play action");
    webSocket.send(JSON.stringify({"connectionId": CONNECTION_ID, "socketKey": SOCKET_KEY, "key": "autoPlayAction"}));
    autoPlayCommandRequested = true;
  }
}


// ----------------------------------------------------
// From server commands a.k.a. messages
function onMessageHandler(jsonData) {
  switch (jsonData.key) {
    case 'connectionId':
      CONNECTION_ID = Number(jsonData.connectionId);
      SOCKET_KEY = jsonData.socketKey;
      console.log("My socket key: " + SOCKET_KEY);
      $('#selectRoomModal').modal('show');
      getRooms("all");
      if (localStorage.getItem(LS_LOGGED_IN) === 'true') {
        setLoggedInUserParams();
      }
      break;
    case 'getRooms':
      disableRoomSortButtons(false);
      parseRooms(jsonData.data, false);
      break;
    case 'getSpectateRooms':
      disableRoomSortButtons(true);
      parseRooms(jsonData.data, true);
      break;
    case 'roomParams':
      roomParameters(jsonData.data);
      break;
    case 'holeCards':
      holeCards(jsonData.data);
      break;
    case 'statusUpdate':
      statusUpdate(jsonData.data);
      break;
    case 'theFlop':
      theFlop(jsonData.data);
      break;
    case 'theTurn':
      theTurn(jsonData.data);
      break;
    case 'theRiver':
      theRiver(jsonData.data);
      break;
    case 'allPlayersCards':
      allPlayersCards(jsonData.data);
      break;
    case 'audioCommand':
      audioCommand(jsonData.data);
      break;
    case 'getGameInformation':
      gameInformation(jsonData.data);
      break;
    case 'lastUserAction':
      playerLastActionHandler(jsonData.data);
      break;
    case 'accountCreated':
      accountCreated(jsonData.data);
      break;
    case 'loginResult':
      loginResult(jsonData.data);
      break;
    case 'loggedInUserParamsResult':
      loggedInUserParamsResult(jsonData.data);
      break;
    case "serverCommandResult":
      commandRunResult(jsonData.data);
      break;
    case "loggedInUserStatisticsResults":
      loggedInUserStatisticsResults(jsonData.data);
      break;
    case "getRankingsResult":
      getRankingsResult(jsonData.code, jsonData.data);
      break;
    case "onXPGained":
      onXPGained(jsonData.code, jsonData.data);
      break;
    case "clientMessage":
      clientMessage(jsonData.data);
      break;
    case "autoPlayActionResult":
      autoPlayActionResult(jsonData.data);
      break;
    case "collectChipsToPot":
      collectChipsToPotAction(jsonData.data);
      break;
    case "getPlayerChartDataResult":
      getPlayerChartDataResult(jsonData.data);
      break;
    case "selectSeatResult":
      selectSeatResult(jsonData.data);
      break;
  }
}

// ----------------------------------------------------
// Parse outputs

var lastRoomsData = []; // keep last getRooms payload so we can read freeSeats/buyIn when a room is clicked

function roomTierLabel(roomMinBet) {
  if (roomMinBet < 100) return 'Low';
  if (roomMinBet < 1000) return 'Mid';
  return 'VIP';
}

function parseRooms(rData, isSpectateMode) {
  // Example: {"key":"getRooms","data":[{"roomId":0,"roomName":"Room 0","playerCount":0,"maxSeats":7,"buyInMin":200,"buyInMax":2000,"freeSeats":[0,1,2,3,4,5,6]}]}
  console.log(JSON.stringify(rData));
  lastRoomsData = rData;

  // Header info (username es real, viene de localStorage; balance NO existe
  // como concepto de banca en este backend hoy -- solo hay fichas de mesa,
  // asi que se muestra un placeholder honesto en vez de inventar un numero)
  var uname = localStorage.getItem(LS_USERNAME);
  $('#lobbyUsername').text(uname ? uname : 'Invitado');
  $('#lobbyBalance').text('Fichas: se eligen al sentarte');



  var $container = $('#room-list-container');
  $container.empty();

  if (rData.length === 0) {
    $container.append('<div class="lobby-empty">No hay mesas con este filtro por ahora.</div>');
    return;
  }

  for (var i = 0; i < rData.length; i++) {
    var minBet = rData[i].hasOwnProperty('roomMinBet') ? rData[i].roomMinBet : 10;
    var tier = roomTierLabel(minBet);
    var playerCount = rData[i].playerCount || 0;
    var maxSeats = rData[i].maxSeats || 7;
    var buyInMin = rData[i].buyInMin || (minBet * 20);
    var buyInMax = rData[i].buyInMax || (minBet * 200);

    var $card = $(
      "<div class='room-card' data-room-id='" + rData[i].roomId + "'>" +
      "  <div class='room-card-left'>" +
      "    <div class='room-seat-badge'>" + playerCount + "/" + maxSeats + "</div>" +
      "    <div>" +
      "      <div class='room-card-name'>" + rData[i].roomName + "</div>" +
      "      <div class='room-card-meta'>" +
      "        <span class='room-tier-tag room-tier-" + tier.toLowerCase() + "'>" + tier + "</span>" +
      "        <span class='room-minbet'>MB " + minBet + "$</span>" +
      "        <span class='room-buyin'>Buy-in " + buyInMin + "$ - " + buyInMax + "$</span>" +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      "  <button type='button' class='room-sit-btn'>" + (isSpectateMode ? 'Ver' : 'Sentarse') + "</button>" +
      "</div>"
    );
    $card.find('.room-sit-btn').click(function () {
      ROOM_ID = Number($(this).closest('.room-card').attr('data-room-id'));
      $('#selectRoomModal').modal('hide');
      if (isSpectateMode) {
        selectSpectateRoom();
      } else {
        openSeatPicker(ROOM_ID);
      }
    });
    $container.append($card);
  }
}

// ----------------------------------------------------
// Seat + buy-in picker (shown after choosing a table, before choosing selectSpectateRoom)

function openSeatPicker(roomId) {
  var roomData = null;
  for (var i = 0; i < lastRoomsData.length; i++) {
    if (Number(lastRoomsData[i].roomId) === roomId) {
      roomData = lastRoomsData[i];
      break;
    }
  }
  if (!roomData) {
    return;
  }
  var freeSeats = roomData.freeSeats || [];
  var buyInMin = roomData.buyInMin || roomData.roomMinBet * 20;
  var buyInMax = roomData.buyInMax || roomData.roomMinBet * 200;

  var $seatGrid = $('#seatPickerGrid');
  $seatGrid.empty();
  var totalSeats = roomData.maxSeats || 7;
  for (var s = 0; s < totalSeats; s++) {
    var isFree = freeSeats.indexOf(s) !== -1;
    $seatGrid.append(
      "<button type='button' class='btn " + (isFree ? "btn-outline-success" : "btn-secondary") + " seatPickerBtn' " +
      "data-seat='" + s + "' " + (isFree ? "" : "disabled") + " style='margin:4px; width:70px;'>" +
      "Seat " + (s + 1) +
      "</button>"
    );
  }
  $('#seatPickerBuyIn').attr('min', buyInMin).attr('max', buyInMax).val(buyInMin);
  $('#seatPickerBuyInRange').text(buyInMin + '$ - ' + buyInMax + '$');
  $('#seatPickerError').text('');
  var selectedSeat = null;
  $('.seatPickerBtn').click(function () {
    $('.seatPickerBtn').removeClass('btn-primary').filter(function () {
      return !$(this).is(':disabled');
    }).addClass('btn-outline-success');
    $(this).removeClass('btn-outline-success').addClass('btn-primary');
    selectedSeat = Number($(this).attr('data-seat'));
  });
  $('#seatPickerConfirmBtn').off('click').on('click', function () {
    var buyIn = Number($('#seatPickerBuyIn').val());
    if (selectedSeat === null) {
      $('#seatPickerError').text('Choose a seat first.');
      return;
    }
    if (isNaN(buyIn) || buyIn < buyInMin || buyIn > buyInMax) {
      $('#seatPickerError').text('Buy-in must be between ' + buyInMin + '$ and ' + buyInMax + '$.');
      return;
    }
    $('#seatPickerModal').modal('hide');
    selectSeat(selectedSeat, buyIn);
  });
  $('#seatPickerModal').modal('show');
}

// Server confirms whether the seat + buy-in were accepted
function selectSeatResult(data) {
  if (!data.result) {
    toastr["error"](data.reason || "Could not sit at that seat.");
    ROOM_ID = -1;
    $('#selectRoomModal').modal('show');
    getRooms("all");
    return;
  }

  // Sentada confirmada: recién acá corresponde pasar de la vista Lobby a
  // la vista Mesa (ver el comentario en app.js/backToLobby -- éste es el
  // "camino de ida" que faltaba). Sin esto, #tableView se queda con
  // view-hidden para siempre y la mesa nunca se ve, aunque el servidor
  // ya haya mandado todos los datos de la partida correctamente.
  $('#selectRoomModal').modal('hide');
  $('#seatPickerModal').modal('hide');
  var tableView = document.getElementById('tableView');
  if (tableView) {
    tableView.classList.remove('view-hidden');
    tableView.classList.add('view-active');
  }
}

// ----------------------------------------------------
// Room parameters

function roomParameters(rData) {
  // Example: {"playerCount":3,"roomMinBet":10,"maxSeats":7,"middleCards":[...],"playersData":[{"playerId":0,"playerName":"Bot362","playerMoney":6462.5,"isDealer":false,"seatIndex":2}]}
  console.log("Room params: " + JSON.stringify(rData));
  initRoom();
  initSeats();
  getLoggedInUserStatistics(); // Added so refreshing xp needed counter updates automatically
  room.setMinBet(rData.roomMinBet);
  window.currentRoomMinBet = Number(rData.roomMinBet) || 0; // used by the "Min" raise shortcut
  var gameStarted = rData.gameStarted;
  if (rData.middleCards.length > 0) {
    for (var m = 0; m < rData.middleCards.length; m++) {
      room.middleCards[m] = rData.middleCards[m];
      room.setMiddleCard(m, gameStarted);
    }
  }
  players = []; // initialize array
  for (var i = 0; i < rData.playersData.length; i++) {
    var pd = rData.playersData[i];
    // seatIndex comes straight from the server (fixed seat number 0..maxSeats-1);
    // fall back to array position only for compatibility with an older server.
    var seatPos = (pd.seatIndex !== undefined && pd.seatIndex !== null && pd.seatIndex >= 0) ? pd.seatIndex : i;
    if (seats[seatPos] === undefined) {
      continue; // safety: ignore out-of-range seats rather than crash
    }
    players.push(new Player(seats[seatPos], Number(pd.playerId), pd.playerName, Number(pd.playerMoney)));
    players[players.length - 1].initPlayer(gameStarted);
    if (pd.isDealer === true) {
      players[players.length - 1].setPlayerAsDealer();
    }
  }
}

// ----------------------------------------------------
// Hole Cards  ({"players":[{"playerId":0,"cards":["3♠","4♥"]}]})
function holeCards(pData) {
  //console.log("HoleCards: "+JSON.stringify(pData));
  for (var p = 0; p < pData.players.length; p++) {
    for (var i = 0; i < players.length; i++) {
      if (Number(players[i].playerId) == Number(pData.players[p].playerId)) {
        players[i].playerCards.push(pData.players[p].cards[0]);
        players[i].playerCards.push(pData.players[p].cards[1]);
      }
    }
  }
  holeCardsAsync();
}

async function holeCardsAsync() {
  for (var c = 0; c < 2; c++) {
    for (var i = 0; i < players.length; i++) {
      if (!players[i].isFold) {
        await sleep(300);
        players[i].setPlayerCard(c, false, false);
      }
    }
  }
}


// Busca el Player local (cliente) que corresponde a un playerId del servidor.
// NECESARIO porque sData.playersData (orden interno del servidor para esta
// mano, rota con el dealer) y el array local `players` (orden en que se
// fueron sentando, fijo desde que se armó la mesa) NO están garantizados a
// tener el mismo orden ni el mismo largo entre sí. Indexar por posición
// (players[i] contra sData.playersData[i]) hacía que, en cuanto los dos
// órdenes divergían, se llamara a un método sobre `undefined` (asiento
// vacío o jugador equivocado) -- eso tiraba un error no capturado que
// cortaba el resto de statusUpdate() a mitad de camino, y la mesa se veía
// congelada (turno/tiempo/cartas sin actualizar) aunque el servidor
// siguiera mandando todo correctamente.
function getPlayerByServerId(pId) {
  for (var p = 0; p < players.length; p++) {
    if (players[p] && Number(players[p].playerId) === Number(pId)) {
      return players[p];
    }
  }
  return null;
}

// ----------------------------------------------------
// Status update ({"totalPot":30,"currentStatus":"Betting round 4","middleCards":["2♦","4♥","5♦","A♠","3♠"],"playersData":[{"playerId":1,"playerName":"Anon250","playerMoney":10000,"totalBet":0,"isPlayerTurn":false,"isFold":true,"timeBar":0},{"playerId":2,"playerName":"Anon93","playerMoney":9970,"totalBet":30,"isPlayerTurn":true,"isFold":false,"timeBar":0}],"isCallSituation":false,"isResultsCall":false})
function statusUpdate(sData) {
  //console.log(JSON.stringify(sData));
  var i = 0;
  room.setTotalPot(sData.totalPot);
  window.currentTotalPot = Number(sData.totalPot) || 0; // used by pot-fraction raise shortcuts
  room.setRoomStatusText(sData.currentStatus);
  room.setRoomName(sData.roomName);
  room.setRoomSpectatorCount(sData.spectatorsCount);
  room.setRoomWaitingPlayersCount(sData.appendPlayersCount);
  room.setRoomDeckStatus(sData.deckStatus);
  room.setRoomDeckBurnedCount(sData.deckCardsBurned);
  // Calcula cuanto falta igualar para el jugador local, asi el boton puede
  // mostrar "Call 250$" en vez de un generico "Call" sin monto (como en las
  // plataformas reales). No hace falta un campo nuevo del backend: se puede
  // derivar de las apuestas ya presentes en playersData.
  var myCallAmount = 0;
  if (sData.isCallSituation) {
    var highestBet = 0;
    for (var h = 0; h < sData.playersData.length; h++) {
      if (!sData.playersData[h].isFold && sData.playersData[h].totalBet > highestBet) {
        highestBet = sData.playersData[h].totalBet;
      }
    }
    var myData = null;
    for (var m = 0; m < sData.playersData.length; m++) {
      if (Number(sData.playersData[m].playerId) === Number(CONNECTION_ID)) {
        myData = sData.playersData[m];
        break;
      }
    }
    myCallAmount = myData ? Math.max(0, highestBet - myData.totalBet) : 0;
  }
  window.currentMyCallAmount = myCallAmount; // usado como piso legal por el panel de Aumentar
  room.toggleCheckAndCall(sData.isCallSituation, myCallAmount);
  for (i = 0; i < sData.playersData.length; i++) {
    var pMoney = sData.playersData[i].playerMoney;
    var pTotalBet = sData.playersData[i].totalBet;
    var pTurn = sData.playersData[i].isPlayerTurn;
    var pIsFold = sData.playersData[i].isFold;
    var pTimeBar = sData.playersData[i].timeBar;
    var pTimeLeft = sData.playersData[i].timeLeft;
    var pId = sData.playersData[i].playerId;

    var player = getPlayerByServerId(pId);
    if (!player) {
      // Todavía no tenemos un Player local para este playerId (por ejemplo,
      // el evento de "se sentó" no terminó de procesarse). Nos salteamos
      // esta entrada en vez de romper el resto de la actualización.
      continue;
    }

    player.setTimeBar(pTimeLeft);
    if (Number(pId) == Number(CONNECTION_ID) && player.tempBet > 0) {
      // Do nothing
    } else {
      player.setPlayerMoney(pMoney);
      if (sData.collectingPot === false) {
        player.setPlayerTotalBet(pTotalBet);
      }
    }
    if (pIsFold) {
      if (!player.isFold) {
        player.setPlayerFold();
      }
    }
    if (Number(pId) == Number(CONNECTION_ID)) {
      player.setPlayerTurn(pTurn, sData.isCallSituation);
      actionButtonsEnabled = true;
      if (typeof enableActionButtons === 'function') {
        enableActionButtons(); // re-enable the DOM buttons dimmed/disabled on click, server confirmed the turn changed
      }
      if (actionButtonsSafetyTimer) {
        clearTimeout(actionButtonsSafetyTimer); // server responded in time, no need for the 1s fallback anymore
        actionButtonsSafetyTimer = null;
      }
      if (pTurn && autoPlay && !autoPlayCommandRequested) {
        getAutoPlayAction();
      }
    }
  }
  if (sData.isResultsCall) {
    if (enableSounds) {
      playChipsHandleFive.play();
    }
    for (i = 0; i < players.length; i++) {
      players[i].tempBet = 0;
      players[i].setPlayerTotalBet(0);
      if (players[i].playerId != CONNECTION_ID) {
        if (!players[i].isFold) {
          players[i].setPlayerCard(0, true, false);
          players[i].setPlayerCard(1, true, false);
        }
      }
      var l = sData.roundWinnerPlayerIds.length;
      for (var w = 0; w < l; w++) {
        if (Number(sData.roundWinnerPlayerIds[w]) == Number(players[i].playerId)) {
          players[i].startWinnerGlowAnimation();
          if (sData.hasOwnProperty('roundWinnerPlayerCards')) {
            var cl = sData.roundWinnerPlayerCards.length;
            for (var c = 0; c < cl; c++) {
              players[i].startWinnerGlowCardsAnimation(sData.roundWinnerPlayerCards[c]);
            }
          }
        }
      }
    }
  }
}

// ----------------------------------------------------
// The Flop (theFlop: {"middleCards":["8♣","5♣","2♥"]})
function theFlop(fData) {
  console.log("theFlop: " + JSON.stringify(fData));
  room.middleCards[0] = fData.middleCards[0];
  room.middleCards[1] = fData.middleCards[1];
  room.middleCards[2] = fData.middleCards[2];
  theFlopAsync();
}

async function theFlopAsync() {
  for (var c = 0; c < 3; c++) {
    await sleep(300);
    room.setMiddleCard(c, false);
  }
}

// ----------------------------------------------------
// The turn (theTurn: {"middleCards":["Q♦","J♥","3♥","6♠"]})
function theTurn(tData) {
  console.log("theTurn: " + JSON.stringify(tData));
  room.middleCards[3] = tData.middleCards[3];
  theTurnAsync();
}

async function theTurnAsync() {
  room.setMiddleCard(3, false);
}

// ----------------------------------------------------
// The river (theRiver: {"middleCards":["8♥","8♦","J♣","J♠","7♣"]})
function theRiver(rData) {
  console.log("theRiver: " + JSON.stringify(rData));
  room.middleCards[4] = rData.middleCards[4];
  theRiverAsync();
}

async function theRiverAsync() {
  await sleep(300);
  room.setMiddleCard(4, false);
}

// ----------------------------------------------------

// Receive all players cards before results for showing them
function allPlayersCards(cData) {
  // Example: {"players":[{"playerId":0,"cards":["6♦","A♦"]},{"playerId":1,"cards":["7♣","7♠"]}]}
  console.log("allPlayersCards: " + JSON.stringify(cData));
  for (var p = 0; p < cData.players.length; p++) {
    for (var i = 0; i < players.length; i++) {
      if (Number(players[i].playerId) === Number(cData.players[p].playerId)) {
        players[i].playerCards = []; // clear first
        players[i].playerCards.push(cData.players[p].cards[0]);
        players[i].playerCards.push(cData.players[p].cards[1]);
      }
    }
  }
}


// ----------------------------------------------------

// Parse game information
function gameInformation(gData) {
  // {"roomCount":3,"totalConnectionsCount":3,"activeConnectionsCount":3,"serverFreeMemory":42.07421875,"serverTotalMemory":925.51953125,"serverUpTime":419942,"serverLoadAverage":0}
  console.log(JSON.stringify(gData));
  $('#gameInformationModal').modal('show');
  document.getElementById('totalConnections').innerHTML = gData.totalConnectionsCount + ' total';
  document.getElementById('activeConnections').innerHTML = gData.activeConnectionsCount + ' active';
  document.getElementById('serverUptime').innerHTML = Math.round((Number(gData.serverUpTime) / 60 / 60)) + ' hours';
  /*
  var serverMemoryFree = document.getElementById('serverMemoryFree');
  serverMemoryFree.innerHTML = Math.round(Number(gData.serverFreeMemory) / 10) + '%';
  serverMemoryFree.style.width = Math.round(Number(gData.serverFreeMemory)  / 10) + '%';
  */
  var serverMemoryTotal = document.getElementById('serverMemoryTotal');
  serverMemoryTotal.innerHTML = Math.round(Number(gData.serverTotalMemory)) + 'mb';
  serverMemoryTotal.style.width = Math.round(Number(gData.serverTotalMemory)) + '%';

  if (Number(gData.serverLoadAverage) > 1) {
    var serverLoadAverage = document.getElementById('serverLoadAverage');
    serverLoadAverage.innerHTML = Math.round(Number(gData.serverLoadAverage));
    serverLoadAverage.style.width = Math.round(Number(gData.serverLoadAverage)) + '%';
  }
}

// ----------------------------------------------------


// Handles last player action animation
function playerLastActionHandler(aData) {
  // Example: {"playerId":0,"actionText":"raise"}
  //console.log(JSON.stringify(aData));
  for (var i = 0; i < players.length; i++) {
    if (players[i].playerId == aData.playerId) {
      players[i].setPlayerActionText(aData.actionText);
    }
  }

}


// ----------------------------------------------------

// ------------------------------------------------------------------------------------
// Login related functions

function accountCreated(aData) {
  if (aData.result) {
    toastr["success"]("Account successfully created, you can now login.");
    modalAnimate($formRegister, $formLogin);
    $('#register_username').val("");
    $('#register_password').val("");
    $('#register_email').val("");
  } else {
    toastr["error"]("Account already exists. Please try another one.");
  }
}


function loginResult(lData) {
  if (lData.result) {
    console.log(JSON.stringify(lData));
    toastr["success"]("You are now logged in for this instance.");
    $('#modal-dialog').modal('hide');
    localStorage.setItem(LS_LOGGED_IN, true);
    localStorage.setItem(LS_USERNAME, lData.username);
    localStorage.setItem(LS_PASSWORD, lData.password);
    startWebSocket(mode); // Need to get all room's again
    setLogoutVisibility();
  } else {
    msgChange($('#div-login-msg'), $('#icon-login-msg'), $('#text-login-msg'), "error", "Login failed! Check your username and password.", $msgShowTime);
  }
}


function loggedInUserParamsResult(lData) {
  if (!lData.result) {
    toastr["error"]("You are logged in from another instance, which is forbidden!");
  } else {
    getLoggedInUserStatistics();
  }
}


function commandRunResult(cData) {
  if (cData.boolResult) {
    toastr["success"](cData.command + " is processed successfully.");
    $('#cmdModal').modal('hide');
  } else {
    toastr["error"](cData.command + " processing failed.");
  }
}


function loggedInUserStatisticsResults(uData) {
  // Example: {"name":"Admin","money":79050,"winCount":1,"loseCount":6,"achievements":[{"name":"Starter","description":"Starter's achievement from good start.","icon_name":"achievement_starter"},{"name":"Test achievement","description":"Second achievement","icon_name":"achievement_starter"}]}
  console.log(JSON.stringify(uData));
  $('#userStatsMoney').text(Number(uData.money).currencyFormat(2, '.', ',') + '$');
  $('#userStatsWins').text(uData.winCount);
  $('#userStatsLoses').text(uData.loseCount);
  $('#userXP').text(uData.xp + ' xp');
  let xpLevel = Number(uData.xp);
  var $xpNeededForNextMedalText = $('#xpNeededForNextMedalText');
  $xpNeededForNextMedalText.text('Next medal ' + '+' + uData.xpNeededForNextMedal + 'xp');
  var $loggedInUserMedal = $('#loggedInUserMedal');
  var userStatsMedalsFlexBox = $("#userStatsMedalsFlexBox");
  userStatsMedalsFlexBox.empty();
  if (xpLevel >= 1000) {
    $('#userStatsMedalsTitle').text('You have following medals');
  }
  for (var i = 0; i < uData.havingMedals.length; i++) {
    setMedal('./assets/images/' + uData.havingMedals[i].image + '.png', uData.havingMedals[i].title);
  }

  function setMedal(imgSrc, title) {
    userStatsMedalsFlexBox.append('<div class="p-2">' + '<figure>' + '<img style="width: 30px; height: 60px;"' +
      'src="' + imgSrc + '">' + '<figcaption>' + title +
      '</figcaption>' + '</figure>' + '</div>');
    $loggedInUserMedal.attr('src', imgSrc);
  }
}


function getRankingsResult(responseCode, rData) {
  console.log(JSON.stringify(rData));
  if (Number(responseCode) === 200) {
    let l = rData.length;
    var $rankingListGroup = $('#rankingListGroup');
    $rankingListGroup.empty();
    for (var i = 0; i < l; i++) {
      $rankingListGroup.append(
        '<button class="list-group-item list-group-item-action">' +
        '<div class="d-flex flex-row">' +
        '<div class="p-2" style="margin-left: -10px;">' +
        '<img  src="' + loadMedalImage(rData[i].icon) + '" style="width: 25px; height: 50px;">' +
        '</div>' +
        '<div class="p-2" style="margin-left: -10px; width: 150px;">' +
        '<div class="grid" style="margin-left: 30px;"> <div class="row"> <b>' + rData[i].name + '</b>' +
        '</div> <div class="row"> <label>' + rData[i].xp + ' xp</label> </div> </div> ' +
        '</div>' +
        '<div class="p-2">' +
        '<div class="container">' +
        '<div class="row">' +
        '<div class="col-md-8">' +
        '<h6>Wins <span class="badge badge-secondary">' + rData[i].win_count + '</span></h6>' +
        '</div>' +
        '<div class="col-md-8">' +
        '<h6>Losses <span class="badge badge-secondary">' + rData[i].lose_count + '</span></h6>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</button>'
      );
    }
  } else {
    toastr["Info"]("Unspecified error while retrieving rankings");
  }

  function loadMedalImage(iconName) {
    return './assets/images/' + iconName + '.png';
  }
}


// Notify front end of gaining more xp
function onXPGained(responseCode, xData) {
  if (Number(responseCode) === 200) {
    toastr["info"]("+" + xData.xpGainedAmount + "XP gained due " + xData.xpMessage);
  }
}


// Show incoming message straight on UI
function clientMessage(cData) {
  toastr["info"](cData.message);
}


// AutoPlay action result parser
function autoPlayActionResult(aData) {
  //console.log(JSON.stringify(aData)); // {"action":"bot_call","amount":0}
  console.log("AutoPlay action: " + aData.action);
  switch (aData.action) {
    case 'bot_fold':
      foldBtnClick();
      break;
    case 'bot_check':
      checkBtnClick();
      break;
    case 'bot_call':
      checkBtnClick();
      break;
    case 'bot_raise':
      setRaise(aData.amount);
      break;
    case 'remove_bot': // Bot run out of money
      location.reload(); // Run out of money basically
      break;
    default:
      checkBtnClick();
      break;
  }
  autoPlayCommandRequested = false; // reset always
}


// Backend want's to run collect chips to pot animation
function collectChipsToPotAction(cData) {
  //toastr["info"]("Collect chips action call");
  if (enableSounds) {
    playCollectChipsToPot.play();
  }
  for (var i = 0; i < players.length; i++) {
    if (players[i].playerTotalBet > 0) {
      players[i].playerSeat.seatCollectChipsToPot();
    }
  }
}


// Draw morris chart of player statistics
function getPlayerChartDataResult(cData) {
  //console.log(JSON.stringify(cData));
  // [{"money":3588,"win_count":1993,"lose_count":2572},{"money":3688,"win_count":1994,"lose_count":2572},..
  // Init chart views
  let playerMoneyChart = $('#playerMoneyChart');
  playerMoneyChart.empty();
  playerMoneyChart.css('height', 200);
  let playerWinLoseChart = $('#playerWinLoseChart');
  playerWinLoseChart.empty();
  playerWinLoseChart.css('height', 200);
  // Fetch data
  let moneyData = [];
  let winLoseData = [];
  let moneyMinVal = null, moneyMaxVal = null, winLoseMinVal = null, winLoseMaxVal = null;
  for (let i = 0; i < cData.length; i++) {
    moneyData.push({id: i, money: cData[i].money});
    winLoseData.push({id: i, win_count: cData[i].win_count, lose_count: cData[i].lose_count});
    if (i === 0) {
      moneyMinVal = cData[i].money;
      moneyMaxVal = cData[i].money;
      winLoseMinVal = cData[i].win_count;
      winLoseMaxVal = cData[i].lose_count;
    }
    moneyMinVal = (moneyMinVal > cData[i].money ? cData[i].money : moneyMinVal);
    moneyMaxVal = (moneyMaxVal < cData[i].money ? cData[i].money : moneyMaxVal);
    winLoseMinVal = (winLoseMinVal > cData[i].win_count ? cData[i].win_count : winLoseMinVal);
    winLoseMinVal = (winLoseMinVal > cData[i].lose_count ? cData[i].lose_count : winLoseMinVal);
    winLoseMaxVal = (winLoseMaxVal < cData[i].win_count ? cData[i].win_count : winLoseMaxVal);
    winLoseMaxVal = (winLoseMaxVal < cData[i].lose_count ? cData[i].lose_count : winLoseMaxVal);
  }
  // Draw
  new Morris.Line({
    element: 'playerMoneyChart',
    data: moneyData,
    xkey: 'id',
    ykeys: ['money'],
    labels: ['Money'],
    resize: true,
    parseTime: false,
    ymin: moneyMinVal,
    ymax: moneyMaxVal,
  });
  new Morris.Line({
    element: 'playerWinLoseChart',
    data: winLoseData,
    xkey: 'id',
    ykeys: ['win_count', 'lose_count'],
    labels: ['Wins', 'Losses'],
    resize: true,
    parseTime: false,
    ymin: winLoseMinVal,
    ymax: winLoseMaxVal,
    lineColors: ['#0b62a4', '#c10039']
  });
}


// ------------------------------------------------------------------------------------
/* Helper methods */

// Sleep promise
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


var currentRoomFilter = 'all';

function setActiveFilterPill(id) {
  $('.lobby-pill').removeClass('lobby-pill-active');
  $('#' + id).addClass('lobby-pill-active');
}

$('#allRB').click(function () {
  currentRoomFilter = 'all';
  setActiveFilterPill('allRB');
  getRooms("all");
});
$('#lowRB').click(function () {
  currentRoomFilter = 'lowBets';
  setActiveFilterPill('lowRB');
  getRooms("lowBets");
});
$('#mediumRB').click(function () {
  currentRoomFilter = 'mediumBets';
  setActiveFilterPill('mediumRB');
  getRooms("mediumBets");
});
$('#highRB').click(function () {
  currentRoomFilter = 'highBets';
  setActiveFilterPill('highRB');
  getRooms("highBets");
});

function disableRoomSortButtons(disable) {
  $('#allRB').attr("disabled", disable);
  $('#lowRB').attr("disabled", disable);
  $('#mediumRB').attr("disabled", disable);
  $('#highRB').attr("disabled", disable);
}

function audioCommand(aData) {
  //console.log("AUDIO COMMAND " + JSON.stringify(aData));
  if (enableSounds) {
    switch (aData.command) {
      case 'fold':
        playCardFoldOne.play();
        break;
      case 'check':
        playCheckSound.play();
        break;
      case 'call':
        playCardPlaceChipsOne.play();
        break;
      case 'raise':
        playCardPlaceChipsOne.play();
        break;
    }
  }
}


function checkSocketStatus() {
  if (webSocket.status == webSocket.OPENED) {
    return true;
  } else {
    webSocketError();
    return false;
  }
}

function webSocketError() {
  toastr["error"]("Communication error! Socket state: " + webSocket.status);
}

// ------------------------------------------------------------------------------------
