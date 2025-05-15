enum GameState {
    Running,
    Paused,
    GameOver
}

enum MoveDirection {
    Up = 0,
    Right = 1,
    Down = 2,
    Left = 3
}

const bufferSize = 10;
let accelBufferX: number[] = [];
let accelBufferY: number[] = [];
let accelBufferZ: number[] = [];

let avgX = 0;
let avgY = 0;
let avgZ = 0;

let snake: Array<{ x: number, y: number, directionFrom?: MoveDirection }> = [];
let direction = MoveDirection.Right;
let nextDirection = MoveDirection.Right;
let treat = { x: 0, y: 0 };
let score = 0;
let gameState = GameState.Running;
let moveCounter = 0;
let moveThreshold = 8; //higher is slower

let gameStartTime = 0;
let totalGameTime = 0;
let pauseStartTime = 0;


const MAX_SCORE = 7;

//higher is less sensitive
const HORIZONTAL_THRESHOLD = 130;
const VERTICAL_THRESHOLD = 100;

let lastSentLEDState: number[][] = [];
let lastSentGameState = "";

function calculateSmoothedValue(buffer: number[], minRange: number, maxRange: number): number {
    if (buffer.length === 0) return 0;
    let minVal = 2000, maxVal = -2000;
    for (let v of buffer) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
    }
    if (minVal < minRange * 0.9 || maxVal > maxRange * 0.9) {
        let sum = 0, count = 0;
        for (let i = Math.max(0, buffer.length - 3); i < buffer.length; i++) {
            sum += buffer[i];
            count++;
        }
        return count ? sum / count : 0;
    } else {
        let sum = 0;
        for (let v of buffer) sum += v;
        return buffer.length ? sum / buffer.length : 0;
    }
}

function isFlat(z: number): boolean {
    return z < -800 && z > -1200;
}

function spawnTreat(): void {
    let valid = false;
    while (!valid) {
        let nx = Math.randomRange(0, 4), ny = Math.randomRange(0, 4);
        valid = true;
        for (let seg of snake) {
            if (seg.x == nx && seg.y == ny) {
                valid = false;
                break;
            }
        }
        if (valid) {
            treat.x = nx;
            treat.y = ny;
        }
    }
}

function formatTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const hh = Math.floor((ms % 1000) / 10);
    return `${s}.${hh < 10 ? "0" + hh : hh}`;
}

function getOppositeDirection(d: MoveDirection): MoveDirection {
    switch (d) {
        case MoveDirection.Up: return MoveDirection.Down;
        case MoveDirection.Down: return MoveDirection.Up;
        case MoveDirection.Left: return MoveDirection.Right;
        case MoveDirection.Right: return MoveDirection.Left;
    }
    return d;
}

function determineDirection(): void {
    if (isFlat(avgZ)) return;
    let xDir = 0, yDir = 0;
    if (avgX < -HORIZONTAL_THRESHOLD) xDir = -1;
    else if (avgX > HORIZONTAL_THRESHOLD) xDir = 1;
    if (avgY < -VERTICAL_THRESHOLD) yDir = -1;
    else if (avgY > VERTICAL_THRESHOLD) yDir = 1;
    if (xDir && yDir) {
        const relX = Math.abs(avgX) / HORIZONTAL_THRESHOLD;
        const relY = Math.abs(avgY) / VERTICAL_THRESHOLD;
        if (relX > relY) yDir = 0; else xDir = 0;
    }
    if (xDir < 0) nextDirection = MoveDirection.Left;
    else if (xDir > 0) nextDirection = MoveDirection.Right;
    else if (yDir < 0) nextDirection = MoveDirection.Up;
    else if (yDir > 0) nextDirection = MoveDirection.Down;
    if ((direction == MoveDirection.Up && nextDirection == MoveDirection.Down) ||
        (direction == MoveDirection.Down && nextDirection == MoveDirection.Up) ||
        (direction == MoveDirection.Left && nextDirection == MoveDirection.Right) ||
        (direction == MoveDirection.Right && nextDirection == MoveDirection.Left)) {
        nextDirection = direction;
    }
}

function moveSnake(): void {
    if (gameState != GameState.Running) return;
    direction = nextDirection;
    let newHead = {
        x: snake[0].x,
        y: snake[0].y,
        directionFrom: getOppositeDirection(direction)
    };
    switch (direction) {
        case MoveDirection.Up: newHead.y--; break;
        case MoveDirection.Down: newHead.y++; break;
        case MoveDirection.Left: newHead.x--; break;
        case MoveDirection.Right: newHead.x++; break;
    }
    if (newHead.x < 0) newHead.x = 4;
    if (newHead.x > 4) newHead.x = 0;
    if (newHead.y < 0) newHead.y = 4;
    if (newHead.y > 4) newHead.y = 0;
    for (let i = 0; i < snake.length - 1; i++) {
        if (snake[i].x == newHead.x && snake[i].y == newHead.y) {
            gameOver("COLLISION");
            return;
        }
    }
    snake.unshift(newHead);
    if (newHead.x == treat.x && newHead.y == treat.y) {
        score++;
        if (score >= MAX_SCORE) {
            gameOver("WIN");
            return;
        }
        spawnTreat();
    } else {
        snake.pop();
    }
    for (let i = 1; i < snake.length; i++) {
        const dx = snake[i - 1].x - snake[i].x;
        const dy = snake[i - 1].y - snake[i].y;
        let wrappedDx = dx, wrappedDy = dy;
        if (dx > 1) wrappedDx = -1;
        if (dx < -1) wrappedDx = 1;
        if (dy > 1) wrappedDy = -1;
        if (dy < -1) wrappedDy = 1;
        if (wrappedDx == 1) snake[i].directionFrom = MoveDirection.Left;
        else if (wrappedDx == -1) snake[i].directionFrom = MoveDirection.Right;
        else if (wrappedDy == 1) snake[i].directionFrom = MoveDirection.Up;
        else if (wrappedDy == -1) snake[i].directionFrom = MoveDirection.Down;
    }
}

function gameOver(reason: string): void {
    const finalTime = getGameTime();
    gameState = GameState.GameOver;
    basic.clearScreen();
    if (reason == "WIN") basic.showString("WIN!");
    else basic.showString("LOSE");
    basic.showString("SCORE: " + (score + 1));
    basic.showString("TIME: " + formatTime(finalTime) + "s");
    serial.writeString(JSON.stringify({
        type: "gameOver",
        reason: reason,
        score: score + 1,
        time: formatTime(finalTime)
    }) + "\n");
}

function getGameTime(): number {
    if (gameState == GameState.Running) {
        return totalGameTime + (input.runningTime() - gameStartTime);
    } else {
        return totalGameTime;
    }
}

function resetGame(): void {
    snake = [{ x: 2, y: 2, directionFrom: MoveDirection.Left }];
    direction = MoveDirection.Right;
    nextDirection = MoveDirection.Right;
    score = 0;
    spawnTreat();
    gameState = GameState.Running;
    gameStartTime = input.runningTime();
    totalGameTime = 0;
    pauseStartTime = 0;
    lastSentLEDState = [];
    lastSentGameState = "";
    serial.writeString(JSON.stringify({
        type: "reset",
        state: "running"
    }) + "\n");
}

function getLEDState(): number[][] {
    let m: number[][] = [];
    for (let y = 0; y < 5; y++) {
        m[y] = [0, 0, 0, 0, 0];
    }
    for (let seg of snake) {
        m[seg.y][seg.x] = 1;
    }
    if (input.runningTime() % 600 < 400) {
        m[treat.y][treat.x] = 2;
    }
    return m;
}

function hasLEDStateChanged(n: number[][]): boolean {
    if (lastSentLEDState.length == 0) return true;
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            if (n[y][x] != lastSentLEDState[y][x]) return true;
        }
    }
    return false;
}

function sendLEDState(): void {
    const state = getLEDState();
    const gs = gameState.toString();
    if (hasLEDStateChanged(state) || gs != lastSentGameState) {
        const head = { x: snake[0].x, y: snake[0].y };
        const payload = {
            type: "display",
            matrix: state,
            head: head,
            gameState: gameState,
            score: score,
            time: formatTime(getGameTime())
        };
        serial.writeString(JSON.stringify(payload) + "\n");
        lastSentLEDState = state;
        lastSentGameState = gs;
    }
}

function drawGame(): void {
    basic.clearScreen();
    for (let seg of snake) led.plot(seg.x, seg.y);
    if (input.runningTime() % 600 < 400) led.plot(treat.x, treat.y);
    sendLEDState();
}

function togglePause(): void {
    if (gameState == GameState.Running) {
        gameState = GameState.Paused;
        totalGameTime += (input.runningTime() - gameStartTime);
        pauseStartTime = input.runningTime();
        serial.writeString(JSON.stringify({
            type: "pause",
            state: "paused",
            time: formatTime(totalGameTime)
        }) + "\n");
    } else if (gameState == GameState.Paused) {
        gameState = GameState.Running;
        gameStartTime = input.runningTime();
        serial.writeString(JSON.stringify({
            type: "resume",
            state: "running"
        }) + "\n");
    }
}

input.onButtonPressed(Button.A, () => togglePause());
input.onButtonPressed(Button.B, () => resetGame());

serial.redirectToUSB();
serial.setBaudRate(BaudRate.BaudRate115200);
resetGame();

basic.forever(() => {
    const x = input.acceleration(Dimension.X);
    const y = input.acceleration(Dimension.Y);
    const z = input.acceleration(Dimension.Z);
    accelBufferX.push(x);
    accelBufferY.push(y);
    accelBufferZ.push(z);
    if (accelBufferX.length > bufferSize) {
        accelBufferX.shift();
        accelBufferY.shift();
        accelBufferZ.shift();
    }
    avgX = calculateSmoothedValue(accelBufferX, -2000, 2000);
    avgY = calculateSmoothedValue(accelBufferY, -2000, 2000);
    avgZ = calculateSmoothedValue(accelBufferZ, -2000, 2000);

    determineDirection();

    if (gameState == GameState.Running) {
        moveCounter++;
        if (moveCounter >= moveThreshold) {
            moveCounter = 0;
            moveSnake();
        }
        drawGame();
    } else if (gameState == GameState.Paused) {
        if (input.runningTime() % 1000 < 500) {
            drawGame();
        } else {
            basic.clearScreen();
            let empty: number[][] = [];
            for (let y = 0; y < 5; y++) {
                empty[y] = [0, 0, 0, 0, 0];
            }
            serial.writeString(JSON.stringify({
                type: "display",
                matrix: empty,
                head: null,
                gameState: gameState,
                score: score,
                time: formatTime(totalGameTime)
            }) + "\n");
        }
    }

    basic.pause(50);
});
