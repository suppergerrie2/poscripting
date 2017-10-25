/* global io */
console.log("Loading zeeslag");

/**
 * Board is stored in here, the board is represented using arrays of integers.
 * An 0 is an empty spot, any other number is the id of the boat at that location
 **/
var board = [];

/**
 * All of the boats are stored in here. Every boat is an object that saves sizeX (int), sizeY (int), hits (int) and destroyed (boolean).
 * SizeX is how big it is on the x-axis, sizeY the same but on the y-axis.
 * Hits is used to save the amount of times the player hit that boat, if it is equal too "sizeX*sizeY" we know every part is hit and the destroyed tag is set to true.
 * Destroyed is used to check whether we should make that part of the board black and if all of the boats are destroyed the Game Over message is shown.
 **/
var boats = {};

/**
 * (Integer)
 * The width and height of the map. (WARNING: The html isn't adapted to the width and height set in here.)
 * DEFAULT:
 *     width: 7
 *     height: 7
 **/
var width = 7;
var height = 7;

/**
 * All of the squares in the table are saved in here. Used to add class names to update the display.
 **/
var squares;

/**
 * All of the squares of the private table are saved here,
 * used to display where you placed your own boats during the game
 **/
var ownSquares;

/**
 * This is the socket used for communicating with the server.
 **/
var socket = io();

/**
 * The playfield (the 7*7 table).
 * This variable is used to enable and disable the playfield in the different playing stages
 **/
var playfield;
/**
 * This is the div that contains the join room and join random room buttons. 
 * This div is deactivated when the user joins a room
 **/
var joinRoomDiv;
/**
 * This div is the waiting room.
 * In the waiting room the amount of players is shown (Eventhough the max is 2)
 * This div is activated when the player joins a room and deactivated when the game starts
 **/
var waitingRoom;

/**
 * Shows the player whether it is his turn or not.
 **/
var turnText;

/**
 * This array contains the boat prefabs the player is gonna place.
 **/
var boatsPrefabs = [];

/**
 * All of the boat prefabs,
 * The contain the size and the id.
 **/
boatsPrefabs.push({
    sizeX: 2,
    sizeY: 1,
    id: 1
});

boatsPrefabs.push({
    sizeX: 3,
    sizeY: 1,
    id: 2
});

boatsPrefabs.push({
    sizeX: 3,
    sizeY: 1,
    id: 3
});

boatsPrefabs.push({
    sizeX: 4,
    sizeY: 1,
    id: 4
});

boatsPrefabs.push({
    sizeX: 5,
    sizeY: 1,
    id: 5
});

/**
 * The boat that is currently being placed.
 **/
var placingBoat;

/**
 * The stage the game is in. Can be multiple values:
 * menu: The game is in this stage when we are in the menu.
 * waiting: The game is in this stage when the player is waiting for another player to join.
 * placing: The game is in this stage when the player is placing boats.
 * ready: The game is in this stage when the player has placed all of his boats and has to wait for the other player to finish.
 * waitForTurn: The game is in this stage when the player has to wait for his turn. 
 * playing: The game is in this stage when the player can gues a location.
 **/
var stage;

/**
 * Activated when the site is loaded and we can access the board display
 **/
window.onload = function() {
    //Get all of the squares in the display and store them.
    squares = document.getElementsByClassName("square");
    
    ownSquares = document.getElementsByClassName("ownSquare");
    
    //Get all of the needed elements from the document.
    playfield = document.getElementById("playfield");
    joinRoomDiv = document.getElementById("joinRoom");
    waitingRoom = document.getElementById("waitingRoom");
    turnText = document.getElementById("turnText");

    //Set the boat to place to the first boat prefab.
    placingBoat = boatsPrefabs[0];

    //Create the empty board by looping over every x and creating an empty array and looping over every y and setting the array to 0
    for(let x = 0; x < width; x++) {
        //Create empty array
        board[x] = [];
        for(let y = 0; y < height; y++) {
            //Set to 0 so the board is initialized empty
            board[x][y] = 0;
        }
    }
    
    //Add the clickHandler to the squares. The clickHandler will manage the click (:P) and update the board.
    for(let i = 0; i < squares.length; i++) {
        squares[i].addEventListener("click", clickHandler);
        squares[i].addEventListener("mouseover", hoverHandler);
    }
    
    //Playfield and waitingroom are invisible when the page is loaded.
    playfield.style.display = "none";
    waitingRoom.style.display = "none";

    /**
     * !!!From here we will add socket events!!!
     * These events will be fired from the server and they will be handled in here.
     **/
     
     
    //The 'newPlayerJoined' event is fired when a new player joins the room, the server also gives the players who are in the room.
    socket.on("newPlayerJoined", function(info) {
        
        //We get the player count by checking the length of the players.
        let count = Object.keys(info.players).length;
        //We then update the HTML to display the new count.
        document.getElementById("playerCount").innerHTML = "<h1>players: " + count + " </h1>";
        //We also make sure the right html divs are shown.
        waitingRoom.style.display = "block";
        joinRoomDiv.style.display = "none";
        //If there are exactly 2 players in the room we can start and we enable the button.
        if(count == 2) {
            document.getElementById("playBtn").style.display = "block";
        }
    });
    
    //The 'roomFull' event is fired when the player tries to join a full room.
    socket.on("roomFull", function() {
        //We update the stage to 'menu'
        stage = "menu";
        //And notify the player.
        alert("This room is already full, try joining another room");
    });
    
    //The 'playerLeft' event is fired when a player leaves the room.
    socket.on("playerLeft", function(info) {
        //We check if we are already waiting. If we aren't waiting we reset the game and notify the player.
        if(stage!="waiting") {
            alert("Other player left, game will reset");
            reset();
        }
        
        //This is not needed because of the check, but just to make sure we set the stage to waiting.
        stage = "waiting";
        
        //We update the player count, this is the same way as in the playerJoinedEvent
        let count = Object.keys(info.players).length - 1;
        document.getElementById("playerCount").innerHTML = "<h1>players: " + count + " </h1>";
        
        //If the playerCount is NOT 2 we disable the button.
        if(count != 2) {
            document.getElementById("playBtn").style.display = "none";
        }

        //We also make sure the correct HTML divs are shown.
        waitingRoom.style.display = "block";
        joinRoomDiv.style.display = "none";
        playfield.style.display = "none";
        
        //Set the placingBoat variable to the first boats prefab.
        placingBoat = boatsPrefabs[0];

        console.log("Player: " + info.leftID + " has left the room!");
    });

    //The 'gameStart' is fired when a player presses the start button.
    socket.on("gameStart", function() {
        //The game stage is set to 'placing'.
        stage = "placing";
        
        //We also enable the playfield and disable the other fields.
        waitingRoom.style.display = "none";
        joinRoomDiv.style.display = "none";
        playfield.style.display = "block";
    });
    
    //The 'startGame' (Not to be confused with the 'gameStart' event) is fired when all of the players are done placing.
    socket.on("startGame", function() {
        //We need to make sure the local player is ready to start.
        if(stage != "ready") {
            console.warn("Invalid stage!");
            return;
        }
        
        //If the player is ready we set the stage to 'waitForTurn', the server will decide who will start.
        stage = "waitForTurn";
        
        //We update the html to notify the player he has to wait.
        turnText.innerHTML = "Please wait for your turn";

        //Create the empty board by looping over every x and creating an empty array and looping over every y and setting the array to 0
        for(let x = 0; x < width; x++) {
            for(let y = 0; y < height; y++) {
                //If the board isn't 0 we set corresponding square on the private board to "boat".
                if(board[x][y]!=0){
                    ownSquares[x+y*width].className+=" boat";
                }
                
                //Set to 0 so the board is empty
                board[x][y] = 0;
            }
        }
        
        //We also remove all of the boats from the attack playfield.
        for(let i = 0; i < squares.length; i++) {
            squares[i].className = squares[i].className.replace(" boat", "");
        }
    });
    
    //The 'hit' event is fired by the server to notify the player whether he has hit or missed the ship.
    socket.on("hit", function(coords) {
        //It sends the coords and a boolean for whether it was hit.
        if(coords.hit == false) {
            //If it wasn't hit we can update the class of the corresponding square with missed.
            squares[coords.x + coords.y * width].className += " missed";
        } else {
            board[coords.x][coords.y] = 1;
            console.log(coords);
            //We also check whether the boat was destroyed or not.
            if(coords.destroyed){
                squares[coords.x + coords.y * width].className += " destroyed";
            } else {
                //Else we set it to hit
                squares[coords.x + coords.y * width].className += " hit";
            }
        }
    });
    
    //The 'won' event is fired by the server to notify the player that he has won.
    socket.on("won", function(id) {
        console.log("WON");
        
        //We stop listening for 'gameOver'
        socket.removeListener("gameOver", gameOver);
        
        //Alert the player
        alert("Good job, you won!\nPress ok to go to the menu.");
        //And reset the game
        reset();
    });
    
    //The 'turn' event is fired when it is the player's turn. The location the other player attacked is also send.
    socket.on("turn", function(b) {
        console.log(stage);
        //We make sure we have data to check
        if(b){
            //We default to missed.
            let className = " missed";
            //If the other player hit a boat we change the classname to hit.
            if(b.hit){
                className = " hit";
            }
            
            //We use the formula "x+y*width" to convert from 2d to 1d.
            //We use the calculated index to get the corresponding square and update his className
            ownSquares[b.x+b.y*width].className+=className;
        }
        //We update the html to show the player it is his turn.
        turnText.innerHTML = "Attack! It is your turn!";
        //And change the stage to playing.
        stage = "playing";
    });
    
    //The 'gameOver' event is fired by the server when the game has ended and you lost
    socket.on("gameOver", gameOver);
    
    //We generate a random roomID
    document.getElementById("joinRoomID").value = randomID(5);
    //And set the gameStage to 'menu'.
    stage = "menu";
};

/**
 * Gets called by clicking the rotate button, this rotates the ship by swapping the sizeX and sizeY values
 **/
function rotateShip(){
    let temp = placingBoat.sizeX;
    placingBoat.sizeX = placingBoat.sizeY;
    placingBoat.sizeY = temp;
}

/**
 * Gets called by clicking the undo button, removes the last placed boat.
 **/
function undo(){
    //Only run when in the placing mode.
    if(stage=="placing"){
        //Get the id of the boat and substract 1 to get the id of the last boat.
        let id = placingBoat.id-1;
        
        //When id is 0 we don't have a placed boat so we can't undo.
        if(id==0){
            return;
        }
        
        //We now update the placingBoat to the last ship.
        placingBoat = boatsPrefabs[id-1];
        console.log(id);
        console.log(placingBoat);
        
        //Loop through every coord on the board and check if it is the correct id.
        for(let x = 0; x < width; x++){
            for(let y = 0; y < height; y++){
                if(board[x][y]==id){
                    //If the id is correct, set it to 0 and remove "boat" from the corresponding classname.
                    board[x][y]=0;
                    squares[x+y*width].className=squares[x+y*width].className.replace("boat", "");
                }
            }
        }
    }
}

/**
 * This function gets called when the 'gameOver' event gets fired
 **/
function gameOver() {
    console.log("GameOver");
    //Notify the player of his loss.
    alert("Too bad, you lost!\nPress ok to go to the menu.");
    //And reset the game
    reset();
}

/**
 * This function gets called when the player presses the start button
 **/
function startGame() {
    console.log("Game has been started!");
    //It emits the 'gameStart' event for the server
    socket.emit("gameStart");
}

/**
 * This function gets called when the player presses one of the join room buttons.
 * A boolean is passed to determine which button was pressed
 **/
function joinRoom(random) {
    //We set the stage to waiting
    stage = "waiting";
    //We check whether the random room button was pressed or the normal button was pressed.
    if(random) {
        //If the random room button is pressed we notify the server we want to join a random room.
        socket.emit("joinRandomRoom");
    } else {
        //Else we get the id and ask the server nicely if we are allowed to join the room.
        var id = document.getElementById("joinRoomID").value;
        socket.emit('joinRoom', id);
    }
}

/**
 * This function generates a randomID of a given length
 **/
function randomID(length) {
    //We start with an empty string
    var s = "";
    for(var i = 0; i < length; i++) {
        //We then decide whether we want a number or letter, and generate a random ascii number and convert to a string.
        if(Math.random() >= 0.5) {
            s += String.fromCharCode(getRandomInt(48, 57));
        } else {
            s += String.fromCharCode(getRandomInt(65, 90));
        }
    }
    return s;
}

/**
 * The clickhandler gets activated when the player clicked a square.
 **/
function clickHandler(e) {
    //Depending on the stage we are in we activate different functions.
    if(stage == "playing") {
        //In the playing stage we call the attackHandler
        attackHandler(e);
    } else if(stage == "placing") {
        //In the placing stage we call the placeHandler
        placeHandler(e);
    } else if(stage != "ready" && stage != "waitForTurn") {
        //IF we are not in the ready or waitforturn stage we log a warning.
        console.warn("Invalid stage in clickhandler. " + stage);
    }
}

/**
 * This function gets called when the player hovers over a square.
 **/
function hoverHandler(e) {
    if(stage == "placing") {
        //The y coordinate is a letter and has to be converted to a number
        var y = letterToNumer(e.srcElement.classList[0]);
        //The x coordinate is just a number and doesn't have to be converted from a letter. (but it is saved as a string so we have to parse it to a int)
        var x = parseInt(e.srcElement.classList[1], 10);
        
        //We make sure the boat doesn't go outside of the playfield.
        if(x + placingBoat.sizeX > width || y + placingBoat.sizeY > height) {
            return;
        }

        //We loop over all of the locations for the boat and make sure there isn't already a boat there.
        for(let xO = 0; xO < placingBoat.sizeX; xO++) {
            for(let yO = 0; yO < placingBoat.sizeY; yO++) {
                let square = squares[(x + xO) + (y + yO) * width];
                if(square.className.indexOf("boat") != -1) {
                    return;
                }
            }
        }
        
        //We add the hoverLeftHandler to the element we are hovering over.
        e.srcElement.onmouseout = hoverLeftHandler;
        //We add the hover class to the element the player is hovering over.
        e.srcElement.className += " hover";

        //We then loop over every location the boat is going to occupy again and set add hover to the classname for every square.
        for(let xO = 0; xO < placingBoat.sizeX; xO++) {
            for(let yO = 0; yO < placingBoat.sizeY; yO++) {
                let square = squares[(x + xO) + (y + yO) * width];
                square.className += " hover";
            }
        }
    } else {
        return;
    }
}

/**
 * This function gets called when the player leaves a square.
 **/
function hoverLeftHandler(e) {
    //We make e our src element. (So we don't have to keep typing e.srcElement)
    if(e.srcElement) {
        e = e.srcElement;
    }
    
    //We remove the onmouseout handler.
    e.onmouseout = undefined;
    //We remove the hover classname
    e.className = e.className.replace(" hover", "");

    //The y coordinate is a letter and has to be converted to a number
    var y = letterToNumer(e.classList[0]);
    //The x coordinate is just a number and doesn't have to be converted from a letter. (but it is saved as a string so we have to parse it to a int)
    var x = parseInt(e.classList[1], 10);
    
    //We loop over every square the boat is going to occupy and remove hover.
    for(let xO = 0; xO < placingBoat.sizeX; xO++) {
        for(let yO = 0; yO < placingBoat.sizeY; yO++) {
            var square = squares[(x + xO) + (y + yO) * width];
            square.className = square.className.replace(" hover", "");
        }
    }

}

/**
 * This function gets called when the player tries to attack
 **/
function attackHandler(e) {
    //If this square has a missed class or hit class that means the player already shot this location, we can just return nothing changed.
    if(e.srcElement.classList[3] == "missed" || e.srcElement.classList[3] == "hit") {
        return;
    }
    
    //We attacked so we have to wait now.
    stage = "waitForTurn";
    //We also update the html to let the player know
    turnText.innerHTML = "Please wait for your turn.";

    //The y coordinate is a letter and has to be converted to a number
    var y = letterToNumer(e.srcElement.classList[0]);
    //The x coordinate is just a number and doesn't have to be converted from a letter. (but it is saved as a string so we have to parse it to a int)
    var x = parseInt(e.srcElement.classList[1], 10);
    
    //We tell the server we attacked and the coords of the square we attacked.
    socket.emit("attack", {
        x: x,
        y: y
    });
}

/**
 * This function gets called when the player tries to place a boat
 **/
function placeHandler(e) {
    //We make sure this square isn't already a boat
    for(var i = 0; i < e.srcElement.classList.length; i++) {
        if(e.srcElement.classList[i] == "boat") {
            return;
        }
    }

    //The y coordinate is a letter and has to be converted to a number
    var y = letterToNumer(e.srcElement.classList[0]);
    //The x coordinate is just a number and doesn't have to be converted from a letter. (but it is saved as a string so we have to parse it to a int)
    var x = parseInt(e.srcElement.classList[1], 10);
    
    //Make sure the boat is inside the board
    if(x + placingBoat.sizeX > width || y + placingBoat.sizeY > height) {
        return;
    }

    //Check every location the boat is gonna occupy to make sure there isn't already a boat
    for(let xO = 0; xO < placingBoat.sizeX; xO++) {
        for(let yO = 0; yO < placingBoat.sizeY; yO++) {
            let square = squares[(x + xO) + (y + yO) * width];
            if(square.className.indexOf("boat") != -1) {
                return;
            }
        }
    }

    //Remove the hover className
    e.srcElement.className = e.srcElement.className.replace(" hover", "");

    //We then add the new boat to the boat object and save it with the id.
    boats[placingBoat.id] = {
        destroyed: false,
        sizeX: placingBoat.sizeX,
        sizeY: placingBoat.sizeY,
        hits: 0
    };
    
    //We set every location the boat is gonna occupy to boat and remove the hover.
    for(let xO = 0; xO < placingBoat.sizeX; xO++) {
        for(let yO = 0; yO < placingBoat.sizeY; yO++) {
            var square = squares[(x + xO) + (y + yO) * width];
            board[x + xO][y + yO] = placingBoat.id;
            square.className += " boat";
            square.className = square.className.replace(" hover", "");
        }
    }
    
    //If we there is another boat to place we update the placingBoat variable
    if(boatsPrefabs[placingBoat.id] != undefined) {
        placingBoat = boatsPrefabs[placingBoat.id];
    } else {
        //Else we create the info object with the boats and board
        var info = {
            boats: boats,
            board: board
        };
        
        //Set the stage to ready
        stage = "ready";
        
        //And sync the board with the server.
        socket.emit("syncBoard", info);
    }
}

/**
 * This function converts a letter to a number.
 * This is done by converting to uppercase, then convert that letter to ascii to get a number and then I substract 65.
 * 65 is because 'A' == 65.
 **/
function letterToNumer(letter) {
    let n = letter.toUpperCase().charCodeAt();
    return n - 65;
}

/**
 * This function resets the game,
 * for now it just reloads the website. 
 * In the future it may reset every variable to its default value and restart
 **/
function reset(){
    window.location.reload();    
}

/**
 * This function generates a random random integer between min and max
 * https://stackoverflow.com/a/1527820
 **/
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}