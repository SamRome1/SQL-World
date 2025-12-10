// ============================================================================
// GAME INITIALIZATION & CANVAS SETUP
// ============================================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Resize canvas to fill available space
function resizeCanvas() {
    const container = document.getElementById('game-container');
    const terminalHeight = 250;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - terminalHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============================================================================
// GAME STATE & DATA MODEL
// ============================================================================

const weapons = [];
const creatures = [];

// Homebase location and sprite
const homebase = {
    x: 0,
    z: 0,
    width: 80,
    height: 80
};

const homebaseSprite = new Image();
homebaseSprite.src = 'homebase.png';
let homebaseLoaded = false;

homebaseSprite.onload = () => {
    homebaseLoaded = true;
};

homebaseSprite.onerror = () => {
    console.warn('Homebase sprite not found.');
    homebaseLoaded = false;
};

// Player object - spawn at homebase
const player = {
    x: homebase.x,
    z: homebase.z,
    speed: 2,
    radius: 8,
    facingRight: false  // Track facing direction for sprite flipping
};

// Character sprite image
const playerSprite = new Image();
playerSprite.src = 'character.png';
let spriteLoaded = false;

playerSprite.onload = () => {
    spriteLoaded = true;
};

playerSprite.onerror = () => {
    console.warn('Character sprite not found. Using default circle.');
    spriteLoaded = false;
};

// Boss creatures sprite sheet
const creaturesSpriteSheet = new Image();
creaturesSpriteSheet.src = 'creatures.png';
let creaturesLoaded = false;
let bossSprites = []; // Will store the 4 boss sprites

creaturesSpriteSheet.onload = () => {
    creaturesLoaded = true;
    // Assuming the sprite sheet is arranged in a 2x2 grid
    // We'll extract each boss sprite
    const spriteWidth = creaturesSpriteSheet.width / 2;
    const spriteHeight = creaturesSpriteSheet.height / 2;
    
    // Create 4 canvas elements for each boss sprite
    for (let i = 0; i < 4; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = spriteWidth;
        canvas.height = spriteHeight;
        const ctx = canvas.getContext('2d');
        
        const col = i % 2;
        const row = Math.floor(i / 2);
        
        ctx.drawImage(
            creaturesSpriteSheet,
            col * spriteWidth,
            row * spriteHeight,
            spriteWidth,
            spriteHeight,
            0,
            0,
            spriteWidth,
            spriteHeight
        );
        
        bossSprites.push(canvas);
    }
};

creaturesSpriteSheet.onerror = () => {
    console.warn('Creatures sprite sheet not found.');
    creaturesLoaded = false;
};

// Input state
const keys = {};

// ============================================================================
// INPUT HANDLING
// ============================================================================

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// ============================================================================
// HOMEBASE CLICK DETECTION
// ============================================================================

const homebaseModal = document.getElementById('homebase-modal');
const modalClose = document.querySelector('.modal-close');

function screenToWorldX(screenX) {
    const screenCenterX = canvas.width / 2;
    return player.x + (screenX - screenCenterX);
}

function screenToWorldZ(screenZ) {
    const screenCenterZ = canvas.height / 2;
    return player.z + (screenZ - screenCenterZ);
}

function isClickOnHomebase(screenX, screenZ) {
    const worldX = screenToWorldX(screenX);
    const worldZ = screenToWorldZ(screenZ);
    
    const halfWidth = homebase.width / 2;
    const halfHeight = homebase.height / 2;
    
    return (
        worldX >= homebase.x - halfWidth &&
        worldX <= homebase.x + halfWidth &&
        worldZ >= homebase.z - halfHeight &&
        worldZ <= homebase.z + halfHeight
    );
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickZ = e.clientY - rect.top;
    
    if (isClickOnHomebase(clickX, clickZ)) {
        homebaseModal.classList.add('show');
    }
});

// Close modal when clicking the X button
modalClose.addEventListener('click', () => {
    homebaseModal.classList.remove('show');
});

// Close modal when clicking outside the modal content
homebaseModal.addEventListener('click', (e) => {
    if (e.target === homebaseModal) {
        homebaseModal.classList.remove('show');
    }
});

// ============================================================================
// TERMINAL LOGIC
// ============================================================================

const terminalOutput = document.getElementById('terminal-output');
const terminalInput = document.getElementById('terminal-input');
const coordinatesDisplay = document.getElementById('coordinates-display');

function logToTerminal(text) {
    const line = document.createElement('div');
    line.textContent = text;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const command = terminalInput.value.trim();
        if (command) {
            logToTerminal(`sql> ${command}`);
            terminalInput.value = '';
            executeSQL(command);
        }
    }
});

// Focus input on load
window.addEventListener('load', () => {
    terminalInput.focus();
});

// ============================================================================
// SQL PARSING
// ============================================================================

function parseInsert(sql) {
    // Case-insensitive match for INSERT INTO
    const insertMatch = sql.match(/^\s*INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)\s*;?\s*$/i);
    
    if (!insertMatch) {
        throw new Error('Invalid INSERT syntax. Expected: INSERT INTO table (col1, col2) VALUES (val1, val2);');
    }
    
    const table = insertMatch[1].toLowerCase();
    const columnsStr = insertMatch[2];
    const valuesStr = insertMatch[3];
    
    // Parse columns
    const columns = columnsStr.split(',').map(c => c.trim().toLowerCase());
    
    // Parse values (handle quoted strings and numbers)
    const values = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = null;
    
    for (let i = 0; i < valuesStr.length; i++) {
        const char = valuesStr[i];
        
        if ((char === '"' || char === "'") && !inQuotes) {
            inQuotes = true;
            quoteChar = char;
        } else if (char === quoteChar && inQuotes) {
            inQuotes = false;
            quoteChar = null;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) {
        values.push(current.trim());
    }
    
    // Strip quotes and convert values
    const processedValues = values.map(v => {
        // Remove surrounding quotes
        v = v.replace(/^["']|["']$/g, '');
        // Try to convert to number
        const num = Number(v);
        return isNaN(num) ? v : num;
    });
    
    // Build row object
    const row = {};
    columns.forEach((col, idx) => {
        if (processedValues[idx] !== undefined) {
            row[col] = processedValues[idx];
        }
    });
    
    return { table, row };
}

function executeSQL(command) {
    try {
        const upperCommand = command.trim().toUpperCase();
        
        if (upperCommand.startsWith('INSERT')) {
            const { table, row } = parseInsert(command);
            
            if (table === 'weapons') {
                // Spawn weapon near player with random offset
                const offsetX = (Math.random() - 0.5) * 100;
                const offsetZ = (Math.random() - 0.5) * 100;
                
                const weapon = {
                    name: row.name || 'Unknown Weapon',
                    damage: row.damage || 0,
                    worldX: player.x + offsetX,
                    worldZ: player.z + offsetZ
                };
                
                weapons.push(weapon);
                logToTerminal(`OK: Inserted weapon "${weapon.name}" (damage=${weapon.damage}).`);
            } else if (table === 'creatures') {
                // Determine boss index (1-4 maps to 0-3)
                let bossIndex = 0;
                if (row.boss !== undefined) {
                    bossIndex = Math.max(0, Math.min(3, Math.floor(row.boss) - 1)); // Convert 1-4 to 0-3
                } else {
                    // Fallback: assign based on creature count if boss not specified
                    bossIndex = creatures.length % 4;
                }
                
                // Determine level and HP
                const level = row.level !== undefined ? Math.max(1, Math.floor(row.level)) : 1;
                const hp = level * 20; // HP scales with level
                
                // Generate name
                const bossNumber = bossIndex + 1;
                const name = `Boss ${bossNumber} (Level ${level})`;
                
                // Spawn position (near player with random offset)
                const offsetX = (Math.random() - 0.5) * 100;
                const offsetZ = (Math.random() - 0.5) * 100;
                
                const creature = {
                    name: name,
                    species: 'boss',
                    hp: hp,
                    level: level,
                    x: row.x !== undefined ? row.x : player.x + offsetX,
                    z: row.z !== undefined ? row.z : player.z + offsetZ,
                    aggression: row.aggression || 'hostile',
                    bossIndex: bossIndex  // Index of boss sprite (0-3)
                };
                
                creatures.push(creature);
                logToTerminal(`OK: Inserted ${name} (HP=${hp}).`);
            } else {
                logToTerminal(`Error: Unknown table "${table}". Supported tables: weapons, creatures`);
            }
        } else {
            logToTerminal(`Error: Unsupported command. Only INSERT statements are supported.`);
        }
    } catch (error) {
        logToTerminal(`Error: ${error.message}`);
    }
}

// ============================================================================
// GAME LOOP
// ============================================================================

function update() {
    // Player movement
    if (keys['w']) player.z -= player.speed;
    if (keys['s']) player.z += player.speed;
    if (keys['a']) {
        player.x -= player.speed;
        player.facingRight = false;  // Facing left
    }
    if (keys['d']) {
        player.x += player.speed;
        player.facingRight = true;   // Facing right
    }
}

function draw() {
    // Update coordinates display
    coordinatesDisplay.textContent = `X: ${Math.round(player.x)}, Z: ${Math.round(player.z)}`;
    
    // Clear canvas with green background
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // World-to-screen conversion (camera follows player)
    const screenCenterX = canvas.width / 2;
    const screenCenterZ = canvas.height / 2;
    
    function worldToScreenX(worldX) {
        return screenCenterX + (worldX - player.x);
    }
    
    function worldToScreenZ(worldZ) {
        return screenCenterZ + (worldZ - player.z);
    }
    
    // Draw grid
    ctx.strokeStyle = '#3a6b1f';
    ctx.lineWidth = 1;
    const gridSize = 50;
    const startX = Math.floor((player.x - screenCenterX) / gridSize) * gridSize;
    const startZ = Math.floor((player.z - screenCenterZ) / gridSize) * gridSize;
    const endX = startX + canvas.width + gridSize;
    const endZ = startZ + canvas.height + gridSize;
    
    for (let x = startX; x < endX; x += gridSize) {
        const screenX = worldToScreenX(x);
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
        ctx.stroke();
    }
    
    for (let z = startZ; z < endZ; z += gridSize) {
        const screenZ = worldToScreenZ(z);
        ctx.beginPath();
        ctx.moveTo(0, screenZ);
        ctx.lineTo(canvas.width, screenZ);
        ctx.stroke();
    }
    
    // Draw homebase
    if (homebaseLoaded && homebaseSprite.complete) {
        const homebaseScreenX = worldToScreenX(homebase.x);
        const homebaseScreenZ = worldToScreenZ(homebase.z);
        
        ctx.drawImage(
            homebaseSprite,
            homebaseScreenX - homebase.width / 2,
            homebaseScreenZ - homebase.height / 2,
            homebase.width,
            homebase.height
        );
    }
    
    // Draw weapons
    ctx.fillStyle = '#0066ff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    weapons.forEach(weapon => {
        const screenX = worldToScreenX(weapon.worldX);
        const screenZ = worldToScreenZ(weapon.worldZ);
        
        // Draw blue square
        ctx.fillRect(screenX - 5, screenZ - 5, 10, 10);
        
        // Draw weapon name
        ctx.fillStyle = '#ffffff';
        ctx.fillText(weapon.name, screenX, screenZ - 8);
        ctx.fillStyle = '#0066ff';
    });
    
    // Draw creatures
    creatures.forEach(creature => {
        const screenX = worldToScreenX(creature.x);
        const screenZ = worldToScreenZ(creature.z);
        
        // Draw boss sprite if loaded
        if (creaturesLoaded && bossSprites.length > 0 && creature.bossIndex !== undefined) {
            const bossSprite = bossSprites[creature.bossIndex % bossSprites.length];
            const displayWidth = 50;  // Display width in pixels
            const displayHeight = (bossSprite.height / bossSprite.width) * displayWidth;
            
            ctx.drawImage(
                bossSprite,
                screenX - displayWidth / 2,
                screenZ - displayHeight / 2,
                displayWidth,
                displayHeight
            );
        } else {
            // Fallback: draw circle if sprite not loaded
            if (creature.species === 'dummy') {
                ctx.fillStyle = '#888888';
            } else {
                ctx.fillStyle = '#ff4444';
            }
            
            ctx.beginPath();
            ctx.arc(screenX, screenZ, 10, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw creature name
        ctx.fillStyle = '#ffffff';
        ctx.fillText(creature.name, screenX, screenZ - (creaturesLoaded ? 30 : 12));
    });
    
    // Draw player (centered)
    if (spriteLoaded && playerSprite.complete) {
        // Calculate sprite dimensions (scale to reasonable size)
        const spriteWidth = playerSprite.width;
        const spriteHeight = playerSprite.height;
        const displayWidth = 40;  // Display width in pixels
        const displayHeight = (spriteHeight / spriteWidth) * displayWidth;
        
        ctx.save();
        
        // Move to player position
        ctx.translate(screenCenterX, screenCenterZ);
        
        // Flip horizontally if facing right
        if (player.facingRight) {
            ctx.scale(-1, 1);
        }
        
        // Draw sprite centered
        ctx.drawImage(
            playerSprite,
            -displayWidth / 2,
            -displayHeight / 2,
            displayWidth,
            displayHeight
        );
        
        ctx.restore();
    } else {
        // Fallback: draw circle if sprite not loaded
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(screenCenterX, screenCenterZ, player.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Player outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Welcome message
logToTerminal('Welcome to SQL World.');
logToTerminal('');
logToTerminal('Try commands like:');
logToTerminal('INSERT INTO weapons (name, damage) VALUES (\'Stick of Truth\', 5);');
logToTerminal('INSERT INTO creatures (boss, level) VALUES (1, 5);');
logToTerminal('INSERT INTO creatures (boss) VALUES (2);');
logToTerminal('');

// Start game loop
gameLoop();

