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
const particles = [];

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
    facingRight: false,
    gold: 0
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

function spawnParticles(x, z, color, count) {
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 0.5 + Math.random() * 1.5;
        particles.push({
            x,
            z,
            vx: Math.cos(a) * s,
            vz: Math.sin(a) * s,
            life: 600,
            color
        });
    }
}

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
    } else {
        const screenCenterX = canvas.width / 2;
        const screenCenterZ = canvas.height / 2;
        function worldToScreenX(worldX) { return screenCenterX + (worldX - player.x); }
        function worldToScreenZ(worldZ) { return screenCenterZ + (worldZ - player.z); }
        let hitIndex = -1;
        for (let i = 0; i < creatures.length; i++) {
            const c = creatures[i];
            const sx = worldToScreenX(c.x);
            const sz = worldToScreenZ(c.z);
            const dx = clickX - sx;
            const dz = clickZ - sz;
            const dist2 = dx * dx + dz * dz;
            if (dist2 < 625) { hitIndex = i; break; }
        }
        if (hitIndex !== -1) openChallenge(hitIndex);
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
const challengeModal = document.getElementById('challenge-modal');
const challengeTitle = document.getElementById('challenge-title');
const challengePrompt = document.getElementById('challenge-prompt');
const challengeOutput = document.getElementById('challenge-output');
const challengeInput = document.getElementById('challenge-input');
const challengeClose = document.querySelector('.challenge-close');
let currentChallenge = null;
let currentChallengeCreatureIndex = -1;

challengeClose.addEventListener('click', () => {
    challengeModal.classList.remove('show');
});
challengeModal.addEventListener('click', (e) => {
    if (e.target === challengeModal) challengeModal.classList.remove('show');
});

function openChallenge(index) {
    currentChallengeCreatureIndex = index;
    const c = creatures[index];
    currentChallenge = generateChallenge(c);
    challengeTitle.textContent = c.name;
    challengePrompt.textContent = currentChallenge.prompt;
    challengeOutput.innerHTML = '';
    challengeModal.classList.add('show');
    challengeInput.value = '';
    challengeInput.focus();
}

challengeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const cmd = challengeInput.value.trim();
        if (!cmd) return;
        const line = document.createElement('div');
        line.textContent = `sql> ${cmd}`;
        challengeOutput.appendChild(line);
        const res = currentChallenge.validate(cmd);
        if (res.ok) {
            const ok = document.createElement('div');
            ok.textContent = 'OK: Challenge completed!';
            challengeOutput.appendChild(ok);
            applyReward();
            challengeModal.classList.remove('show');
        } else {
            const err = document.createElement('div');
            err.textContent = `Error: ${res.error}`;
            challengeOutput.appendChild(err);
        }
        challengeOutput.scrollTop = challengeOutput.scrollHeight;
        challengeInput.value = '';
    }
});

function generateChallenge(c) {
    const bossNumber = (c.bossIndex ?? 0) + 1;
    const level = c.level;
    if (bossNumber === 1) {
        return {
            prompt: `Insert at least 3 weapons with damage >= ${level}. Use multi-row VALUES.`,
            validate: (input) => {
                try {
                    const { table, rows } = parseInsert(input);
                    if (table !== 'weapons') return { ok: false, error: 'Use INSERT INTO weapons.' };
                    if (rows.length < 3) return { ok: false, error: 'Insert 3 or more rows.' };
                    for (const r of rows) { if ((r.damage ?? 0) < level) return { ok: false, error: 'Each weapon damage must be >= level.' }; }
                    return { ok: true };
                } catch (e) { return { ok: false, error: e.message }; }
            }
        };
    } else if (bossNumber === 2) {
        return {
            prompt: `Spawn 2 creatures of boss ${bossNumber} with level >= ${level}. You can repeat values in one tuple.`,
            validate: (input) => {
                try {
                    const { table, rows } = parseInsert(input);
                    if (table !== 'creatures') return { ok: false, error: 'Use INSERT INTO creatures.' };
                    let count = 0;
                    for (const r of rows) {
                        const b = Math.floor((r.boss ?? bossNumber));
                        const lv = Math.floor(r.level ?? level);
                        if (b === bossNumber && lv >= level) count++;
                    }
                    if (count < 2) return { ok: false, error: 'Insert at least 2 matching creatures.' };
                    return { ok: true };
                } catch (e) { return { ok: false, error: e.message }; }
            }
        };
    } else if (bossNumber === 3) {
        return {
            prompt: `List all creatures with SELECT.`,
            validate: (input) => {
                const m = input.match(/^\s*SELECT\s+\*\s+FROM\s+creatures\s*;?\s*$/i);
                if (m) return { ok: true };
                return { ok: false, error: 'Use: SELECT * FROM creatures;' };
            }
        };
    } else {
        return {
            prompt: `Insert weapons and creatures: at least 1 weapon with damage >= ${level*2} or 1 creature boss ${bossNumber}.`,
            validate: (input) => {
                try {
                    const upper = input.trim().toUpperCase();
                    if (upper.startsWith('INSERT INTO WEAPONS')) {
                        const { rows } = parseInsert(input);
                        if (!rows.some(r => (r.damage ?? 0) >= level * 2)) return { ok: false, error: 'Add a high-damage weapon.' };
                        return { ok: true };
                    } else if (upper.startsWith('INSERT INTO CREATURES')) {
                        const { rows } = parseInsert(input);
                        if (!rows.some(r => Math.floor((r.boss ?? bossNumber)) === bossNumber)) return { ok: false, error: `Add a boss ${bossNumber} creature.` };
                        return { ok: true };
                    }
                    return { ok: false, error: 'Use INSERT into weapons or creatures.' };
                } catch (e) { return { ok: false, error: e.message }; }
            }
        };
    }
}

function applyReward() {
    const idx = currentChallengeCreatureIndex;
    if (idx < 0) return;
    const c = creatures[idx];
    const goldGain = c.level * 10;
    player.gold += goldGain;
    const w = { name: `Boss Loot L${c.level}`, damage: c.level * 5, worldX: player.x, worldZ: player.z };
    weapons.push(w);
    spawnParticles(player.x, player.z, '#ffff00', 40);
    logToTerminal(`Reward: +${goldGain} gold and weapon "${w.name}".`);
    creatures.splice(idx, 1);
    currentChallengeCreatureIndex = -1;
}

// ============================================================================
// TERMINAL LOGIC
// ============================================================================

const terminalOutput = document.getElementById('terminal-output');
const terminalInput = document.getElementById('terminal-input');
const coordinatesDisplay = document.getElementById('coordinates-display');
const commandHistory = [];
let historyIndex = -1;

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
            commandHistory.push(command);
            historyIndex = commandHistory.length;
            terminalInput.value = '';
            executeSQL(command);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
            historyIndex = Math.max(0, historyIndex - 1);
            terminalInput.value = commandHistory[historyIndex] || '';
            setTimeout(() => terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length), 0);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (commandHistory.length > 0) {
            historyIndex = Math.min(commandHistory.length, historyIndex + 1);
            terminalInput.value = historyIndex === commandHistory.length ? '' : (commandHistory[historyIndex] || '');
            setTimeout(() => terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length), 0);
        }
    } else if (e.key === 'Tab') {
        e.preventDefault();
        const v = terminalInput.value.trim().toUpperCase();
        if (!v) {
            terminalInput.value = "INSERT INTO weapons (name, damage) VALUES ('Sword', 10);";
        } else if (v.startsWith('INSERT')) {
            terminalInput.value = "INSERT INTO creatures (boss, level) VALUES (1, 5);";
        } else if (v.startsWith('SELECT')) {
            terminalInput.value = 'SELECT * FROM creatures;';
        } else {
            terminalInput.value = 'HELP';
        }
        setTimeout(() => terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length), 0);
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
    const insertMatch = sql.match(/^\s*INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*(.+);?\s*$/i);
    if (!insertMatch) {
        throw new Error('Invalid INSERT syntax. Try: INSERT INTO table (cols) VALUES (...), (...);');
    }
    const table = insertMatch[1].toLowerCase();
    const columnsStr = insertMatch[2];
    const valuesRaw = insertMatch[3].trim();
    let columns = columnsStr.split(',').map(c => c.trim().toLowerCase());
    let spawnCount = 0;
    columns = columns.filter(c => {
        const n = Number(c);
        if (!isNaN(n) && Number.isFinite(n)) { spawnCount = Math.max(spawnCount, Math.floor(n)); return false; }
        return true;
    });
    const rows = [];
    let i = 0;
    while (i < valuesRaw.length) {
        while (i < valuesRaw.length && /[\s,]/.test(valuesRaw[i])) i++;
        if (valuesRaw[i] !== '(') break;
        i++;
        let inQuotes = false;
        let quoteChar = '';
        let buf = '';
        const items = [];
        while (i < valuesRaw.length) {
            const ch = valuesRaw[i];
            if (!inQuotes && ch === ')') {
                if (buf.trim().length) items.push(buf.trim());
                i++;
                break;
            }
            if (!inQuotes && ch === ',') {
                items.push(buf.trim());
                buf = '';
                i++;
                continue;
            }
            if ((ch === '"' || ch === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = ch;
                buf += ch;
                i++;
                continue;
            }
            if (inQuotes && ch === quoteChar) {
                inQuotes = false;
                quoteChar = '';
                buf += ch;
                i++;
                continue;
            }
            buf += ch;
            i++;
        }
        const processed = items.map(v => {
            v = v.replace(/^["']|["']$/g, '');
            const num = Number(v);
            return isNaN(num) ? v : num;
        });
        if (processed.length === columns.length) {
            const row = {};
            columns.forEach((col, idx) => row[col] = processed[idx]);
            rows.push(row);
        } else if (processed.length % columns.length === 0) {
            for (let k = 0; k < processed.length; k += columns.length) {
                const row = {};
                for (let c = 0; c < columns.length; c++) row[columns[c]] = processed[k + c];
                rows.push(row);
            }
        } else {
            throw new Error('Value count does not align with columns.');
        }
    }
    if (rows.length === 0) throw new Error('No VALUES parsed.');
    if (spawnCount > 1 && rows.length === 1) {
        const base = rows[0];
        for (let r = 1; r < spawnCount; r++) rows.push({ ...base });
    }
    return { table, rows };
}

function executeSQL(command) {
    try {
        const upperCommand = command.trim().toUpperCase();
        
        if (upperCommand.startsWith('INSERT')) {
            const { table, rows } = parseInsert(command);
            
            if (table === 'weapons') {
                rows.forEach(r => {
                    const offsetX = (Math.random() - 0.5) * 100;
                    const offsetZ = (Math.random() - 0.5) * 100;
                    const weapon = {
                        name: r.name || 'Unknown Weapon',
                        damage: r.damage || 0,
                        worldX: player.x + offsetX,
                        worldZ: player.z + offsetZ
                    };
                    weapons.push(weapon);
                    spawnParticles(weapon.worldX, weapon.worldZ, '#0066ff', 20);
                    logToTerminal(`OK: Inserted weapon "${weapon.name}" (damage=${weapon.damage}).`);
                });
            } else if (table === 'creatures') {
                rows.forEach(r => {
                    let bossIndex = 0;
                    if (r.boss !== undefined) {
                        bossIndex = Math.max(0, Math.min(3, Math.floor(r.boss) - 1));
                    } else {
                        bossIndex = creatures.length % 4;
                    }
                    const level = r.level !== undefined ? Math.max(1, Math.floor(r.level)) : 1;
                    const hp = level * 20;
                    const bossNumber = bossIndex + 1;
                    const name = `Boss ${bossNumber} (Level ${level})`;
                    const offsetX = (Math.random() - 0.5) * 100;
                    const offsetZ = (Math.random() - 0.5) * 100;
                    const creature = {
                        name,
                        species: 'boss',
                        hp,
                        level,
                        x: r.x !== undefined ? r.x : player.x + offsetX,
                        z: r.z !== undefined ? r.z : player.z + offsetZ,
                        aggression: r.aggression || 'hostile',
                        bossIndex
                    };
                    creatures.push(creature);
                    spawnParticles(creature.x, creature.z, '#ff4444', 30);
                    logToTerminal(`OK: Inserted ${name} (HP=${hp}).`);
                });
            } else {
                logToTerminal(`Error: Unknown table "${table}". Supported tables: weapons, creatures`);
            }
        } else if (upperCommand.startsWith('SELECT')) {
            const selectMatch = command.match(/^\s*SELECT\s+\*\s+FROM\s+(\w+)\s*;?\s*$/i);
            if (!selectMatch) {
                logToTerminal('Error: Invalid SELECT syntax. Try: SELECT * FROM weapons;');
                return;
            }
            const table = selectMatch[1].toLowerCase();
            if (table === 'weapons') {
                if (weapons.length === 0) {
                    logToTerminal('OK: No weapons found.');
                } else {
                    weapons.forEach(w => {
                        logToTerminal(`name="${w.name}", damage=${w.damage}, x=${Math.round(w.worldX)}, z=${Math.round(w.worldZ)}`);
                    });
                }
            } else if (table === 'creatures') {
                if (creatures.length === 0) {
                    logToTerminal('OK: No creatures found.');
                } else {
                    creatures.forEach(c => {
                        logToTerminal(`name="${c.name}", level=${c.level}, hp=${c.hp}, x=${Math.round(c.x)}, z=${Math.round(c.z)}`);
                    });
                }
            } else {
                logToTerminal(`Error: Unknown table "${table}". Supported tables: weapons, creatures`);
            }
        } else if (upperCommand === 'HELP' || upperCommand.startsWith('HELP')) {
            logToTerminal('Commands:');
            logToTerminal("INSERT INTO weapons (name, damage) VALUES ('Sword', 10);");
            logToTerminal('INSERT INTO creatures (boss, level) VALUES (2, 5);');
            logToTerminal('SELECT * FROM weapons;');
            logToTerminal('SELECT * FROM creatures;');
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
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.z += p.vz;
        p.life -= timestep;
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1);
    }
}

function draw() {
    // Update coordinates display
    coordinatesDisplay.textContent = `X: ${Math.round(player.x)}, Z: ${Math.round(player.z)} • Gold: ${player.gold}`;
    
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
    
    // Draw particles
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const screenX = worldToScreenX(p.x);
        const screenZ = worldToScreenZ(p.z);
        const alpha = Math.max(0, Math.min(1, p.life / 600));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(screenX - 2, screenZ - 2, 4, 4);
        ctx.globalAlpha = 1;
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

const timestep = 1000 / 60;

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

gameLoop();
