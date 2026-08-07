/* Require components */
var mode = false; // false = Producción (Railway). El toggle "Connection" en la UI lo puede pasar a Dev manualmente.
var autoCheckInterval = null;
var playerNickname = "Anon" + Math.floor(Math.random() * 1000);
var room = new Room();
players = [];


// Wait for document to fully load
$(document).ready(function () {
  startApp();
});


// Start app
function startApp() {
  initSettingButtons();
  if (verifyAsyncSupport()) {
    if (enableSounds) {
      playCardOpenPackage.play();
    }
    setupSeats();
    initRoom();
    startWebSocket(mode);
    document.addEventListener('keyup', keyCommands, false);
    //debugCheck();
  }
}

// Vistas separadas Lobby/Mesa: oculta la mesa y vuelve a mostrar el modal
// del lobby. El "mostrar mesa" pasa en webSocket.js, en el punto donde ya
// se confirma que el jugador se sentó (selectSeat) — acá solo el camino
// inverso, para el botón "Volver al Lobby".
function backToLobby() {
  var tableView = document.getElementById('tableView');
  if (tableView) {
    tableView.classList.remove('view-active');
    tableView.classList.add('view-hidden');
  }
  ROOM_ID = -1;
  $('#selectRoomModal').modal('show');
  getRooms(currentRoomFilter || 'all');
}


// ------------------------------------------------------------------------------
/* User buttons */

function foldBtnClick() {
  if (actionButtonsEnabled) {
    setFold();
    actionButtonsEnabled = false;
    disableActionButtons();
    closeRaisePanel();
  }
}

function checkBtnClick() { // Also handles Call
  if (actionButtonsEnabled) {
    for (var i = 0; i < players.length; i++) {
      if (players[i].playerId == CONNECTION_ID) {
        if (players[i].tempBet > 0) {
          toastr["info"]("You have already thrown chips in... raising...");
          setRaise(myRaiseHelper());
        } else {
          setCheck();
        }
      }
    }
    actionButtonsEnabled = false;
    disableActionButtons();
    closeRaisePanel();
  }
}

function raiseBtnClick() {
  if (actionButtonsEnabled) {
    setRaise(myRaiseHelper());
    actionButtonsEnabled = false;
    disableActionButtons();
    closeRaisePanel();
  }
}

// Instantly disables + dims the 3 action buttons the moment the player
// clicks one, so a slow/laggy connection can't make it look like the click
// "did nothing" and invite a double-click. Also arms a 1s safety-timeout:
// if the server never sends back a statusUpdate confirming the turn moved
// on (dropped packet, brief disconnect, etc.), the buttons re-enable
// themselves instead of leaving the player stuck unable to act.
function disableActionButtons() {
  ['foldBtn', 'checkBtn', 'raiseBtn'].forEach(function (id) {
    var btn = document.getElementById(id);
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    }
  });
  if (actionButtonsSafetyTimer) {
    clearTimeout(actionButtonsSafetyTimer);
  }
  actionButtonsSafetyTimer = setTimeout(function () {
    actionButtonsEnabled = true;
    enableActionButtons();
    actionButtonsSafetyTimer = null;
  }, 1000);
}

// Re-enables + un-dims the 3 action buttons. Called both by the safety
// timeout above and by webSocket.js the moment the server actually
// confirms this player's turn (the normal, non-timeout path).
function enableActionButtons() {
  ['foldBtn', 'checkBtn', 'raiseBtn'].forEach(function (id) {
    var btn = document.getElementById(id);
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '';
    }
  });
}

function betTenClick() {
  raiseHelper(10, false);
}

function betTwentyFiveClick() {
  raiseHelper(25, false);
}

function betOneHundredClick() {
  raiseHelper(100, false);
}

function betFiveHundredClick() {
  raiseHelper(500, false);
}

function betAllInClick() {
  raiseHelper(0, true);
}

// Atajos de pot: fijan el monto exacto a apostar (no suman como +10/+25/etc),
// tapeado al maximo de fichas del jugador. No envian la apuesta, solo dejan
// el monto cargado para que el jugador confirme con "Raise".
// Piso legal de la subida: lo que hace falta para igualar (myCallAmount,
// expuesto por webSocket.js) mas al menos una subida minima de mesa
// (currentRoomMinBet). Nunca puede superar lo que el jugador tiene
// disponible — si el stack no alcanza ni para el minimo, el piso pasa a
// ser directamente el all-in.
function legalMinRaise(maxAvailable) {
  var floor = (Number(window.currentMyCallAmount) || 0) + (Number(window.currentRoomMinBet) || 1);
  return Math.min(floor, maxAvailable);
}

function potFractionClick(fraction) {
  for (var i = 0; i < players.length; i++) {
    if (players[i].playerId == CONNECTION_ID && players[i].isPlayerTurn) {
      var pot = Number(window.currentTotalPot) || 0;
      var maxAvailable = players[i].playerMoney + players[i].tempBet; // fichas disponibles para esta apuesta
      var amount = Math.floor(pot * fraction);
      if (amount > maxAvailable) {
        amount = maxAvailable; // guardia de seguridad: nunca mas que el saldo (all-in)
      }
      var floor = legalMinRaise(maxAvailable);
      if (amount < floor) {
        amount = floor; // nunca menos que el minimo legal de esta subida
      }
      players[i].playerTotalBet = players[i].playerTotalBet - players[i].tempBet + amount;
      players[i].playerMoney = maxAvailable - amount;
      players[i].tempBet = amount;
      players[i].setPlayerMoney(players[i].playerMoney);
      players[i].setPlayerTotalBet(players[i].playerTotalBet);
      if (amount >= maxAvailable && maxAvailable > 0) {
        toastr["info"]("All-in (saldo insuficiente para " + Math.round(fraction * 100) + "% del pot)");
      }
      updateRaiseAmountLabel();
    }
  }
}

function potThirdClick() {
  potFractionClick(1 / 3);
}

function potHalfClick() {
  potFractionClick(1 / 2);
}

function potThreeQuarterClick() {
  potFractionClick(3 / 4);
}

function potFullClick() {
  potFractionClick(1);
}

// Slider vertical: mapea 0-100% a [legalMinRaise..maxAvailable] — el 0% de
// la palanca ya es el minimo legal, nunca fichas de menos. Mismo patrón de
// seguridad que potFractionClick — solo carga tempBet, nunca envía la
// apuesta por si solo (eso lo sigue haciendo el botón Raise/Aumentar).
function raiseSliderInput(sliderValue) {
  for (var i = 0; i < players.length; i++) {
    if (players[i].playerId == CONNECTION_ID && players[i].isPlayerTurn) {
      var maxAvailable = players[i].playerMoney + players[i].tempBet;
      var floor = legalMinRaise(maxAvailable);
      var pct = Math.max(0, Math.min(100, Number(sliderValue))) / 100;
      var amount = Math.floor(floor + (maxAvailable - floor) * pct);
      if (amount > maxAvailable) {
        amount = maxAvailable;
      }
      if (amount < floor) {
        amount = floor;
      }
      players[i].playerTotalBet = players[i].playerTotalBet - players[i].tempBet + amount;
      players[i].playerMoney = maxAvailable - amount;
      players[i].tempBet = amount;
      players[i].setPlayerMoney(players[i].playerMoney);
      players[i].setPlayerTotalBet(players[i].playerTotalBet);
    }
  }
  updateRaiseAmountLabel();
}

// "Min" raise: el minimo legal real — lo que hace falta para igualar mas
// una subida minima de mesa (antes esta funcion ignoraba el call y ponia
// solo el minimo de mesa, lo cual podia ser menos de lo que hacia falta
// para igualar — ya corregido, usa el mismo piso que el resto del panel).
function minRaiseClick() {
  for (var i = 0; i < players.length; i++) {
    if (players[i].playerId == CONNECTION_ID && players[i].isPlayerTurn) {
      var maxAvailable = players[i].playerMoney + players[i].tempBet;
      var amount = legalMinRaise(maxAvailable);
      players[i].playerTotalBet = players[i].playerTotalBet - players[i].tempBet + amount;
      players[i].playerMoney = maxAvailable - amount;
      players[i].tempBet = amount;
      players[i].setPlayerMoney(players[i].playerMoney);
      players[i].setPlayerTotalBet(players[i].playerTotalBet);
    }
  }
  updateRaiseAmountLabel();
}

// Refleja el tempBet actual del jugador en la etiqueta al lado del slider,
// dentro del panel de monto — así el numero que ve coincide siempre con lo
// que realmente se va a mandar al apretar "Aumentar".
function updateRaiseAmountLabel() {
  var label = document.getElementById('raiseAmountLabel');
  if (!label) {
    return;
  }
  for (var i = 0; i < players.length; i++) {
    if (players[i].playerId == CONNECTION_ID) {
      label.textContent = players[i].tempBet || 0;
      var slider = document.getElementById('raiseSlider');
      if (slider) {
        var maxAvailable = players[i].playerMoney + players[i].tempBet;
        var floor = legalMinRaise(maxAvailable);
        var range = maxAvailable - floor;
        slider.value = range > 0 ? Math.round(((players[i].tempBet - floor) / range) * 100) : 0;
      }
      return;
    }
  }
}

// Paso 1 del flujo de dos pasos: el "Raise" de la fila principal NO manda
// nada, solo abre el panel de monto (pot-fraction/chips/slider) para elegir
// cuánto — igual que cualquier plataforma real, en vez de mandar de una.
// Arranca ya cargado con el mínimo legal (no en 0), como en cualquier
// plataforma real: nunca se puede ofrecer "aumentar 0".
function openRaisePanel() {
  var panel = document.getElementById('raiseAmountPanel');
  if (panel) {
    panel.classList.remove('view-hidden');
    panel.classList.add('view-active');
    for (var i = 0; i < players.length; i++) {
      if (players[i].playerId == CONNECTION_ID && players[i].isPlayerTurn) {
        var maxAvailable = players[i].playerMoney + players[i].tempBet;
        var floor = legalMinRaise(maxAvailable);
        players[i].playerTotalBet = players[i].playerTotalBet - players[i].tempBet + floor;
        players[i].playerMoney = maxAvailable - floor;
        players[i].tempBet = floor;
        players[i].setPlayerMoney(players[i].playerMoney);
        players[i].setPlayerTotalBet(players[i].playerTotalBet);
      }
    }
    updateRaiseAmountLabel();
  }
}

// Cierra el panel y lo resetea a 0 — se llama tanto después de mandar la
// apuesta real (raiseBtnClick) como cuando el turno del jugador termina
// (para que no quede un monto viejo cargado en la próxima vez que abra).
function closeRaisePanel() {
  var panel = document.getElementById('raiseAmountPanel');
  if (panel) {
    panel.classList.remove('view-active');
    panel.classList.add('view-hidden');
  }
  var slider = document.getElementById('raiseSlider');
  if (slider) {
    slider.value = 0;
  }
  var label = document.getElementById('raiseAmountLabel');
  if (label) {
    label.textContent = '0';
  }
}

function raiseHelper(amount, allIn) {
  for (var i = 0; i < players.length; i++) {
    if (players[i].playerId == CONNECTION_ID && players[i].isPlayerTurn && Number(players[i].playerMoney) > 0) {
      if (!allIn) {
        if (players[i].playerMoney + players[i].tempBet > 0) {
          players[i].playerTotalBet = players[i].playerTotalBet + amount;
          players[i].playerMoney = players[i].playerMoney - amount;
          players[i].tempBet = players[i].tempBet + amount;
          players[i].setPlayerMoney(players[i].playerMoney);
          players[i].setPlayerTotalBet(players[i].playerTotalBet);
          if (enableSounds) {
            playCardPlaceChipsOne.play();
          }
        } else {
          toastr["error"]("Not enough money to raise!");
        }
      } else {
        players[i].playerTotalBet = players[i].playerMoney + players[i].tempBet;
        players[i].tempBet = players[i].playerMoney + players[i].tempBet;
        players[i].playerMoney = 0;
        players[i].setPlayerMoney(players[i].playerMoney);
        players[i].setPlayerTotalBet(players[i].playerTotalBet);
        if (enableSounds) {
          playCardPlaceChipsOne.play();
        }
      }
      updateRaiseAmountLabel();
    }
  }
}

function myRaiseHelper() {
  for (var i = 0; i < players.length; i++) {
    if (players[i].playerId == CONNECTION_ID) {
      const rTempBet = players[i].tempBet;
      players[i].tempBet = 0;
      return rTempBet;
    }
  }
  return 0;
}

// ------------------------------------------------------------------------------

async function reloadDelay() {
  await sleep(500);
  location.reload(); // Reload site with new connection params
}


function forgotPasswordBtn() {
  window.location.href = 'http://www.nitramite.com/contact.html';
}

// ------------------------------------------------------------------------------

// Init's settings buttons and listeners
function initSettingButtons() {
  if (localStorage.getItem(LS_MODE_TOGGLE_STATE) !== null) {
    mode = localStorage.getItem(LS_MODE_TOGGLE_STATE) === 'true';
  }
  $("[name='connection-mode-toggle']").bootstrapSwitch('state', mode, true);
  document.getElementById('devModeWarning').style.display = mode ? 'block' : 'none';
  if (localStorage.getItem(LS_USE_BLACK_CARDS) === null || localStorage.getItem(LS_USE_BLACK_CARDS) === 'undefined') {
    localStorage.setItem(LS_USE_BLACK_CARDS, false);
  }
  $("[name='black-cards-mode-toggle']").bootstrapSwitch('state', localStorage.getItem(LS_USE_BLACK_CARDS) === 'false', true);
  $("[name='auto-check-mode-toggle']").bootstrapSwitch('state', true, true);
  if (localStorage.getItem(LS_USE_PURPLE_TABLE) === null || localStorage.getItem(LS_USE_PURPLE_TABLE) === 'undefined') {
    localStorage.setItem(LS_USE_PURPLE_TABLE, false);
  }
  $("[name='purple-table-mode-toggle']").bootstrapSwitch('state', localStorage.getItem(LS_USE_PURPLE_TABLE) === 'false', true);
  if (!(localStorage.getItem(LS_USE_PURPLE_TABLE) === 'false')) {
    var pokerTable = document.getElementById("pokerTable");
    pokerTable.style.backgroundImage = "url('./assets/images/poker_table_purple.png')";
  }
  $('input[name="connection-mode-toggle"]').on('switchChange.bootstrapSwitch', function (event, state) {
    localStorage.setItem(LS_MODE_TOGGLE_STATE, JSON.stringify(state));
    document.getElementById('devModeWarning').style.display = state ? 'block' : 'none';
    console.log(JSON.stringify(state));
    reloadDelay();
  });
  $('input[name="black-cards-mode-toggle"]').on('switchChange.bootstrapSwitch', function (event, state) {
    localStorage.setItem(LS_USE_BLACK_CARDS, JSON.stringify(state ? false : true));
  });
  $('input[name="auto-check-mode-toggle"]').on('switchChange.bootstrapSwitch', function (event, state) {
    state ? clearInterval(autoCheckInterval) : enableAutoCheck();
  });
  $('input[name="purple-table-mode-toggle"]').on('switchChange.bootstrapSwitch', function (event, state) {
    var pokerTable = document.getElementById("pokerTable");
    if (!state) {
      pokerTable.style.backgroundImage = "url('./assets/images/poker_table_purple.png')";
      localStorage.setItem(LS_USE_PURPLE_TABLE, JSON.stringify(state ? false : true));
    } else {
      pokerTable.style.backgroundImage = "url('./assets/images/poker_table_green.png')";
      localStorage.setItem(LS_USE_PURPLE_TABLE, JSON.stringify(state ? false : true));
    }
  });
}

// ------------------------------------------------------------------------------

function enableAutoCheck() {
  autoCheckInterval = setInterval(function () {
    if (webSocket.readyState == webSocket.OPEN) {
      for (var i = 0; i < players.length; i++) {
        if (players[i].playerId == CONNECTION_ID) {
          if (players[i].isPlayerTurn && !players[i].isCallSituation) {
            checkBtnClick()
          }
        }
      }
    }
  }, 3000)
}

// Key listener for key commands
function keyCommands(e) {
  switch (e.keyCode) {
    case 67: // Check
      if (room.checkBtn.style.visibility === 'visible') {
        checkBtnClick();
      }
      break;
    case 70: // Fold
      if (room.foldBtn.style.visibility === 'visible') {
        foldBtnClick();
      }
      break;
    case 82:
      if (room.raiseBtn.style.visibility === 'visible') {
        raiseBtnClick();
      }
      break;
    case 49:
      if (room.raiseBtn.style.visibility === 'visible') {
        raiseHelper(10, false);
      }
      break;
    case 50:
      if (room.raiseBtn.style.visibility === 'visible') {
        raiseHelper(25, false);
      }
      break;
    case 51:
      if (room.raiseBtn.style.visibility === 'visible') {
        raiseHelper(100, false);
      }
      break;
    case 52:
      if (room.raiseBtn.style.visibility === 'visible') {
        raiseHelper(500, false);
      }
      break;
  }

}


// ------------------------------------------------------------------------------
