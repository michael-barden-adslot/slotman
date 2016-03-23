/*jslint browser: true, undef: true, eqeqeq: true, nomen: true, white: true */
/*global window: false, document: false */
var NONE = 4,
    UP = 3,
    LEFT = 2,
    DOWN = 1,
    RIGHT = 11,
    WAITING = 5,
    PAUSE = 6,
    PLAYING = 7,
    COUNTDOWN = 8,
    EATEN_PAUSE = 9,
    DYING = 10,
    Slotman = {};

Slotman.FPS = 30;

Slotman.Ghost = function (game, map, colour, image) {
    var position = null,
        direction = null,
        eatable = null,
        eaten = null,
        due = null;
    
    function getNewCoord(dir, current) {
        var speed  = isVunerable() ? 1 : isHidden() ? 4 : 2,
            xSpeed = (dir === LEFT && -speed || dir === RIGHT && speed || 0),
            ySpeed = (dir === DOWN && speed || dir === UP && -speed || 0);
    
        return {
            'x': addBounded(current.x, xSpeed),
            'y': addBounded(current.y, ySpeed)
        };
    };

    /* Collision detection(walls) is done when a ghost lands on an
     * exact block, make sure they dont skip over it 
     */
    function addBounded(x1, x2) { 
        var rem = x1 % 10, 
            result = rem + x2;
        if (rem !== 0 && result > 10) {
            return x1 + (10 - rem);
        } else if(rem > 0 && result < 0) { 
            return x1 - rem;
        }
        return x1 + x2;
    };
    
    function isVunerable() { 
        return eatable !== null;
    };
    
    function isDangerous() {
        return eaten === null;
    };

    function isHidden() { 
        return eatable === null && eaten !== null;
    };
    
    function getRandomDirection() {
        var moves = (direction === LEFT || direction === RIGHT) ? [UP, DOWN] : [LEFT, RIGHT];
        return moves[Math.floor(Math.random() * 2)];
    };
    
    function reset() {
        eaten = null;
        eatable = null;
        position = {'x': 90, 'y': 80};
        direction = getRandomDirection();
        due = getRandomDirection();
    };
    
    function onWholeSquare(x) {
        return x % 10 === 0;
    };
    
    function oppositeDirection(dir) { 
        return dir === LEFT && RIGHT || dir === RIGHT && LEFT || dir === UP && DOWN || UP;
    };

    function makeEatable() {
        direction = oppositeDirection(direction);
        eatable = game.getTick();
    };

    function eat() { 
        eatable = null;
        eaten = game.getTick();
    };

    function pointToCoord(x) {
        return Math.round(x / 10);
    };

    function nextSquare(x, dir) {
        var rem = x % 10;
        if (rem === 0) { 
            return x; 
        } else if (dir === RIGHT || dir === DOWN) { 
            return x + (10 - rem);
        } else {
            return x - rem;
        }
    };

    function onGridSquare(pos) {
        return onWholeSquare(pos.y) && onWholeSquare(pos.x);
    };

    function secondsAgo(tick) { 
        return (game.getTick() - tick) / Slotman.FPS;
    };

    function getColour() { 
        if (eatable) { 
            if (secondsAgo(eatable) > 5) { 
                return game.getTick() % 20 > 10 ? COLOURS.GHOST_EATABLE_FLASHING : COLOURS.GHOST_EATABLE;
            } else { 
                return COLOURS.GHOST_EATABLE;
            }
        } else if(eaten) { 
            return COLOURS.GHOST_EATEN;
        } 
        return colour;
    };

    function draw(ctx) {
        var s = map.blockSize, 
            top = (position.y/10) * s,
            left = (position.x/10) * s;
    
        if (eatable && secondsAgo(eatable) > 8) {
            eatable = null;
        }
        
        if (eaten && secondsAgo(eaten) > 3) { 
            eaten = null;
        }
        
        var tl = left + s;
        var base = top + s - 3;
        var inc = s / 10;

        var high = game.getTick() % 10 > 5 ? 3  : -3;
        var low  = game.getTick() % 10 > 5 ? -3 : 3;

        ctx.fillStyle = getColour();
        ctx.beginPath();

        ctx.moveTo(left, base);

        ctx.quadraticCurveTo(left, top, left + (s/2),  top);
        ctx.quadraticCurveTo(left + s, top, left+s,  base);
        
        // Wavy things at the bottom
        ctx.quadraticCurveTo(tl-(inc*1), base+high, tl - (inc * 2),  base);
        ctx.quadraticCurveTo(tl-(inc*3), base+low, tl - (inc * 4),  base);
        ctx.quadraticCurveTo(tl-(inc*5), base+high, tl - (inc * 6),  base);
        ctx.quadraticCurveTo(tl-(inc*7), base+low, tl - (inc * 8),  base); 
        ctx.quadraticCurveTo(tl-(inc*9), base+high, tl - (inc * 10), base); 

        ctx.closePath();
        ctx.fill();

        if (image != null)
        {
            ctx.drawImage(image, left, top, s, s);
        } else {
            

            ctx.beginPath();
            ctx.fillStyle = COLOURS.GHOST_EYES;
            ctx.arc(left + 6,top + 6, s / 6, 0, 300, false);
            ctx.arc((left + s) - 6,top + 6, s / 6, 0, 300, false);
            ctx.closePath();
            ctx.fill();

            var f = s / 12;
            var off = {};
            off[RIGHT] = [f, 0];
            off[LEFT] = [-f, 0];
            off[UP] = [0, -f];
            off[DOWN] = [0, f];

            ctx.beginPath();
            ctx.fillStyle = COLOURS.GHOST_EYES_PUPILS;
            ctx.arc(left+6+off[direction][0], top+6+off[direction][1], s / 15, 0, 300, false);
            ctx.arc((left+s)-6+off[direction][0], top+6+off[direction][1], s / 15, 0, 300, false);
            ctx.closePath();
            ctx.fill();
        }

    };

    function pane(pos) {
        if (pos.y === 100 && pos.x >= 190 && direction === RIGHT) {
            return {'y': 100, 'x': -10};
        }
        if (pos.y === 100 && pos.x <= -10 && direction === LEFT) {
            return position = {'y': 100, 'x': 190};
        }

        return false;
    };
    
    function move(ctx) {
        var oldPos = position,
            onGrid = onGridSquare(position),
            npos = null;
        
        if (due !== direction) {
            npos = getNewCoord(due, position);
            if (onGrid && map.isFloorSpace({
                    'y':pointToCoord(nextSquare(npos.y, due)),
                    'x':pointToCoord(nextSquare(npos.x, due))}) ) {
                direction = due;
            } else {
                npos = null;
            }
        }
        
        if (npos === null) {
            npos = getNewCoord(direction, position);
        }
        
        if (onGrid &&
            map.isWallSpace({
                'y' : pointToCoord(nextSquare(npos.y, direction)),
                'x' : pointToCoord(nextSquare(npos.x, direction))
            })) {
            
            due = getRandomDirection();            
            return move(ctx);
        }

        position = npos;        
        
        var tmp = pane(position);
        if (tmp) { 
            position = tmp;
        }
        
        due = getRandomDirection();
        
        return {
            'new' : position,
            'old' : oldPos
        };
    };
    
    return {
        'eat' : eat,
        'isVunerable' : isVunerable,
        'isDangerous' : isDangerous,
        'makeEatable' : makeEatable,
        'reset' : reset,
        'move' : move,
        'draw' : draw
    };
};

Slotman.User = function (game, map) {
    var position = null,
        direction = null,
        eaten = null,
        due = null, 
        lives = null,
        score = 5,
        keyMap = {};
    
    keyMap[KEY.ARROW_LEFT] = LEFT;
    keyMap[KEY.ARROW_UP] = UP;
    keyMap[KEY.ARROW_RIGHT] = RIGHT;
    keyMap[KEY.ARROW_DOWN] = DOWN;

    function addScore(nScore) { 
        score += nScore;
        if (score >= 10000 && score - nScore < 10000) { 
            lives += 1;
        }
    };

    function theScore() { 
        return score;
    };

    function loseLife() { 
        lives -= 1;
    };

    function getLives() {
        return lives;
    };

    function initUser() {
        score = 0;
        lives = 3;
        newLevel();
    }
    
    function newLevel() {
        resetPosition();
        eaten = 0;
    };
    
    function resetPosition() {
        position = {'x': 90, 'y': 120};
        direction = LEFT;
        due = LEFT;
    };
    
    function reset() {
        initUser();
        resetPosition();
    };        
    
    function keyDown(e) {
        if (typeof keyMap[e.keyCode] !== 'undefined') { 
            due = keyMap[e.keyCode];
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        return true;
    };

    function getNewCoord(dir, current) {   
        return {
            'x': current.x + (dir === LEFT && -2 || dir === RIGHT && 2 || 0),
            'y': current.y + (dir === DOWN && 2 || dir === UP    && -2 || 0)
        };
    };

    function onWholeSquare(x) {
        return x % 10 === 0;
    };

    function pointToCoord(x) {
        return Math.round(x/10);
    };
    
    function nextSquare(x, dir) {
        var rem = x % 10;
        if (rem === 0) { 
            return x; 
        } else if (dir === RIGHT || dir === DOWN) { 
            return x + (10 - rem);
        } else {
            return x - rem;
        }
    };

    function next(pos, dir) {
        return {
            'y' : pointToCoord(nextSquare(pos.y, dir)),
            'x' : pointToCoord(nextSquare(pos.x, dir)),
        };                               
    };

    function onGridSquare(pos) {
        return onWholeSquare(pos.y) && onWholeSquare(pos.x);
    };

    function isOnSamePlane(due, dir) { 
        return ((due === LEFT || due === RIGHT) &&  (dir === LEFT || dir === RIGHT)) || ((due === UP || due === DOWN) && (dir === UP || dir === DOWN));
    };

    function move(ctx) {
        var npos = null, 
            nextWhole = null, 
            oldPosition = position,
            block = null;
        
        if (due !== direction) {
            npos = getNewCoord(due, position);
            if (isOnSamePlane(due, direction) || 
                (onGridSquare(position) && 
                 map.isFloorSpace(next(npos, due)))) {
                direction = due;
            } else {
                npos = null;
            }
        }

        if (npos === null) {
            npos = getNewCoord(direction, position);
        }
        
        if (onGridSquare(position) && map.isWallSpace(next(npos, direction))) {
            direction = NONE;
        }

        if (direction === NONE) {
            return {'new' : position, 'old' : position};
        }
        
        if (npos.y === 100 && npos.x >= 190 && direction === RIGHT) {
            npos = {'y': 100, 'x': -10};
        }
        
        if (npos.y === 100 && npos.x <= -12 && direction === LEFT) {
            npos = {'y': 100, 'x': 190};
        }
        
        position = npos;        
        nextWhole = next(position, direction);
        
        block = map.block(nextWhole);        
        
        if ((isMidSquare(position.y) || isMidSquare(position.x)) &&
            block === Slotman.BISCUIT || block === Slotman.PILL) {
            
            map.setBlock(nextWhole, Slotman.EMPTY);           
            addScore((block === Slotman.BISCUIT) ? 10 : 50);
            eaten += 1;
            
            if (eaten === 182) {
                game.completedLevel();
            }
            
            if (block === Slotman.PILL) { 
                game.eatenPill();
            }
        }   
                
        return {
            'new' : position,
            'old' : oldPosition
        };
    };

    function isMidSquare(x) { 
        var rem = x % 10;
        return rem > 3 || rem < 7;
    };

    function calcAngle(dir, pos) { 
        if (dir == RIGHT && (pos.x % 10 < 5)) {
            return {'start':0.25, 'end':1.75, 'direction': false};
        } else if (dir === DOWN && (pos.y % 10 < 5)) { 
            return {'start':0.75, 'end':2.25, 'direction': false};
        } else if (dir === UP && (pos.y % 10 < 5)) { 
            return {'start':1.25, 'end':1.75, 'direction': true};
        } else if (dir === LEFT && (pos.x % 10 < 5)) {             
            return {'start':0.75, 'end':1.25, 'direction': true};
        }
        return {'start':0, 'end':2, 'direction': false};
    };

    function drawDead(ctx, amount) {
        var size = map.blockSize, 
            half = size / 2;

        if (amount >= 1) { 
            return;
        }

        ctx.fillStyle = COLOURS.SLOTMAN;
        ctx.beginPath();        
        ctx.moveTo(((position.x/10) * size) + half, 
                   ((position.y/10) * size) + half);
        
        ctx.arc(((position.x/10) * size) + half, 
                ((position.y/10) * size) + half,
                half, 0, Math.PI * 2 * amount, true); 
        
        ctx.fill();    
    };

    function draw(ctx) { 

        var s = map.blockSize, 
            angle = calcAngle(direction, position);

        ctx.fillStyle = COLOURS.SLOTMAN;

        ctx.beginPath();        

        ctx.moveTo(((position.x/10) * s) + s / 2,
                   ((position.y/10) * s) + s / 2);
        
        ctx.arc(((position.x/10) * s) + s / 2,
                ((position.y/10) * s) + s / 2,
                s / 2, Math.PI * angle.start, 
                Math.PI * angle.end, angle.direction); 
        
        ctx.fill();    
    };
    
    initUser();

    return {
        'draw' : draw,
        'drawDead' : drawDead,
        'loseLife' : loseLife,
        'getLives' : getLives,
        'score' : score,
        'addScore' : addScore,
        'theScore' : theScore,
        'keyDown' : keyDown,
        'move' : move,
        'newLevel' : newLevel,
        'reset' : reset,
        'resetPosition' : resetPosition
    };
};

Slotman.Map = function (size, biscuitImage) {
    var height = null, 
        width = null, 
        blockSize = size,
        pillSize  = 0,
        map = null;
    
    function withinBounds(y, x) {
        return y >= 0 && y < height && x >= 0 && x < width;
    }
    
    function isWall(pos) {
        return withinBounds(pos.y, pos.x) && map[pos.y][pos.x] === Slotman.WALL;
    }
    
    function isFloorSpace(pos) {
        if (!withinBounds(pos.y, pos.x)) {
            return false;
        }
        var piece = map[pos.y][pos.x];
        return piece === Slotman.EMPTY ||  piece === Slotman.BISCUIT || piece === Slotman.PILL;
    }
    
    function drawWall(ctx) {
        var i, j, p, line;
        
        ctx.strokeStyle = COLOURS.WALL_BLOCK_LINE;
        ctx.lineWidth  = 5;
        ctx.lineCap = 'round';
        
        for (i = 0; i < Slotman.WALLS.length; i += 1) {
            line = Slotman.WALLS[i];
            ctx.beginPath();

            for (j = 0; j < line.length; j += 1) {
                p = line[j];
                
                if (p.move) {
                    ctx.moveTo(p.move[0] * blockSize, p.move[1] * blockSize);
                } else if (p.line) {
                    ctx.lineTo(p.line[0] * blockSize, p.line[1] * blockSize);
                } else if (p.curve) {
                    ctx.quadraticCurveTo(p.curve[0] * blockSize, 
                                         p.curve[1] * blockSize,
                                         p.curve[2] * blockSize, 
                                         p.curve[3] * blockSize);   
                }
            }
            ctx.stroke();
        }
    }
    
    function reset() {       
        map    = Slotman.MAP.clone();
        height = map.length;
        width  = map[0].length;        
    };

    function block(pos) {
        return map[pos.y][pos.x];
    };
    
    function setBlock(pos, type) {
        map[pos.y][pos.x] = type;
    };

    function drawPills(ctx) {
        if (++pillSize > 30) {
            pillSize = 0;
        }
        
        for (i = 0; i < height; i += 1) {
            for (j = 0; j < width; j += 1) {
                if (map[i][j] === Slotman.PILL) {

                    ctx.beginPath();
                    ctx.fillStyle = COLOURS.PILL_BLOCK_BG;
                    ctx.fillRect((j * blockSize), (i * blockSize), blockSize, blockSize);
                    ctx.closePath();

                    intensity = Math.sin(Math.PI * pillSize / 30); // use sin curve based on changing size to produce "throb"
                    itterationBlockSize = intensity * blockSize
                    ctx.drawImage(biscuitImage,
                                    (j * blockSize) + itterationBlockSize / 2,
                                    (i * blockSize) + itterationBlockSize / 2,
                                    blockSize - itterationBlockSize,
                                    blockSize - itterationBlockSize)
                }
            }
        }
    };
    
    function draw(ctx) {
        var i, j, size = blockSize;

        ctx.fillStyle = COLOURS.WALL_BLOCK_BG;
        ctx.fillRect(0, 0, width * size, height * size);

        drawWall(ctx);
        
        for (i = 0; i < height; i += 1) {
            for (j = 0; j < width; j += 1) {
                drawBlock(i, j, ctx);
            }
        }
    };
    
    function drawBlock(y, x, ctx) {
        var layout = map[y][x];
        if (layout === Slotman.PILL) {
            return;
        }

        ctx.beginPath();
        
        if (layout === Slotman.EMPTY || layout === Slotman.BLOCK || 
            layout === Slotman.BISCUIT) {
            
            ctx.fillStyle = COLOURS.BLOCK_BG;
            ctx.fillRect((x * blockSize), (y * blockSize), 
                         blockSize, blockSize);

            if (layout === Slotman.BISCUIT) {
                ctx.fillStyle = COLOURS.BISCUIT;
                ctx.fillRect((x * blockSize) + (blockSize / 2.5), 
                             (y * blockSize) + (blockSize / 2.5), 
                             blockSize / 6, blockSize / 6);
            }
        }
        ctx.closePath();     
    };

    reset();
    
    return {
        'draw'         : draw,
        'drawBlock'    : drawBlock,
        'drawPills'    : drawPills,
        'block'        : block,
        'setBlock'     : setBlock,
        'reset'        : reset,
        'isWallSpace'  : isWall,
        'isFloorSpace' : isFloorSpace,
        'height'       : height,
        'width'        : width,
        'blockSize'    : blockSize
    };
};

var SLOTMAN = (function () {
    var state        = WAITING,
        ghosts = [],
        ghostSpecs = ['#00FFDE', '#FF0000', '#FFB8DE', '#FFB847'],
        ghostImages = ['ian-32.png', 'jc-32.png', 'robyn-32.png', 'jr-32.png'],
        eatenCount   = 0,
        level        = 0,
        tick         = 0,
        ghostPos, userPos, 
        stateChanged = true,
        timerStart   = null,
        lastTime     = 0,
        ctx          = null,
        timer        = null,
        map          = null,
        user         = null,
        stored       = null;

    function getTick() { 
        return tick;
    };

    function drawScore(text, position) {
        ctx.fillStyle = COLOURS.SCORE_TEXT;
        ctx.font = 'bold 14px Roboto';
        ctx.fillText(text, 
                    (position['new']['x'] / 10) * map.blockSize, 
                    ((position['new']['y'] + 17) / 10) * map.blockSize);
    }
    
    function dialog(text) {




        var width = ctx.measureText(text).width,
            x = ((map.width * map.blockSize) - width) / 2;

        // todo : fill rect here for subtitle

        ctx.fillStyle = COLOURS.DIALOG_BG;
        ctx.fillRect(x, (map.height * 10) - 5, width, 16);

        ctx.fillStyle = COLOURS.DIALOG_TEXT;
        ctx.font = 'bold 16px Roboto';
        ctx.fillText(text, x, (map.height * 10) + 8);
    }
    
    function startLevel() {        
        user.resetPosition();
        for (var i = 0; i < ghosts.length; i += 1) { 
            ghosts[i].reset();
        }
        timerStart = tick;
        setState(COUNTDOWN);
    }    

    function startNewGame() {
        setState(WAITING);
        level = 1;
        user.reset();
        map.reset();
        map.draw(ctx);
        startLevel();
    }

    function keyDown(e) {
        if (e.keyCode === KEY.N) {
            startNewGame();
        } else if (e.keyCode === KEY.P && state === PAUSE) {
            map.draw(ctx);
            setState(stored);
        } else if (e.keyCode === KEY.P) {
            stored = state;
            setState(PAUSE);
            map.draw(ctx);
            dialog('Paused');
        } else if (state !== PAUSE) {   
            return user.keyDown(e);
        }
        return true;
    }    

    function loseLife() {        
        setState(WAITING);
        user.loseLife();
        if (user.getLives() > 0) {
            startLevel();
        }
    }

    function setState(nState) { 
        state = nState;
        stateChanged = true;
    };
    
    function collided(user, ghost) {
        return (Math.sqrt(Math.pow(ghost.x - user.x, 2) + Math.pow(ghost.y - user.y, 2))) < 10;
    };

    function drawFooter() {
        var topLeft = (map.height * map.blockSize),
            textBase = topLeft + 20;
        
        ctx.fillStyle = COLOURS.FOOTER_BG;
        ctx.fillRect(0, topLeft, (map.width * map.blockSize), 30);
        
        ctx.fillStyle = COLOURS.SLOTMAN;

        for (var i = 0, len = user.getLives(); i < len; i++) {
            ctx.fillStyle = COLOURS.SLOTMAN;
            ctx.beginPath();
            ctx.moveTo(150 + (25 * i) + map.blockSize / 2, (topLeft+5) + map.blockSize / 2);
            ctx.arc(150 + (25 * i) + map.blockSize / 2, (topLeft+5) + map.blockSize / 2, map.blockSize / 2, Math.PI * 0.25, Math.PI * 1.75, false);
            ctx.fill();
        }

        ctx.fillStyle = COLOURS.FOOTER_TEXT;
        ctx.font = 'bold 16px Roboto';
        ctx.fillText('Score: ' + user.theScore(), 30, textBase);
        ctx.fillText('Level: ' + level, 260, textBase);
    }

    function redrawBlock(pos) {
        map.drawBlock(Math.floor(pos.y/10), Math.floor(pos.x/10), ctx);
        map.drawBlock(Math.ceil(pos.y/10), Math.ceil(pos.x/10), ctx);
    }

    function mainDraw() {
        var diff, u, i, len, nScore;
        
        ghostPos = [];

        for (i = 0, len = ghosts.length; i < len; i += 1) {
            ghostPos.push(ghosts[i].move(ctx));
        }
        u = user.move(ctx);
        
        for (i = 0, len = ghosts.length; i < len; i += 1) {
            redrawBlock(ghostPos[i].old);
        }
        redrawBlock(u.old);
        
        for (i = 0, len = ghosts.length; i < len; i += 1) {
            ghosts[i].draw(ctx);
        }                     
        user.draw(ctx);
        
        userPos = u['new'];
        
        for (i = 0, len = ghosts.length; i < len; i += 1) {
            if (collided(userPos, ghostPos[i]['new'])) {
                if (ghosts[i].isVunerable()) {
                    ghosts[i].eat();
                    eatenCount += 1;
                    nScore = eatenCount * 50;
                    drawScore(nScore, ghostPos[i]);
                    user.addScore(nScore);                    
                    setState(EATEN_PAUSE);
                    timerStart = tick;
                } else if (ghosts[i].isDangerous()) {
                    setState(DYING);
                    timerStart = tick;
                }
            }
        }                             
    };

    function mainLoop() {
        var diff;

        if (state !== PAUSE) { 
            ++tick;
        }

        map.drawPills(ctx);

        if (state === PLAYING) {
            mainDraw();
        } else if (state === WAITING && stateChanged) {            
            stateChanged = false;
            map.draw(ctx);
            dialog('Press N to start a New game');            
        } else if (state === EATEN_PAUSE && (tick - timerStart) > (Slotman.FPS / 3)) {
            map.draw(ctx);
            setState(PLAYING);
        } else if (state === DYING) {
            if (tick - timerStart > (Slotman.FPS * 2)) { 
                loseLife();
            } else { 
                redrawBlock(userPos);
                for (i = 0, len = ghosts.length; i < len; i += 1) {
                    redrawBlock(ghostPos[i].old);
                    ghostPos.push(ghosts[i].draw(ctx));
                }                                   
                user.drawDead(ctx, (tick - timerStart) / (Slotman.FPS * 2));
            }
        } else if (state === COUNTDOWN) {
            diff = 4 + Math.floor((timerStart - tick) / Slotman.FPS);
            
            if (diff === 0) {
                map.draw(ctx);
                setState(PLAYING);
            } else {
                if (diff !== lastTime) { 
                    lastTime = diff;
                    map.draw(ctx);
                    dialog('Starting in: ' + diff);
                }
            }
        } 

        drawFooter();
    }

    function eatenPill() {
        timerStart = tick;
        eatenCount = 0;
        for (i = 0; i < ghosts.length; i += 1) {
            ghosts[i].makeEatable(ctx);
        }        
    };
    
    function completedLevel() {
        setState(WAITING);
        level += 1;
        map.reset();
        user.newLevel();
        startLevel();
    };

    function keyPress(e) { 
        if (state !== WAITING && state !== PAUSE) { 
            e.preventDefault();
            e.stopPropagation();
        }
    };
    
    function loadImage(imageName) {
        if (imageName != null) {
            var image = new Image();
            image.src = imageName;
            return image;
        }
        return;
    }

    function init(wrapper, root) {
        var i, len, ghost,
            blockSize = wrapper.offsetWidth / 19,
            canvas = document.createElement('canvas');
        
        canvas.setAttribute('width', (blockSize * 19) + 'px');
        canvas.setAttribute('height', (blockSize * 22) + 30 + 'px');

        wrapper.appendChild(canvas);



        var adslotImg = loadImage("favicon.png");

        ctx  = canvas.getContext('2d');

        map = new Slotman.Map(blockSize, adslotImg);
        user = new Slotman.User({ 
            'completedLevel' : completedLevel, 
            'eatenPill'      : eatenPill 
        }, map);

        for (i = 0, len = ghostSpecs.length; i < len; i += 1) {
            ghost = new Slotman.Ghost({ 'getTick': getTick }, map, ghostSpecs[i], loadImage(ghostImages[i]));
            ghosts.push(ghost);
        }
        
        map.draw(ctx);
        dialog('Loading ...');
        
        dialog('Press N to Start');
        
        document.addEventListener('keydown', keyDown, true);
        document.addEventListener('keypress', keyPress, true); 
        
        timer = window.setInterval(mainLoop, 1000 / Slotman.FPS);
    };
    
    return {
        'init' : init
    };
    
}());

// Readable keycodes
var KEY = {
    'ARROW_LEFT': 37,
    'ARROW_UP': 38,
    'ARROW_RIGHT': 39,
    'ARROW_DOWN': 40,
    'N': 78,
    'P': 80
};

/*
// Original Colours
var COLOURS = {
    'BLOCK_BG':'#000000',
    'SLOTMAN': '#FFFF00',
    'GHOST_EYES':'#FFFFFF',
    'GHOST_EYES_PUPILS':'#000000',
    'GHOST_EATEN': '#222222',
    'GHOST_EATABLE': '#0000BB',
    'GHOST_EATABLE_FLASHING': '#FFFFFF',
    'WALL_BLOCK_LINE':'#0000FF',
    'WALL_BLOCK_BG':'#000000',
    'BISCUIT':'#FFFFFF',
    'PILL':'#FFFFFF',
    'PILL_BLOCK_BG':'#000000',
    'DIALOG_TEXT':'#FFFF00',
    'FOOTER_BG':'#000000',
    'SCORE_TEXT':'#FFFFFF',
    'FOOTER_TEXT':'#FFFF00'
};
*/

var COLOURS = {
    'BLOCK_BG': '#FFFFFF',
    'DIALOG_BG': '#ff827d', // salmon
    'SLOTMAN': '#ff827d', // salmon
    'GHOST_EYES':'#FFFFFF',
    'GHOST_EYES_PUPILS':'#000000',
    'GHOST_EATEN': '#222222',
    'GHOST_EATABLE': '#0000CC',
    'GHOST_EATABLE_FLASHING': '#D7D7D7',
    'WALL_BLOCK_LINE':'#0171BB',
    'WALL_BLOCK_BG':'#FFFFFF',
    'BISCUIT':'#0171BB',
    'PILL':'#0171BB',
    'PILL_BLOCK_BG':'#FFFFFF',
    'DIALOG_TEXT':'#000000',
    'FOOTER_BG':'#D7D7D7',
    'SCORE_TEXT':'#000000',
    'FOOTER_TEXT':'#0171BB'
};

Slotman.WALL    = 0;
Slotman.BISCUIT = 1;
Slotman.EMPTY   = 2;
Slotman.BLOCK   = 3;
Slotman.PILL    = 4;

Slotman.MAP = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 4, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 4, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
    [2, 2, 2, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 2, 2, 2],
    [0, 0, 0, 0, 1, 0, 1, 0, 0, 3, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    [2, 2, 2, 2, 1, 1, 1, 0, 3, 3, 3, 0, 1, 1, 1, 2, 2, 2, 2],
    [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    [2, 2, 2, 0, 1, 0, 1, 1, 1, 2, 1, 1, 1, 0, 1, 0, 2, 2, 2],
    [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    [0, 4, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 4, 0],
    [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

Slotman.WALLS = [
    
    [{'move': [0, 9.5]}, {'line': [3, 9.5]},
     {'curve': [3.5, 9.5, 3.5, 9]}, {'line': [3.5, 8]},
     {'curve': [3.5, 7.5, 3, 7.5]}, {'line': [1, 7.5]},
     {'curve': [0.5, 7.5, 0.5, 7]}, {'line': [0.5, 1]},
     {'curve': [0.5, 0.5, 1, 0.5]}, {'line': [9, 0.5]},
     {'curve': [9.5, 0.5, 9.5, 1]}, {'line': [9.5, 3.5]}],

    [{'move': [9.5, 1]},
     {'curve': [9.5, 0.5, 10, 0.5]}, {'line': [18, 0.5]},
     {'curve': [18.5, 0.5, 18.5, 1]}, {'line': [18.5, 7]},
     {'curve': [18.5, 7.5, 18, 7.5]}, {'line': [16, 7.5]},
     {'curve': [15.5, 7.5, 15.5, 8]}, {'line': [15.5, 9]},
     {'curve': [15.5, 9.5, 16, 9.5]}, {'line': [19, 9.5]}],

    [{'move': [2.5, 5.5]}, {'line': [3.5, 5.5]}],

    [{'move': [3, 2.5]},
     {'curve': [3.5, 2.5, 3.5, 3]},
     {'curve': [3.5, 3.5, 3, 3.5]},
     {'curve': [2.5, 3.5, 2.5, 3]},
     {'curve': [2.5, 2.5, 3, 2.5]}],

    [{'move': [15.5, 5.5]}, {'line': [16.5, 5.5]}],

    [{'move': [16, 2.5]}, {'curve': [16.5, 2.5, 16.5, 3]},
     {'curve': [16.5, 3.5, 16, 3.5]}, {'curve': [15.5, 3.5, 15.5, 3]},
     {'curve': [15.5, 2.5, 16, 2.5]}],

    [{'move': [6, 2.5]}, {'line': [7, 2.5]}, {'curve': [7.5, 2.5, 7.5, 3]},
     {'curve': [7.5, 3.5, 7, 3.5]}, {'line': [6, 3.5]},
     {'curve': [5.5, 3.5, 5.5, 3]}, {'curve': [5.5, 2.5, 6, 2.5]}],

    [{'move': [12, 2.5]}, {'line': [13, 2.5]}, {'curve': [13.5, 2.5, 13.5, 3]},
     {'curve': [13.5, 3.5, 13, 3.5]}, {'line': [12, 3.5]},
     {'curve': [11.5, 3.5, 11.5, 3]}, {'curve': [11.5, 2.5, 12, 2.5]}],

    [{'move': [7.5, 5.5]}, {'line': [9, 5.5]}, {'curve': [9.5, 5.5, 9.5, 6]},
     {'line': [9.5, 7.5]}],
    [{'move': [9.5, 6]}, {'curve': [9.5, 5.5, 10.5, 5.5]},
     {'line': [11.5, 5.5]}],


    [{'move': [5.5, 5.5]}, {'line': [5.5, 7]}, {'curve': [5.5, 7.5, 6, 7.5]},
     {'line': [7.5, 7.5]}],
    [{'move': [6, 7.5]}, {'curve': [5.5, 7.5, 5.5, 8]}, {'line': [5.5, 9.5]}],

    [{'move': [13.5, 5.5]}, {'line': [13.5, 7]},
     {'curve': [13.5, 7.5, 13, 7.5]}, {'line': [11.5, 7.5]}],
    [{'move': [13, 7.5]}, {'curve': [13.5, 7.5, 13.5, 8]},
     {'line': [13.5, 9.5]}],

    [{'move': [0, 11.5]}, {'line': [3, 11.5]}, {'curve': [3.5, 11.5, 3.5, 12]},
     {'line': [3.5, 13]}, {'curve': [3.5, 13.5, 3, 13.5]}, {'line': [1, 13.5]},
     {'curve': [0.5, 13.5, 0.5, 14]}, {'line': [0.5, 17]},
     {'curve': [0.5, 17.5, 1, 17.5]}, {'line': [1.5, 17.5]}],
    [{'move': [1, 17.5]}, {'curve': [0.5, 17.5, 0.5, 18]}, {'line': [0.5, 21]},
     {'curve': [0.5, 21.5, 1, 21.5]}, {'line': [18, 21.5]},
     {'curve': [18.5, 21.5, 18.5, 21]}, {'line': [18.5, 18]},
     {'curve': [18.5, 17.5, 18, 17.5]}, {'line': [17.5, 17.5]}],
    [{'move': [18, 17.5]}, {'curve': [18.5, 17.5, 18.5, 17]},
     {'line': [18.5, 14]}, {'curve': [18.5, 13.5, 18, 13.5]},
     {'line': [16, 13.5]}, {'curve': [15.5, 13.5, 15.5, 13]},
     {'line': [15.5, 12]}, {'curve': [15.5, 11.5, 16, 11.5]},
     {'line': [19, 11.5]}],

    [{'move': [5.5, 11.5]}, {'line': [5.5, 13.5]}],
    [{'move': [13.5, 11.5]}, {'line': [13.5, 13.5]}],

    [{'move': [2.5, 15.5]}, {'line': [3, 15.5]},
     {'curve': [3.5, 15.5, 3.5, 16]}, {'line': [3.5, 17.5]}],
    [{'move': [16.5, 15.5]}, {'line': [16, 15.5]},
     {'curve': [15.5, 15.5, 15.5, 16]}, {'line': [15.5, 17.5]}],

    [{'move': [5.5, 15.5]}, {'line': [7.5, 15.5]}],
    [{'move': [11.5, 15.5]}, {'line': [13.5, 15.5]}],
    
    [{'move': [2.5, 19.5]}, {'line': [5, 19.5]},
     {'curve': [5.5, 19.5, 5.5, 19]}, {'line': [5.5, 17.5]}],
    [{'move': [5.5, 19]}, {'curve': [5.5, 19.5, 6, 19.5]},
     {'line': [7.5, 19.5]}],

    [{'move': [11.5, 19.5]}, {'line': [13, 19.5]},
     {'curve': [13.5, 19.5, 13.5, 19]}, {'line': [13.5, 17.5]}],
    [{'move': [13.5, 19]}, {'curve': [13.5, 19.5, 14, 19.5]},
     {'line': [16.5, 19.5]}],

    [{'move': [7.5, 13.5]}, {'line': [9, 13.5]},
     {'curve': [9.5, 13.5, 9.5, 14]}, {'line': [9.5, 15.5]}],
    [{'move': [9.5, 14]}, {'curve': [9.5, 13.5, 10, 13.5]},
     {'line': [11.5, 13.5]}],

    [{'move': [7.5, 17.5]}, {'line': [9, 17.5]},
     {'curve': [9.5, 17.5, 9.5, 18]}, {'line': [9.5, 19.5]}],
    [{'move': [9.5, 18]}, {'curve': [9.5, 17.5, 10, 17.5]},
     {'line': [11.5, 17.5]}],

    [{'move': [8.5, 9.5]}, {'line': [8, 9.5]}, {'curve': [7.5, 9.5, 7.5, 10]},
     {'line': [7.5, 11]}, {'curve': [7.5, 11.5, 8, 11.5]},
     {'line': [11, 11.5]}, {'curve': [11.5, 11.5, 11.5, 11]},
     {'line': [11.5, 10]}, {'curve': [11.5, 9.5, 11, 9.5]},
     {'line': [10.5, 9.5]}]
];

Object.prototype.clone = function () {
    var i, newObj = (this instanceof Array) ? [] : {};
    for (i in this) {
        if (i === 'clone') {
            continue;
        }
        if (this[i] && typeof this[i] === 'object') {
            newObj[i] = this[i].clone();
        } else {
            newObj[i] = this[i];
        }
    }
    return newObj;
};