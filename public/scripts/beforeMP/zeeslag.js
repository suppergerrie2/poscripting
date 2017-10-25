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
 * (Integer)
 * The amount of boats spawned in the world.
 * DEFAULT: 5
 **/
var boatCount=5;

/**
 * (Integer)
 * The amount of boats left in the world, when this is 0 the Game Over message is shown.
 * DEFAULT: boatcount
 **/
var boatsLeft = boatCount;

/**
 * (Integer)
 * The amount of guesses the played did, will determine the score
 * DEFAULT: 0
 **/
var guesses = 0;

/**
 * Activated when the site is loaded and we can access the board display
 **/
window.onload = function(){
    //Get all of the squares in the display and store them.
    squares = document.getElementsByClassName("square");
    
    //Create the empty board by looping over every x and creating an empty array and looping over every y and setting the array to 0
    for (let x = 0; x < width; x++) {
        //Create empty array
        board[x]=[];
        for(let y = 0; y < height; y++){
            //Set to 0 so the board is initialized empty
            board[x][y]=0;
        }
    }
    
    //Generate boatCount amount of boats.
    for (let i = 0; i < boatCount; i++) {
        //Place a boat with id i+1.
        placeBoat(i+1, true);
    }
    
    //Add the clickHandler to the squares. The clickHandler will manage the click (:P) and update the board.
    for(let i = 0; i < squares.length; i++){
        squares[i].addEventListener("click", clickHandler);
    }
};

/**
 * The clickhandler gets activated when the player clicked a square,
 * the square's x coordinate is saved as class, the square's y coordinate is a letter
 **/
function clickHandler(e){
    //If this square has a missed class or hit class that means the player already shot this location, we can just return nothing changed.
    if(e.srcElement.classList[3]=="missed"||e.srcElement.classList[3]=="hit"){
        return;
    }
    
    //The y coordinate is a letter and has to be converted to a number
    var y = letterToNumer(e.srcElement.classList[0]);
    //The x coordinate is just a number and doesn't have to be converted from a letter. (but it is saved as a string so we have to parse it to a int)
    var x = parseInt(e.srcElement.classList[1], 10);
    
    //When we got the coordinates whe can attack the location.
    attackLocation(x,y);
}

/**
 * This function is for debugging, when called this will attack every location in a loop and reveal the whole map.
 * Usefull for testing map generation or game over detection. Will probably be removed before release
 **/
function DEBUG_nuke(){
    for (let x = 0; x < width; x++) {
        for(let y = 0; y < height; y++){
            attackLocation(x,y);
        }
    }
}

/**
 * When called this function attacks the location and updates the squares needed, will also notify the player when all of the ships are destroyed.
 **/
function attackLocation(x, y) {
    //Get the square corresponding to this x, y coordinate
    var square = squares[x+y*width];
    //Get the class names of this square.
    var c = square.className;
    
    //Player just tried to attack a location so increase the guesses tag.
    guesses++;
    
    //If the classname contains "missed" or "hit" the player already clicked this square and we can just ignore this.
    if(c.indexOf("missed")==-1&&c.indexOf("hit")==-1){
        //If this is an empty spot we can add "missed" to the classname (this will make the square red)
        if(board[x][y]==0){
            square.className += " missed";
        } else {
            //Else we can get the boats id from the board and get the corresponding boat
            var boat = boats[board[x][y]];
            //We hit it so increment the boat's hits
            boat.hits+=1;
            //Check if the boat is destroyed
            checkBoatDestroyed(boat);
            //If it isn't destroyed we add "hit" to the classname (this will make the square green)
            if(!boat.destroyed){
                squares[x+y*width].className += " hit";
            } else {
                //We can decrement boatsleft because this ship is now destroyed
                boatsLeft--;
                //We now check every square for this boats id and add the destroyed class to the found squares (this makes it black)
                for (let i = 0; i < board.length; i++) {
                    for (let j = 0; j < board[i].length; j++) {
                        if(board[x][y]==board[i][j]){
                            squares[i+j*width].className+=" destroyed";
                        }
                    }
                }
            }
        }
        
        //If there are no boats left we can notify the player, we do this with setTimeout so the webpage can update the color.
        if(boatsLeft==0){
            
            //We need to know how many squares were a boat.
            let totalBoats = 0;
            //So we loop over every boat and add them to the totalBoats.
            for(let b in boats){
                totalBoats+=boats[b].sizeX*boats[b].sizeY;
            }
            
            //Now we calculate the socre, no wrong guesses will output a 1, if you have guessed every location you will have a 0
            let score = 1-(guesses-totalBoats)/(width*height-totalBoats);
            //We then multiply by 10 to get a score from 0 to 10.
            score *= 10;
            
            score = score.toFixed(1);
            
            setTimeout(function(){
                alert("Game Over!\n Your score is: " + score + ".\n Press reset to play again.");
            }, 10);
        }
    }
}

/**
 * This function checks whether a boat is destroyed and sets the destroyed tag.
 **/
function checkBoatDestroyed(boat){
    //var sizeX = boat.sizeX;
    //var sizeY = boat.sizeY;
    /** If boat.sizeX * boat.sizeY is equal to boat.hits every piece of the boat is destroyed.
     * this is true because only one is greater then 1 at a moment, so if we have a boat with a width of 4 it will have a height of 1.
     * It will have to be hit 4 times (4*1) for every piece to be destroyed
     **/
    if(boat.hits==boat.sizeX*boat.sizeY){
        boat.destroyed=true;
    }
}

/**
 * This function converts a letter to a number.
 * This is done by converting to uppercase, then convert that letter to ascii to get a number and then I substract 65.
 * 65 is because 'A' == 65.
 **/
function letterToNumer(letter){
    let n = letter.toUpperCase().charCodeAt();
    return n-65;
}

/**
 * This function places a boat with random length and random location with the given ID
 **/
function placeBoat(id){
    //First generate a random x and y inside the board
    var x = ~~(Math.random()*width);
    var y = ~~(Math.random()*height);

    //Keep generating random x and y until we have an empty spot.
    while(board[x][y]!=0){
        x=~~(Math.random()*7);
        y=~~(Math.random()*7);
    }
    //We start with a sizeX and sizeY of 1
    var sizeX = 1;
    var sizeY = 1;
    
    //We choose whether we expand vertical or horizontal and set sizeX or sizeY to a random integer between 2 and 4.
    if(Math.random()>=0.5){
        sizeX=getRandomInt(2,4);
    } else {
        sizeY=getRandomInt(2,4);
    }
    
    //Then we keep trying to place a boat until we succeed
    while(!tryPlaceBoat(id, x, y, sizeX, sizeY)){
        //if it fails reset the sizes and generate a new random size.
        sizeX=1;
        sizeY=1;
        if(Math.random()>=0.5){
            sizeX=getRandomInt(2,4);
        } else {
            sizeY=getRandomInt(2,4);
        }
        //We do the same for the coords.
        x=~~(Math.random()*7);
        y=~~(Math.random()*7);
        while(board[x][y]!=0){
            x=~~(Math.random()*7);
            y=~~(Math.random()*7);
        }
    }
    
    //We then add the new boat to the boat object and save it with the id.
    boats[id] = {
        destroyed: false,
        sizeX: sizeX,
        sizeY: sizeY,
        hits: 0
    };
    
    //board[x][y]=id;
}

/**
 * This function tries to place a boat with the given id, coords and size.
 * When it succeeds it returns true and when it fails it returns false.
 **/
function tryPlaceBoat(id, x, y, sizeX, sizeY){
    //If the sizeX is bigger then 1 this part of the generator will activate.
    if(sizeX>1){
        //We save the maxX value so we can check if this is outside the board.
        var nX = x + sizeX - 1;
        
        //If it is inside of the board and on an empty place we can try generating.
        if(nX>=0&&nX<width&&board[nX][y]==0){
            //First we check every location whether it is an empty place.
            for (var i = 0; i < sizeX; i++) {
                if(board[x+i][y]!=0){
                    //We return false if we find a taken place.
                    console.warn("Placing failed");
                    return false;
                }
            }
            //We now know every place is free and we can start placing the boat pieces at every location, this is just done by setting the board to id at the coords
            for (var i = 0; i < sizeX; i++) {
                board[x+i][y]=id;
            }
        } else {
            //If the maxX value is outside of the board or on an empty place we can just return false.
            console.warn("Placing failed");
            return false;
        }
    //If the sizeY is bigger then 1 this part of the generator will activate, this is almost the same as the sizeX part but in the y direction.
    } else if(sizeY>1){
         //We save the maxY value so we can check if this is outside the board.
        var nY = y + sizeY - 1;
       
        //If it is inside of the board and on an empty place we can try generating. 
        if(nY>=0&&nY<height&&board[x][nY]==0){
            //First we check every location whether it is an empty place.
           for (var i = 0; i < sizeY; i++) {
                if(board[x][y+i]!=0){
                    //We return false if we find a taken place.
                    console.warn("Placing failed");
                    return false;
                }
            }
            
            //We now know every place is free and we can start placing the boat pieces at every location, this is just done by setting the board to id at the coords
            for (var i = 0; i < sizeY; i++) {
                board[x][y+i]=id;
            }
        } else {
            //If the maxY value is outside of the board or on an empty place we can just return false.
            console.warn("Placing failed");
            return false;
        }
    }
    //If we get here everything went well and we placed the boat so return true.
    return true;
}

/**
 * This function is called by clicking the reset button and will reset the playfield.
 * This will empty the board and place boats
 **/
function reset(){
    //We reset the boatsLeft to boatCount because we are going to replace the boats.
    boatsLeft=boatCount;
    //Loop over every location on the board and set it to 0 to make it empty.
    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            board[x][y]=0;
        }
    }
    
    //Loop over every square and remove the missed, hit and destroyed classes
    for (let i = 0; i < squares.length; i++) {
        //Sometimes the square has multiple destroyed tags so we have to loop over them until they don't have it.
        squares[i].className = squares[i].className.replace(" missed", "").replace(" hit", "").replace(" destroyed", "");
        while(squares[i].className.indexOf("destroyed")!=-1){
            console.log("Test");
            squares[i].className = squares[i].className.replace(" missed", "").replace(" hit", "").replace(" destroyed", "");
        }
    }
    
    //Now we can place boatCount boats.
    for (let i = 0; i < boatCount; i++){    
        placeBoat(i+1, true);
    }
    
    //We will also reset the guesses to 0.
    guesses = 0;
    
}

/**
 * This function generates a random random integer between min and max
 **/
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}