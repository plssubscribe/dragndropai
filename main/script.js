const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const overlay = document.getElementById("game-over");
const restartBtn = document.getElementById("restart");

const laneCount = 3;
const laneWidth = canvas.width / laneCount;
const carWidth = laneWidth * 0.5;
const carHeight = carWidth * 1.6;
const carY = canvas.height - carHeight - 24;
const obstacleHeight = carHeight * 0.75;
const obstacleWidth = laneWidth * 0.4;

const controls = {
  left: false,
  right: false,
};

const state = {
  running: false,
  score: 0,
  best: Number(localStorage.getItem("car-best")) || 0,
  speed: 220,
  obstacleSpeed: 180,
  spawnTimer: 0,
  spawnEvery: 1.2,
  carX: canvas.width / 2 - carWidth / 2,
  obstacles: [],
  lastTime: 0,
};

function resetGame() {
  state.running = true;
  state.score = 0;
  state.speed = 260;
  state.obstacleSpeed = 220;
  state.spawnTimer = 0;
  state.spawnEvery = 1.1;
  state.obstacles = [];
  state.carX = canvas.width / 2 - carWidth / 2;
  state.lastTime = performance.now();
  overlay.hidden = true;
  requestAnimationFrame(loop);
  updateScoreboard();
}

function updateScoreboard() {
  scoreEl.textContent = Math.floor(state.score);
  bestScoreEl.textContent = state.best;
}

function spawnObstacle() {
  const lane = Math.floor(Math.random() * laneCount);
  const x = lane * laneWidth + laneWidth / 2 - obstacleWidth / 2;
  state.obstacles.push({
    x,
    y: -obstacleHeight,
    width: obstacleWidth,
    height: obstacleHeight,
    passed: false,
  });
}

function handleInput(dt) {
  const moveDistance = state.speed * dt;
  if (controls.left) {
    state.carX -= moveDistance;
  }
  if (controls.right) {
    state.carX += moveDistance;
  }

  const minX = laneWidth * 0.1;
  const maxX = canvas.width - carWidth - laneWidth * 0.1;
  state.carX = Math.max(minX, Math.min(maxX, state.carX));
}

function updateObstacles(dt) {
  state.spawnTimer += dt;
  const difficultyRamp = Math.min(1, state.score / 120);
  state.spawnEvery = 1 - difficultyRamp * 0.45;
  state.obstacleSpeed = 220 + difficultyRamp * 140;

  if (state.spawnTimer >= state.spawnEvery) {
    spawnObstacle();
    state.spawnTimer = 0;
  }

  for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = state.obstacles[i];
    obstacle.y += state.obstacleSpeed * dt;

    if (!obstacle.passed && obstacle.y > carY + carHeight) {
      obstacle.passed = true;
      state.score += 1;
      updateScoreboard();
    }

    if (obstacle.y > canvas.height + obstacle.height) {
      state.obstacles.splice(i, 1);
    }
  }
}

function detectCollisions() {
  for (const obstacle of state.obstacles) {
    if (
      state.carX < obstacle.x + obstacle.width &&
      state.carX + carWidth > obstacle.x &&
      carY < obstacle.y + obstacle.height &&
      carY + carHeight > obstacle.y
    ) {
      endGame();
      break;
    }
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#2c2f3f");
  gradient.addColorStop(1, "#0a0b14");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#22283f";
  ctx.lineWidth = laneWidth * 0.08;
  ctx.beginPath();
  ctx.moveTo(laneWidth, 0);
  ctx.lineTo(laneWidth, canvas.height);
  ctx.moveTo(laneWidth * 2, 0);
  ctx.lineTo(laneWidth * 2, canvas.height);
  ctx.stroke();

  ctx.setLineDash([22, 22]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = laneWidth * 0.12;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCar() {
  ctx.fillStyle = "#4dd1ff";
  ctx.fillRect(state.carX, carY, carWidth, carHeight);

  ctx.fillStyle = "#0f1c2d";
  const wheelWidth = carWidth * 0.25;
  const wheelHeight = carHeight * 0.2;
  ctx.fillRect(state.carX - wheelWidth * 0.6, carY + wheelHeight * 0.5, wheelWidth, wheelHeight);
  ctx.fillRect(state.carX - wheelWidth * 0.6, carY + carHeight - wheelHeight * 1.5, wheelWidth, wheelHeight);
  ctx.fillRect(state.carX + carWidth - wheelWidth * 0.4, carY + wheelHeight * 0.5, wheelWidth, wheelHeight);
  ctx.fillRect(state.carX + carWidth - wheelWidth * 0.4, carY + carHeight - wheelHeight * 1.5, wheelWidth, wheelHeight);
}

function drawObstacles() {
  ctx.fillStyle = "#ff9f1c";
  for (const obstacle of state.obstacles) {
    ctx.beginPath();
    ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y);
    ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
    ctx.closePath();
    ctx.fill();
  }
}

function endGame() {
  state.running = false;
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem("car-best", state.best);
  updateScoreboard();
  overlay.hidden = false;
}

function loop(time) {
  const dt = Math.min((time - state.lastTime) / 1000, 0.2);
  state.lastTime = time;

  if (!state.running) {
    drawBackground();
    drawObstacles();
    drawCar();
    return;
  }

  handleInput(dt);
  updateObstacles(dt);
  detectCollisions();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawObstacles();
  drawCar();

  requestAnimationFrame(loop);
}

function handleKey(event, isDown) {
  if (event.repeat) return;
  switch (event.key.toLowerCase()) {
    case "arrowleft":
    case "a":
      controls.left = isDown;
      break;
    case "arrowright":
    case "d":
      controls.right = isDown;
      break;
    case " ":
      if (!isDown) break;
      if (!state.running) {
        resetGame();
      }
      break;
    default:
  }
}

document.addEventListener("keydown", (event) => handleKey(event, true));
document.addEventListener("keyup", (event) => handleKey(event, false));
restartBtn.addEventListener("click", resetGame);

updateScoreboard();
resetGame();
