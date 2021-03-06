$(function() {
    /* ------------------------------------------
    Miscellaneous Global variables
    (not attached to any specific assets within the game)
    --------------------------------------------*/
    // stores setInterval id of animationLoop which is triggered by setInterval
    var gameLoop;

    /* ------------------------------------------
    Game Canvas
    --------------------------------------------*/
    //this is the same as document.getElementById('canvas');
    var canvas = $('canvas')[0];
    //different browsers support different contexts. All support 2d
    var context = canvas.getContext('2d');

    /* ------------------------------------------
    Paddle
    --------------------------------------------*/

    //declare and draw paddle on screen
    var paddleX = 200;
    var paddleY = 460;

    var paddleWidth = 80;
    var paddleHeight = 10;

    // how many pixels paddle will move over the X-axis
    var paddleDeltaX = 0;
    var paddleDeltaY = 0;
    var paddleSpeedX = 10;
    // Direction in which paddle is moving
    var paddleMove = 'NONE';
    // Test object for paddle 
    var paddle = {
        x: 200,
        y: 460,
        width: 80,
        height: 10,
        deltaX: 0,
        deltaY: 0,
        speedX: 10,
        moveDirection: 'NONE'
    };
    // Direction in which paddle is moving
    paddle.paddleMove = 'NONE';
    paddle.keyLeftPressedDown = false;
    paddle.keyRightPressedDown = false;
    paddle.getTimeRightKeyPressed = new Date();
    paddle.getTimeLeftKeyPressed = new Date();

    // paddle hit counter, keep track how many time ball hit paddle since start of game
    var paddleHitCount = 1;
    // check paddle was hit
    var checkPaddleHit = false;

    function drawPaddle() {
        context.fillRect(paddleX,paddleY,paddleWidth,paddleHeight);
    }

    function movePaddle() {
        if(paddleMove == 'LEFT' && paddle.keyLeftPressedDown && !paddle.keyRightPressedDown) {
            paddleDeltaX = -paddleSpeedX;
        } else if(paddleMove == 'RIGHT' && paddle.keyRightPressedDown && !paddle.keyLeftPressedDown) {
            paddleDeltaX = paddleSpeedX;
        } else {
            paddleDeltaX = 0;
        }

        // If paddle reaches the side of the screen, then don't let it move any further
        if(paddleX + paddleDeltaX < 0 || paddleX + paddleDeltaX + paddleWidth > canvas.width) {
            paddleDeltaX = 0;
        }

        paddleX += paddleDeltaX;
    }

    /* ------------------------------------------
    Ball
    --------------------------------------------*/

    var ball = {
        x: 300,
        y: 300,
        radius: 5,
        deltaX: 0,
        deltaY: 0
    };

    //declare and draw ball on screen
    var ballX = 300;
    var ballY = 300;
    var ballRadius = 5;

    function drawBall() {
        // context.beginPath when you draw primitive shapes
        context.beginPath();

        //Draw arc at center ballX, ballY with radius ballRadius,
        //From 0 to 2xPI radians (full circle)
        context.arc(ballX,ballY,ballRadius,0,Math.PI*2,true);

        //Fill up the path that you just drew
        context.fill();
    }

    // how many pixels ball will move over the X-axis each loop
    var ballDeltaX;
    // how many pixels ball will move over the Y-axis each loop
    var ballDeltaY;

    function moveBall() {
        // First we must check if we will bump into something

        //check ball already hit paddle
        if(checkPaddleHit && ballY < paddleY) {
            checkPaddleHit = false;
        }

        // If top of the ball touches the top then reverse Y direction (move downwards)
        if(ballY + ballDeltaY - ballRadius < 0
            // or if ball collides in Y direction with bricks
            || collisionYWithBricks()) {
            ballDeltaY = -ballDeltaY;
            gameSoundFX.bouncingSound.play();
        }

        // If the bottom of the ball touches the bottom of the screen then end the game
        if(ballY + ballDeltaY + ballRadius > canvas.height) {
            gameSoundFX.diedSound.play();
            endGame();
        }

        // If side of ball touches either side of the wall then reverse X direction
        //left of ball moves too far left - reverse direction to move right
        if((ballX + ballDeltaX - ballRadius < 0) || 
            //or right side of ball moves too far right - reverse direction to move left
            (ballX + ballDeltaX + ballRadius > canvas.width)
            //or if ball colides in X direction with bricks
            || collisionXWithBricks()) {
            ballDeltaX = -ballDeltaX;
            gameSoundFX.bouncingSound.play();
        }

        // If the bottom of ball reaches top of paddle
        if(ballY + ballDeltaY + ballRadius >= paddleY && ballY + ballDeltaY <= paddleY) {
            // and it is positioned between the two ends of the paddle(is on top)
            if(ballX + ballDeltaX + ballRadius >= paddleX && ballX + ballDeltaX - ballRadius <= paddleX + paddleWidth) {
                ballDeltaY = -ballDeltaY;

                //TODO :> decide direction of ball depending on where it hits on the paddle when paddle is not moving and possibly when paddle is moving

                //ability to control where ball goes based on paddle movement
                if(paddleMove == 'LEFT' || paddleMove == 'RIGHT' ) {
                    // if paddle is moving left send ball moving back left if ball is coming from the left - along X-axis
                    if(paddleMove == 'LEFT' && ballDeltaX > 0) {
                        ballDeltaX = -ballDeltaX;
                    } 
                    // if paddle is moving right send ball moving back right if ball is coming from the right - along X-axis
                    else if(paddleMove == 'RIGHT' && ballDeltaX < 0) {
                        ballDeltaX = -ballDeltaX;
                    }

                } else {
                    // if paddle did not move send ball moving in same direction (ie. Coming from R ->  Going to R or L -> L)
                    ballDeltaX = ballDeltaX;
                }
                paddleHitCount++;
                checkPaddleHit = true;
                gameSoundFX.bouncingSound.play();
            }
        }

        //Move the ball
        ballX += ballDeltaX;
        ballY += ballDeltaY;
    }

    /* ------------------------------------------
    Bricks
    --------------------------------------------*/

    //Now lets draw the bricks on top of the game screen
    var bricksPerRow = 8;
    var brickHeight = 20;
    var brickWidth = canvas.width/bricksPerRow;
    var defaultAmountBrickRows = 4;
    //number of different type of bricks from 0,1,2....N
    var numOfBrickType = 5;

    // Brick Layout: 1 is orange, 2 is green, 3 is gray, 0 means no brick
    var bricks = [
        [1,1,1,1,1,1,1,2],
        [1,1,3,1,0,1,1,1],
        [2,1,2,1,2,1,0,1],
        [1,2,1,1,0,3,1,1]
    ];
    function randomlyPopulateBricks() {
        //first clear old brick array
        bricks = [];
        for(var i=0;i<defaultAmountBrickRows;i++) {
            addRowToBricks();
        }
    }

    function addRowToBricks() {
        var tempRowArray = [];
        //randomly generate new row
        for(var j=0;j<bricksPerRow;j++) {
            tempRowArray[j] = Math.floor(Math.random() * numOfBrickType);
        }
        //add randomly generated row to beginning of array (top)
        bricks.unshift(tempRowArray);
    }

    //iterate through the bricks array and draw each brick using drawBrick()
    function createBricks() {
        for(var i=0;i < bricks.length;i++) {
            for(var j=0;j<bricks[i].length;j++) {
                drawBrick(j,i,bricks[i][j]);
            }
        }
    }

    function explodeBrick(i,j) {
        //first weaken the brick (0 means brick has gone)
        bricks[i][j]--;

        if(bricks[i][j]>0) {
            //the brick is weakened but still around. Give a single point.
            score++;
        } else {
            //give player an extra point when the brick disappears
            score += 2;

            gameSoundFX.breakingSound.play();
        }
    }

    //draw a single brick
    function drawBrick(x,y,type) {
        switch(type) { // if brick is sitll visible; three colors for three types of bricks
            case 1: 
                context.fillStyle = 'lightyellow';
                break;
            case 2:
                context.fillStyle = 'rgb(100,200,100)';//'yellow';
                break;
            case 3:
                context.fillStyle = 'rgba(50,100,50,.5)';//orange';
                break;
            case 4:
                context.fillStyle = 'black';//blue';
                break;
            default:
                context.clearRect(x*brickWidth,y*brickHeight,brickWidth,brickHeight);
                break;                            
        }
        if(type){
            //Draw rectangle with fillStyle color selected earlier
            context.fillRect(x*brickWidth,y*brickHeight,brickWidth,brickHeight);
            //Also draw black border around the brick
            context.strokeRect(x*brickWidth+1,y*brickHeight+1,brickWidth-2,brickHeight-2);
        }
    }

    /* ------------------------------------------
    Colision Detection:
    - for bricks
    - for paddle
    - for ball
    --------------------------------------------*/

    // Test side wall collision with bricks
    function collisionXWithBricks() {
        var bumpedX = false;
        for(var i=0; i < bricks.length; i++) 
        {
            for(var j=0; j < bricks[i].length; j++) 
            {
                if(bricks[i][j]) 
                { //if brick is still visible (not 0)
                    var brickX = j*brickWidth;
                    var brickY = i*brickHeight;
                    if(
                        //barely touching from left (checking direction of ball movement L -> R)
                        ((ballX + ballDeltaX + ballRadius) >= brickX) // R position
                        &&
                        (ballX + ballRadius <= brickX) // L position
                        ||
                        //barely touching from right (checking direction of ball movement R -> L)
                        ((ballX + ballDeltaX - ballRadius <= brickX + brickWidth) // L position
                        && 
                        (ballX - ballRadius >= brickX + brickWidth)) // R position
                        ) 
                    {
                        if((ballY + ballDeltaY - ballRadius <= brickY + brickHeight) && (ballY + ballDeltaY + ballRadius >= brickY)) // and is within the boundaries of the bricks side wall
                        {
                            //weaken brick and increase score
                            explodeBrick(i,j);

                            bumpedX = true;
                        }
                    }
                }
            }
        }
        return bumpedX;
    }

    // Test top and bottom wall collision with bricks
    function collisionYWithBricks() {
        var bumpedY = false;
        for(var i=0;i < bricks.length;i++)
        {
            for(var j=0;j < bricks[i].length;j++)
            {
                if(bricks[i][j])
                { //if brick is still visible aka != 0
                    var brickX = j * brickWidth;
                    var brickY = i * brickHeight;
                    if (
                        //barley touching from below, ball is traveling from ground up
                        ((ballY + ballDeltaY - ballRadius <= brickY + brickHeight) //upper position
                            && (ballY - ballRadius >= brickY + brickHeight))  //lower position
                        ||
                        //barely touching from above, ball is traveling from top down
                        ((ballY + ballDeltaY + ballRadius >= brickY) && // lower position
                            (ballY + ballRadius <= brickY)) // upper position
                        )
                    {
                        if(ballX + ballDeltaX + ballRadius >= brickX &&
                            ballX + ballDeltaX - ballRadius <= brickX + brickWidth) //is within boundaries of brick top or bottom walls
                        {
                            //weaken brick and increase score
                            explodeBrick(i,j);
                            bumpedY = true;
                        }
                    }
                }
            }
        }
        return bumpedY;
    }

    /* ------------------------------------------
    Scoreboard
    --------------------------------------------*/

    //Setting up the scoreboard
    var score = 0;

    function displayScoreBoard() {
        //Set the text font and color
        context.fillStyle = 'rgb(50,100,50)';
        context.font = '12px Verdana, Sans-Serif';

        //Clear the bottom 30 pixels of the canvas
        context.clearRect(0,canvas.height-30, canvas.width,30);
        //Write Text 5 pixels from the bottom of the canvas
        context.fillText('Score: '+score,10,canvas.height-5);
    }

    /* ------------------------------------------
    Animation loop
    --------------------------------------------*/

    function animate() {
        //first clear all previous positions of objects drawn on screen
        context.clearRect(0,0,canvas.width,canvas.height);

        // every 10 paddle hits add row of bricks
        if(paddleHitCount % 10 === 0 && checkPaddleHit) {
            addRowToBricks();
        }

        //redraw bricks
        createBricks();

        //redraw scoreboard
        displayScoreBoard();

        //update ball position
        moveBall();
        //update paddle position
        movePaddle();
        //draw new position of ball
        drawBall();
        //draw paddles new position
        drawPaddle();
    }

    /* ------------------------------------------
    Audio
    --------------------------------------------*/
    var gameSoundFX = {};
    gameSoundFX.rootAudioFilePath = 'media/'
    gameSoundFX.bouncingSound = new Audio(gameSoundFX.rootAudioFilePath + "bounce.wav");
    gameSoundFX.breakingSound = new Audio(gameSoundFX.rootAudioFilePath + "break.wav");
    gameSoundFX.diedSound = new Audio(gameSoundFX.rootAudioFilePath + "died.wav");
    gameSoundFX.gameSong = new Audio(gameSoundFX.rootAudioFilePath + "Marching Bands Of Manhattan.mp3");

    gameSoundFX.setGameSoundFXVolume = function (level) {
        console.log(level);
        if(!level) level = 0.5; //if no volume is set make it default level of 0.5
        for(var prop in gameSoundFX) {
            if(gameSoundFX[prop]) {
                gameSoundFX[prop].volume = level  * 0.01;
            }
            //console.log(typeof gameSoundFX[prop].toString() + " -> " + level);
        }
    }

    /* ------------------------------------------
    start game function declaration and definition
    Description:
    - init
    - listen for input
    - run animation loop
    --------------------------------------------*/

    function startGame() {
        // Initialize main game components
        //gameSoundFX.gameSong.play();
        gameSoundFX.gameSong.loop = true;
        ballDeltaY = -8;
        ballDeltaX = -2;
        paddleMove = 'NONE';
        paddleDeltaX = 0;
        // framerate of game
        gameSpeed = 20; //in milliseconds

        // Start Tracking KeyStrokes
        $(document).keydown(function(evt) {

            if(evt.keyCode == 39) { // Right arrow key
                // time right key is pressed
                paddle.getTimeRightKeyPressed = (new Date()).getTime();

                if(paddle.keyLeftPressedDown && paddle.getTimeLeftKeyPressed < paddle.getTimeRightKeyPressed) {
                    paddleMove = 'RIGHT';
                    paddle.keyLeftPressedDown = false;
                }
                paddleMove = 'RIGHT';
                paddle.keyRightPressedDown = true;
            } 
            if (evt.keyCode == 37) { // Left arrow key
                // time left key is pressed
                paddle.getTimeLeftKeyPressed = (new Date()).getTime();

                if(paddle.keyRightPressedDown && paddle.getTimeRightKeyPressed < paddle.getTimeLeftKeyPressed) {
                    paddle.keyRightPressedDown = false;
                }
                paddleMove = 'LEFT';
                paddle.keyLeftPressedDown = true;
            }
            if (evt.keyCode == 13) {
                if(gameLoop == 0) {
                    ballX = 300;
                    ballY = 300;
                    randomlyPopulateBricks();
                    context.fillStyle = '000';
                    //gameSoundFX.gameSong.play();
                    gameLoop = setInterval(animate,gameSpeed);
                }
            }
        });

        $(document).keyup(function(evt) {

            if(evt.keyCode == 39) { // Right arrow key
                paddleMove = 'NONE';
                paddle.keyRightPressedDown = false;
            } 
            if(evt.keyCode == 37) { // Left arrow key
                paddleMove = 'NONE';
                paddle.keyLeftPressedDown = false;
            }
        });

        // Volume Control
        $( "#slider-vertical" ).slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: 100,
        value: 60,
        slide: function( event, ui ) {
            //console.log(event);
            var volumeLevel = ui.value;
            $( "#amount" ).val( ui.value );
            console.log(typeof volumeLevel);
            gameSoundFX.setGameSoundFXVolume(volumeLevel);
        }
        });
        $( "#amount" ).val( $( "#slider-vertical" ).slider( "value" ) );
        //only have mouse control volume control 
        $("#slider-vertical .ui-slider-handle").unbind('keydown');

        // call the animate() function every 20ms (.02 of a second) until the clearInterval(gameloop) is called
        gameLoop = setInterval(animate,gameSpeed);
        
    } 

    /* ------------------------------------------
    End Game 
    --------------------------------------------*/

    function endGame() {
        clearInterval(gameLoop);
        //reset game
        ballDeltaY = -ballDeltaY; //make sure ball always goes up initially
        gameLoop = 0;
        context.fillStyle = 'red';
        context.fillText('Game Over',canvas.width/3,canvas.height/2.5);
        context.fillText('Press Enter to Restart',canvas.width/3,canvas.height/2);
        gameSoundFX.gameSong.pause();
    }

    // init - randomly generate breaks before starting game
    randomlyPopulateBricks();
    // start game
    startGame();

    
});