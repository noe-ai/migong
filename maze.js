const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

// 设置画布大小
canvas.width = 400;
canvas.height = 400;

// 迷宫配置
const CELL_SIZE = 20;
const COLS = canvas.width / CELL_SIZE;
const ROWS = canvas.height / CELL_SIZE;

// 玩家位置
let playerX = 1;
let playerY = 1;

// 玩家动画相关
let bounceOffset = 0;
let bounceDirection = 1;
let lastMoveTime = 0;

// 迷宫数组 (0表示路径, 1表示墙)
let maze = Array(ROWS).fill().map(() => Array(COLS).fill(1));

// 游戏配置
const PORTAL_COLORS = ['#FF69B4', '#4169E1', '#32CD32']; // 粉色、蓝色、绿色传送门
let currentLevel = 1;
let portals = []; // 存储传送门位置和颜色
let switches = []; // 存储开关位置和状态
let obstacles = []; // 存储动态障碍物
let walls = []; // 存储可移动的墙
let switchSequence = []; // 存储开关触发顺序

// 音效
const portalSound = new Audio('data:audio/wav;base64,UklGRl9vAAAWAVZFUk...');
const switchSound = new Audio('data:audio/wav;base64,UklGRl9vAAAWAVZFUk...');

// 初始化关卡
function initLevel(level) {
    portals = [];
    switches = [];
    obstacles = [];
    walls = [];
    switchSequence = [];

    switch(level) {
        case 1:
            // 第一关：简单的传送门
            portals.push(
                {x: 5, y: 5, color: PORTAL_COLORS[0], pair: 0},
                {x: 15, y: 15, color: PORTAL_COLORS[0], pair: 0}
            );
            break;

        case 2:
            // 第二关：传送门和开关
            portals.push(
                {x: 5, y: 5, color: PORTAL_COLORS[0], pair: 0},
                {x: 15, y: 15, color: PORTAL_COLORS[0], pair: 0}
            );

            portals.push(
                {x: 7, y: 7, color: PORTAL_COLORS[1], pair: 1},
                {x: 17, y: 17, color: PORTAL_COLORS[1], pair: 1}
            );

            // 添加开关和墙
            switches.push({
                x: 10, y: 10,
                active: false,
                target: {x: 18, y: 18, type: 'wall'}
            });
            walls.push({x: 18, y: 18, visible: true});
            break;

        case 3:
            // 第三关：复杂的传送门网络和动态障碍
            // 传送门系统
            portals.push(
                {x: 5, y: 5, color: PORTAL_COLORS[0], pair: 0},
                {x: 15, y: 15, color: PORTAL_COLORS[0], pair: 0}
            );

            portals.push(
                {x: 7, y: 7, color: PORTAL_COLORS[1], pair: 1},
                {x: 17, y: 17, color: PORTAL_COLORS[1], pair: 1}
            );

            portals.push(
                {x: 3, y: 12, color: PORTAL_COLORS[2], pair: 2},
                {x: 12, y: 3, color: PORTAL_COLORS[2], pair: 2}
            );

            // 开关系统
            switches.push(
                {
                    x: 10, y: 10,
                    active: false,
                    target: {x: 18, y: 18, type: 'wall'}
                },
                {
                    x: 8, y: 8,
                    active: false,
                    target: {x: 16, y: 16, type: 'wall'}
                }
            );

            walls.push(
                {x: 18, y: 18, visible: true},
                {x: 16, y: 16, visible: true}
            );

            // 动态障碍
            obstacles.push(
                {
                    x: 6, y: 6,
                    path: [
                        {x: 6, y: 6},
                        {x: 6, y: 10},
                        {x: 10, y: 10},
                        {x: 10, y: 6}
                    ],
                    currentPathIndex: 0
                },
                {
                    x: 14, y: 14,
                    path: [
                        {x: 14, y: 14},
                        {x: 14, y: 18},
                        {x: 18, y: 18},
                        {x: 18, y: 14}
                    ],
                    currentPathIndex: 0
                }
            );
            break;
    }

    // 确保起点和终点周围区域可通行
    maze[1][1] = 0; // 起点
    maze[1][2] = 0;
    maze[2][1] = 0;
    maze[ROWS-2][COLS-2] = 0; // 终点
    maze[ROWS-2][COLS-3] = 0;
    maze[ROWS-3][COLS-2] = 0;
}

// 更新动态障碍物位置
function updateObstacles() {
    obstacles.forEach(obstacle => {
        const currentPath = obstacle.path[obstacle.currentPathIndex];
        const nextPath = obstacle.path[(obstacle.currentPathIndex + 1) % obstacle.path.length];

        // 计算移动方向
        const dx = nextPath.x - obstacle.x;
        const dy = nextPath.y - obstacle.y;

        // 更新位置
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            obstacle.x += dx * 0.05;
            obstacle.y += dy * 0.05;
        } else {
            obstacle.currentPathIndex = (obstacle.currentPathIndex + 1) % obstacle.path.length;
        }
    });
}

// 处理传送门逻辑
function handlePortal(x, y) {
    const portal = portals.find(p => Math.floor(p.x) === x && Math.floor(p.y) === y);
    if (portal) {
        const destination = portals.find(p => p.color === portal.color && p !== portal);
        if (destination) {
            playerX = destination.x;
            playerY = destination.y;
            portalSound.play();
            return true;
        }
    }
    return false;
}

// 处理开关逻辑
function handleSwitch(x, y) {
    const switchObj = switches.find(s => s.x === x && s.y === y);
    if (switchObj) {
        switchObj.active = !switchObj.active;
        switchSound.play();

        // 更新目标物体状态
        if (switchObj.target.type === 'wall') {
            const wall = walls.find(w => w.x === switchObj.target.x && w.y === switchObj.target.y);
            if (wall) {
                wall.visible = !switchObj.active;
            }
        }

        return true;
    }
    return false;
}

// 绘制圆角矩形
function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
}

// 生成迷宫
function generateMaze() {
    // 初始化迷宫
    for(let i = 0; i < ROWS; i++) {
        for(let j = 0; j < COLS; j++) {
            maze[i][j] = 1;
        }
    }

    function carve(x, y) {
        maze[y][x] = 0;

        const directions = [
            [0, -2], [2, 0], [0, 2], [-2, 0]
        ];

        directions.sort(() => Math.random() - 0.5);

        for(let [dx, dy] of directions) {
            let newX = x + dx;
            let newY = y + dy;

            if(newX > 0 && newX < COLS-1 && newY > 0 && newY < ROWS-1 && maze[newY][newX] === 1) {
                maze[y + dy/2][x + dx/2] = 0;
                carve(newX, newY);
            }
        }
    }

    carve(1, 1);

    // 确保出口及其路径可达
    maze[ROWS-2][COLS-2] = 0;
    maze[ROWS-2][COLS-3] = 0;
    maze[ROWS-3][COLS-2] = 0;
    maze[ROWS-3][COLS-3] = 0;
}

// 绘制迷宫
function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 设置背景
    ctx.fillStyle = '#FFE5E5';  // 温暖的背景色
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 添加背景图案
    for(let i = 0; i < ROWS; i++) {
        for(let j = 0; j < COLS; j++) {
            if((i + j) % 2 === 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(j * CELL_SIZE, i * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }

    // 绘制墙和路径
    for(let y = 0; y < ROWS; y++) {
        for(let x = 0; x < COLS; x++) {
            if(maze[y][x] === 1) {
                // 主墙体
                ctx.fillStyle = '#FF9EAA';  // 粉色墙体
                roundRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE, 6);
                ctx.fill();

                // 墙体装饰
                ctx.fillStyle = '#FFB7C3';  // 浅色装饰
                ctx.beginPath();
                ctx.arc(x * CELL_SIZE + CELL_SIZE/2, y * CELL_SIZE + CELL_SIZE/2, 
                       3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // 绘制入口
    const gradient = ctx.createLinearGradient(CELL_SIZE, CELL_SIZE, CELL_SIZE*2, CELL_SIZE*2);
    gradient.addColorStop(0, '#7CB9E8');  // 明亮的蓝色
    gradient.addColorStop(1, '#B6D0E2');
    ctx.fillStyle = gradient;
    roundRect(CELL_SIZE, CELL_SIZE, CELL_SIZE, CELL_SIZE, 6);
    ctx.fill();

    // 入口装饰
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(CELL_SIZE + CELL_SIZE/2, CELL_SIZE + CELL_SIZE/3, 
           3, 0, Math.PI * 2);
    ctx.fill();

    // 绘制出口
    const exitGradient = ctx.createLinearGradient(
        (COLS-2) * CELL_SIZE, (ROWS-2) * CELL_SIZE,
        (COLS-1) * CELL_SIZE, (ROWS-1) * CELL_SIZE
    );
    exitGradient.addColorStop(0, '#90EE90');  // 柔和的绿色
    exitGradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = exitGradient;
    roundRect((COLS-2) * CELL_SIZE, (ROWS-2) * CELL_SIZE, CELL_SIZE, CELL_SIZE, 6);
    ctx.fill();

    // 出口装饰
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc((COLS-2) * CELL_SIZE + CELL_SIZE/2, 
           (ROWS-2) * CELL_SIZE + CELL_SIZE/3, 
           3, 0, Math.PI * 2);
    ctx.fill();

    // 绘制传送门
    portals.forEach(portal => {
        ctx.fillStyle = portal.color;
        ctx.beginPath();
        ctx.arc(
            portal.x * CELL_SIZE + CELL_SIZE/2,
            portal.y * CELL_SIZE + CELL_SIZE/2,
            CELL_SIZE/2,
            0, Math.PI * 2
        );
        ctx.fill();

        // 传送门光晕效果
        const portalGlow = ctx.createRadialGradient(
            portal.x * CELL_SIZE + CELL_SIZE/2,
            portal.y * CELL_SIZE + CELL_SIZE/2,
            CELL_SIZE/3,
            portal.x * CELL_SIZE + CELL_SIZE/2,
            portal.y * CELL_SIZE + CELL_SIZE/2,
            CELL_SIZE
        );
        portalGlow.addColorStop(0, portal.color.replace(')', ', 0.3)'));
        portalGlow.addColorStop(1, portal.color.replace(')', ', 0)'));
        ctx.fillStyle = portalGlow;
        ctx.fill();
    });

    // 绘制开关
    switches.forEach(switchObj => {
        ctx.fillStyle = switchObj.active ? '#FFD700' : '#A9A9A9';
        roundRect(
            switchObj.x * CELL_SIZE + CELL_SIZE/4,
            switchObj.y * CELL_SIZE + CELL_SIZE/4,
            CELL_SIZE/2, CELL_SIZE/2,
            4
        );
        ctx.fill();
    });

    // 绘制可移动墙
    walls.forEach(wall => {
        if (wall.visible) {
            ctx.fillStyle = '#8B4513';
            roundRect(
                wall.x * CELL_SIZE,
                wall.y * CELL_SIZE,
                CELL_SIZE, CELL_SIZE,
                4
            );
            ctx.fill();
        }
    });

    // 绘制动态障碍物
    obstacles.forEach(obstacle => {
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.arc(
            obstacle.x * CELL_SIZE + CELL_SIZE/2,
            obstacle.y * CELL_SIZE + CELL_SIZE/2,
            CELL_SIZE/3,
            0, Math.PI * 2
        );
        ctx.fill();

        // 绘制移动路径提示
        ctx.strokeStyle = 'rgba(255, 69, 0, 0.2)';
        ctx.beginPath();
        ctx.moveTo(
            obstacle.path[0].x * CELL_SIZE + CELL_SIZE/2,
            obstacle.path[0].y * CELL_SIZE + CELL_SIZE/2
        );
        for (let i = 1; i < obstacle.path.length; i++) {
            ctx.lineTo(
                obstacle.path[i].x * CELL_SIZE + CELL_SIZE/2,
                obstacle.path[i].y * CELL_SIZE + CELL_SIZE/2
            );
        }
        ctx.stroke();
    });

    // 更新弹跳动画
    const currentTime = Date.now();
    if(currentTime - lastMoveTime < 300) {
        bounceOffset = Math.sin((currentTime - lastMoveTime) / 300 * Math.PI) * 3;
    } else {
        bounceOffset = 0;
    }

    // 绘制玩家（可爱的圆形）
    ctx.fillStyle = '#FF6B6B';  // 明亮的红色
    ctx.beginPath();
    ctx.arc(
        playerX * CELL_SIZE + CELL_SIZE/2,
        playerY * CELL_SIZE + CELL_SIZE/2 - bounceOffset,
        CELL_SIZE/3, 0, Math.PI * 2
    );
    ctx.fill();

    // 玩家眼睛
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(
        playerX * CELL_SIZE + CELL_SIZE/2 - 2,
        playerY * CELL_SIZE + CELL_SIZE/2 - bounceOffset - 2,
        2, 0, Math.PI * 2
    );
    ctx.arc(
        playerX * CELL_SIZE + CELL_SIZE/2 + 2,
        playerY * CELL_SIZE + CELL_SIZE/2 - bounceOffset - 2,
        2, 0, Math.PI * 2
    );
    ctx.fill();

    // 玩家微笑
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.arc(
        playerX * CELL_SIZE + CELL_SIZE/2,
        playerY * CELL_SIZE + CELL_SIZE/2 - bounceOffset,
        3, 0.1 * Math.PI, 0.9 * Math.PI, false
    );
    ctx.stroke();

    // 玩家光晕
    const glow = ctx.createRadialGradient(
        playerX * CELL_SIZE + CELL_SIZE/2,
        playerY * CELL_SIZE + CELL_SIZE/2 - bounceOffset,
        CELL_SIZE/3,
        playerX * CELL_SIZE + CELL_SIZE/2,
        playerY * CELL_SIZE + CELL_SIZE/2 - bounceOffset,
        CELL_SIZE
    );
    glow.addColorStop(0, 'rgba(255, 107, 107, 0.2)');
    glow.addColorStop(1, 'rgba(255, 107, 107, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(
        playerX * CELL_SIZE + CELL_SIZE/2,
        playerY * CELL_SIZE + CELL_SIZE/2 - bounceOffset,
        CELL_SIZE, 0, Math.PI * 2
    );
    ctx.fill();
}

// 处理键盘输入
document.addEventListener('keydown', (e) => {
    let newX = playerX;
    let newY = playerY;

    switch(e.key) {
        case 'ArrowUp': newY--; break;
        case 'ArrowDown': newY++; break;
        case 'ArrowLeft': newX--; break;
        case 'ArrowRight': newX++; break;
    }

    if(maze[newY][newX] === 0) {
        if (handlePortal(newX, newY)) {
            // 传送门逻辑
        } else if (handleSwitch(newX, newY)) {
            // 开关逻辑
        } else {
            playerX = newX;
            playerY = newY;
            lastMoveTime = Date.now();  // 记录移动时间
        }
        drawMaze();

        if(playerX === COLS-2 && playerY === ROWS-2) {
            setTimeout(() => {
                checkWin();
            }, 100);
        }
    }
});

// 动画循环
function animate() {
    updateObstacles();
    drawMaze();
    requestAnimationFrame(animate);
}

// 路径验证功能
function validatePath(startX, startY, endX, endY) {
    const visited = Array(ROWS).fill().map(() => Array(COLS).fill(false));
    const queue = [{x: startX, y: startY, path: []}];
    visited[startY][startX] = true;

    while (queue.length > 0) {
        const current = queue.shift();

        // 到达终点
        if (current.x === endX && current.y === endY) {
            return {valid: true, path: current.path};
        }

        // 检查四个方向
        const directions = [
            {dx: 0, dy: -1}, // 上
            {dx: 1, dy: 0},  // 右
            {dx: 0, dy: 1},  // 下
            {dx: -1, dy: 0}  // 左
        ];

        for (const dir of directions) {
            const newX = current.x + dir.dx;
            const newY = current.y + dir.dy;

            // 检查是否在边界内且未访问过
            if (newX >= 0 && newX < COLS && newY >= 0 && newY < ROWS && 
                !visited[newY][newX] && maze[newY][newX] === 0) {

                // 检查是否有传送门
                const portal = portals.find(p => Math.floor(p.x) === newX && Math.floor(p.y) === newY);
                if (portal) {
                    const destination = portals.find(p => p.color === portal.color && p !== portal);
                    if (destination && !visited[Math.floor(destination.y)][Math.floor(destination.x)]) {
                        visited[Math.floor(destination.y)][Math.floor(destination.x)] = true;
                        queue.push({
                            x: Math.floor(destination.x),
                            y: Math.floor(destination.y),
                            path: [...current.path, {x: newX, y: newY}, {x: destination.x, y: destination.y}]
                        });
                    }
                }

                // 检查是否有开关和墙
                const switchObj = switches.find(s => s.x === newX && s.y === newY);
                if (switchObj) {
                    const wall = walls.find(w => w.x === switchObj.target.x && w.y === switchObj.target.y);
                    if (wall) {
                        // 考虑开关触发后的路径
                        visited[newY][newX] = true;
                        queue.push({
                            x: newX,
                            y: newY,
                            path: [...current.path, {x: newX, y: newY, action: 'switch'}]
                        });
                    }
                }

                // 检查是否有动态障碍物
                const hasObstacle = obstacles.some(obs => 
                    obs.path.some(p => Math.floor(p.x) === newX && Math.floor(p.y) === newY)
                );

                if (!hasObstacle) {
                    visited[newY][newX] = true;
                    queue.push({
                        x: newX,
                        y: newY,
                        path: [...current.path, {x: newX, y: newY}]
                    });
                }
            }
        }
    }

    return {valid: false, path: []};
}

// 验证关卡设置
function validateLevel(level) {
    console.log(`验证第 ${level} 关...`);

    // 重置迷宫和机关
    generateMaze();
    initLevel(level);

    // 验证从起点到终点的路径
    const pathResult = validatePath(1, 1, COLS-2, ROWS-2);

    if (!pathResult.valid) {
        console.error(`第 ${level} 关验证失败：无法找到有效路径`);
        return false;
    }

    // 验证动态障碍物不会完全阻挡路径
    const hasBlockingObstacle = obstacles.some(obs => {
        return pathResult.path.some(pathPoint => 
            obs.path.some(obsPoint => 
                Math.floor(obsPoint.x) === pathPoint.x && 
                Math.floor(obsPoint.y) === pathPoint.y
            )
        );
    });

    if (hasBlockingObstacle) {
        console.warn(`第 ${level} 关警告：存在可能阻挡路径的动态障碍物`);
    }

    console.log(`第 ${level} 关验证通过，找到可行路径`);
    return true;
}

// 在生成新游戏时进行验证
function generateNewMaze() {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        playerX = 1;
        playerY = 1;
        generateMaze();
        initLevel(currentLevel);

        if (validateLevel(currentLevel)) {
            console.log(`成功生成第 ${currentLevel} 关`);
            updateLevelDisplay();
            return;
        }

        attempts++;
    }

    console.error(`无法生成有效的第 ${currentLevel} 关，请检查关卡设置`);
    alert('关卡生成失败，请重试');
}

// 更新关卡显示
function updateLevelDisplay() {
    const levelElement = document.getElementById('currentLevel');
    const levelStatus = document.getElementById('levelStatus');
    
    // 更新关卡数字
    levelElement.textContent = currentLevel;
    levelElement.parentElement.classList.add('level-complete');
    
    // 移除动画类
    setTimeout(() => {
        levelElement.parentElement.classList.remove('level-complete');
    }, 500);
    
    // 更新关卡状态
    levelStatus.textContent = '';
    levelStatus.classList.remove('show', 'success');
}

// 显示关卡完成消息
function showLevelComplete() {
    const levelStatus = document.getElementById('levelStatus');
    levelStatus.textContent = '关卡完成！';
    levelStatus.classList.add('show', 'success');
    
    // 短暂延迟后开始下一关
    setTimeout(() => {
        currentLevel++;
        if (currentLevel > 3) {
            showGameComplete();
        } else {
            startNewLevel();
        }
    }, 1000);
}

// 显示游戏通关消息
function showGameComplete() {
    const levelStatus = document.getElementById('levelStatus');
    levelStatus.textContent = '恭喜通关！';
    levelStatus.classList.add('show', 'success');
    
    // 重置游戏
    setTimeout(() => {
        currentLevel = 1;
        startNewLevel();
    }, 2000);
}

// 开始新关卡
function startNewLevel() {
    generateMaze();
    initLevel(currentLevel);
    updateLevelDisplay();
    playerX = 1;
    playerY = 1;
    drawMaze();
}

// 检查胜利条件
function checkWin() {
    if(playerX === COLS-2 && playerY === ROWS-2) {
        showLevelComplete();
    }
}

// 增强的关卡验证系统
function validateLevel(level) {
    let attempts = 0;
    const maxAttempts = 10;
    let isValid = false;

    while (!isValid && attempts < maxAttempts) {
        // 生成基础迷宫
        generateMaze();

        // 根据关卡添加特殊元素
        initLevel(level);

        // 验证起点到终点的路径
        const pathExists = validatePath(1, 1, COLS-2, ROWS-2);

        // 验证所有传送门是否可达
        const portalsAccessible = portals.every(portal => {
            return validatePath(1, 1, portal.x, portal.y);
        });

        // 验证所有开关是否可达
        const switchesAccessible = switches.every(switch_ => {
            return validatePath(1, 1, switch_.x, switch_.y);
        });

        // 验证动态障碍物不会完全阻塞路径
        const obstaclesValid = obstacles.every(obstacle => {
            // 检查障碍物路径上是否始终有替代路线
            return validatePath(1, 1, COLS-2, ROWS-2, obstacle);
        });

        isValid = pathExists && portalsAccessible && switchesAccessible && obstaclesValid;

        if (isValid) {
            console.log(`关卡 ${level} 验证通过 (尝试次数: ${attempts + 1})`);
            return true;
        }

        attempts++;
    }

    console.error(`关卡 ${level} 验证失败，已达到最大尝试次数`);
    return false;
}

// 绘制提示图标
function drawMechanicIcons() {
    // 传送门图标
    const portalCtx = document.getElementById('portalIcon').getContext('2d');
    portalCtx.fillStyle = PORTAL_COLORS[0];
    portalCtx.beginPath();
    portalCtx.arc(15, 15, 10, 0, Math.PI * 2);
    portalCtx.fill();
    portalCtx.strokeStyle = '#fff';
    portalCtx.lineWidth = 2;
    portalCtx.beginPath();
    portalCtx.arc(15, 15, 6, 0, Math.PI * 2);
    portalCtx.stroke();

    // 开关图标
    const switchCtx = document.getElementById('switchIcon').getContext('2d');
    switchCtx.fillStyle = '#4CAF50';
    switchCtx.fillRect(5, 10, 20, 10);
    switchCtx.fillStyle = '#fff';
    switchCtx.beginPath();
    switchCtx.arc(15, 15, 4, 0, Math.PI * 2);
    switchCtx.fill();

    // 障碍物图标
    const obstacleCtx = document.getElementById('obstacleIcon').getContext('2d');
    obstacleCtx.fillStyle = '#FF4444';
    obstacleCtx.beginPath();
    obstacleCtx.moveTo(15, 5);
    obstacleCtx.lineTo(25, 25);
    obstacleCtx.lineTo(5, 25);
    obstacleCtx.closePath();
    obstacleCtx.fill();
}

generateNewMaze();
animate();  // 启动动画循环