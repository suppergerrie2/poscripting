//We use express and socket.io to create a game and webserver.
var express = require('express');
var app = express();

var socket = require('socket.io');

//We tell the app to server the "public" folder instad of the root folder.
app.use(express.static('public'));

//Start the server on the port C9 has given us.
var server = app.listen(process.env.PORT, function() {
    //And log to the console.
    console.log('ZeeslagServer listening on port ' + process.env.PORT + '!');
});

//Create a socket with the server.
var io = socket(server);

//On the connection event call the onConnection 
io.sockets.on('connection', onConnection);

//The totalAmount of players online.
var totalAmount = 0;

//The width and height of the playing field.
var width = 7;
var height = 7;

/**
 * This object contains the roomID and the player whose turn it is.
 **/
var roomTurn = {};

/**
 * This function is called when a player connects.
 **/
function onConnection(socket) {
    //We increment the totalAmount variable.
    totalAmount++;
    //We log the totalAmount and the socket id.
    console.log(totalAmount + " New connection, id: " + socket.id);
    //We save the socket in a variable so we can access it later.
    var s = socket;
    //When the socket disconnects we decrease the totalAmount.
    socket.on('disconnect', function() {
        totalAmount--;

        console.log(totalAmount + " User disconnected, id: " + s.id);
    });

    //While the player is disconnecting this event is fired.
    socket.on('disconnecting', function() {
        //We get all of the rooms this socket is in.
        var rooms = s.rooms;
        
        //We loop through every id in the room object.
        for(let id in rooms) {
            //If the id is the same as the socket id we can ignore it.
            if(id == s.id) {
                continue;
            }
            //We remove the playfield from the player.
            s.playfield = undefined;
            //We get all of the players in the room with id "id" and loop through them.
            for(let socketID in io.sockets.adapter.rooms[id].sockets) {
                //If the socketID is the same as the id of the socket leaving we can ignore it.
                if(socketID == s.id) {
                    continue;
                }
                
                //We remove the playfield from the other player.
                io.sockets.sockets[socketID].playfield = undefined;
            }
            
            //Create an object containing the players in the room and the id of the socket leaving.
            let info = {
                players: io.sockets.adapter.rooms[id].sockets,
                leftID: s.id
            };
            
            //And notify the player.
            io.sockets.to(id).emit("playerLeft", info);
        }
    });
    
    //This event is fired when the client wants to join a random room.
    socket.on("joinRandomRoom", function() {
        //We get a random room id with the findRoom() function.
        var id = findRoom();
        //And call the joinRoom functiong with the socket and found id.
        joinRoom(s, id);
    });


    //This event is fired when the client wants to join a room and the player gave an id.
    socket.on('joinRoom', function(roomID) {
        //We get the id when the event is fired so we can call joinRoom right away.
        joinRoom(s, roomID);
    });
    
    //This function is fired when the client is done placing his boats.
    socket.on('syncBoard', function(info) {
        //We set the playfield of the socket to info. Info contains the board and the boats.
        s.playfield = info;
        
        //We get the rooms the socket is in.
        var rooms = s.rooms;

        //We loop through every room the player is in and make sure the rooms id isn't the socket id.
        for(let id in rooms) {
            if(id == s.id) {
                continue;
            }
            
            //We then get all of the players in the rooms and check them.
            for(let socketID in io.sockets.adapter.rooms[id].sockets) {
                //Make sure we don't check yourself.
                if(socketID == s.id) {
                    continue;
                }
                //IF the other player also has a playfield we can start the game.
                if(io.sockets.sockets[socketID].playfield) {
                    //Set the roomTurn variable with the roomID and the socketID.
                    roomTurn[id] = socketID;
                    //Emit the startGame event.
                    io.sockets.to(id).emit("startGame");
                    //And emit the turn event. We get the id to emit to by using the roomTurn object.
                    io.sockets.sockets[roomTurn[id]].emit("turn", undefined);
                }
            }
        }
    });
    
    //The attack event is fired by the client when the client attacks
    socket.on("attack", function(coords) {
        //As always loop trough the rooms and such
        for(let id in s.rooms) {
            if(id == s.id) {
                continue;
            }
            
            //We check whether it is the correct players turn
            if(roomTurn[id] == s.id) {
                //We then have to notify all of the players in the room which coord was attacked.
                for(let socketID in io.sockets.adapter.rooms[id].sockets) {
                    if(socketID == s.id) {
                        continue;
                    }
                    
                    //It is now the other player's turn.
                    roomTurn[id] = socketID;

                    //We create an object with the coords, whether the player hit something and whether he destroyed the boat.
                    let data = {
                        x: coords.x,
                        y: coords.y,
                        hit: false,
                        destroyed: false
                    };
                    
                    //We check whether the player hit a boat, if he hit a boat the board value is not 0
                    if(io.sockets.sockets[socketID].playfield.board[coords.x][coords.y] != 0) {
                        //We set the data value in the data object to true
                        data.hit = true;
                        
                        //Get the boat by first getting the id and then getting the boat from the boat object.
                        let id = io.sockets.sockets[socketID].playfield.board[coords.x][coords.y];
                        let boat = io.sockets.sockets[socketID].playfield.boats[id];
                        //Increment the hits of the boat.
                        io.sockets.sockets[socketID].playfield.boats[id].hits++;
                        
                        /** If boat.sizeX * boat.sizeY is equal to boat.hits every piece of the boat is destroyed.
                         * this is true because only one is greater then 1 at a moment, so if we have a boat with a width of 4 it will have a height of 1.
                         * It will have to be hit 4 times (4*1) for every piece to be destroyed
                         **/
                        if(boat.hits==boat.sizeX*boat.sizeY){
                            //We set the boat and data to destroyed 
                            boat.destroyed=true;
                            data.destroyed=true;
                            //data.boat = boat;
                            
                            //We then check every square on the board to see if there are other parts of the boat and notify the player of the destroyed squares
                            for (let i = 0; i < width; i++) {
                                for (let j = 0; j < height; j++) {
                                    if(id==io.sockets.sockets[socketID].playfield.board[i][j]){
                                        //Emit the hit event with the coords, and set hit and destroyed to true.
                                        s.emit("hit", {x: i, y: j, hit:true, destroyed: true});
                                    }
                                }
                            }
                        } else {
                            //Emit the hit event with the generated data.
                            s.emit("hit", data);
                        }
                    } else {
                        //Again emit the event with the generated data.
                        s.emit("hit", data);
                    }
                    //We also have to check whether the player won. We default to true
                    let won = true;
                    //We get the board from the player.
                 //   let board = io.sockets.sockets[socketID].playfield.board;

                    /*for(let x = 0; x < width; x++) {
                        for(let y = 0; y < width; y++) {
                            if(board[x][y] != 0) {
                                won = false;
                                break;
                            }
                        }
                    }*/
                    
                    //We get all of the boats from the playfield.
                    let boats = io.sockets.sockets[socketID].playfield.boats;
                    
                    //We loop through the boats and get the id
                    for(let id in boats){
                        //If we find a boat that isn't destroyed we know that the player didn't win yet.
                        if(!boats[id].destroyed){
                            won=false;
                            break;
                        }
                    }
                    
                    //We emit the turn event with the data.
                    io.sockets.sockets[socketID].emit("turn", data);
                    
                    //If the player won we emit the won event to the player that won and the gameOver event to all of the players in the room.
                    if(won) {
                        s.emit("won", s.id);
                        io.sockets.to(id).emit("gameOver", s.id);
                    }
                }
            } else {
                console.warn("Player attacked outside of his turn.");
            }
        }
    });
}

/**
 * The joinRoom function is used to join a room.
 * Needs a socket and an id.
 **/
function joinRoom(s, roomID) {
    console.log(s.id + " joined room: " + roomID);
    
    //We try to get the room with the roomID.
    let room = io.sockets.adapter.rooms[roomID];
    //We then check if it already exists and if there are too many players in the room.
    if(room && room.length > 1) {

        console.warn(s.id + " tried joining an already full room");
        //We notify the player that the room is full.
        s.emit("roomFull");

    } else {
        //We add the player to the id object.
        let id = {};
        id[s.id] = true;
        //We join the room.
        s.join(roomID);
        
        //We generate the info object with the new player id and the players id.
        var info = {
            players: id,
            newID: s.id
        };
        
        //We generate the info object with the new player id and get the players from the room.
        if(room && room.length > 0) {
            info = {
                players: io.sockets.adapter.rooms[roomID].sockets,
                newID: s.id
            };
        }
        
        //We emit the newPlayerJoined event with the info.
        io.sockets.to(roomID).emit("newPlayerJoined", info);
    }
    
    //When the gameStart event is fired we call the startGame function
    s.on("gameStart", function() {
        startGame(s);
    });

   /* s.on("saveBoard", function(board) {
        console.log("SAVING BOARD");
        boards[s.id] = board;
    });*/
}

/**
 * this function is called when the player wants to join a random room
 * This room generates an id and checks if it is a full room. If it is it tries again else it returns the id.
 * It also first tries to get a room that is not full yet so players match when another player joins.
 **/
function findRoom() {
    //This variable will store the found room id.
    let validRoom;
    //Get all of the room ids.
    let rooms = Object.keys(io.sockets.adapter.rooms);
    //Loop through the rooms.
    for(let i = 0; i < rooms.length; i++) {
        //Get the room with the id.
        let room = io.sockets.adapter.rooms[rooms[i]];
        //Get the sockets in the room.
        let t = Object.keys(room.sockets);
        
        //IF there is exactly 1 socket in the room.
        if(t.length == 1) {
            //Because a socket creates a room we have to make sure that the socket name isn't the room name.
            if(t[0] != rooms[i]) {
                //We store the room id in the validroom.
                validRoom = rooms[i];
                break;
            }
        }
    }
    
    //If there isn't a room found.
    if(validRoom===undefined){
        //We generate a random room id with 10 characters.
        validRoom=randomID(10);
    }
    //And return the room ID.
    return validRoom;
}

/**
 * This function gets called when the game starts.
 * This makes sure all of the players know the game has started.
 **/
function startGame(s) {
    //We get all of the rooms;
    let rooms = s.rooms;
    for(let id in rooms) {
        //Make sure it isn't the same as the socket id.
        if(id == s.id) {
            continue;
        }
        //And emit the gameStart event.
        io.sockets.to(id).emit("gameStart");
    }
}

/**
 * This function generates an id with a given length.
 * The id can exist of numbers and letters.
 **/
function randomID(length) {
    //We start with an empty string.
    var s = "";
    //We loop for length times.
    for(var i = 0; i < length; i++) {
        //50% chance we get a number and 50% for a letter. We generate a random integer that gets converted to a character
        if(Math.random() >= 0.5) {
            s += String.fromCharCode(getRandomInt(48, 57));
        } else {
            s += String.fromCharCode(getRandomInt(65, 90));
        }
    }
    //We then return the id.
    return s;
}

/**
 * This function generates a random random integer between min and max
 * https://stackoverflow.com/a/1527820
 **/
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}