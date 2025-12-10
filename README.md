# SQL World

A 2D browser-based game where you explore a green world and use SQL-like commands to spawn weapons and creatures. Built with vanilla HTML, CSS, and JavaScript.

## Features

- **Top-down 2D world** - Explore a green grid-based world with a camera that follows your character
- **SQL Terminal** - Use SQL INSERT commands to spawn weapons and creatures
- **Homebase** - Spawn point with a welcome message
- **Boss Creatures** - Spawn 4 different boss creatures with varying levels
- **Coordinate Display** - Never get lost with real-time position coordinates
- **Character Sprites** - Animated character that flips when moving right

## How to Play

1. Open `index.html` in a web browser
2. Use **WASD** keys to move around the world:
   - **W** - Move up (negative Z)
   - **S** - Move down (positive Z)
   - **A** - Move left (negative X)
   - **D** - Move right (positive X)
3. Click on the homebase to see the welcome message
4. Use the terminal at the bottom to spawn items with SQL commands

## SQL Commands

### Spawn Weapons

```sql
INSERT INTO weapons (name, damage) VALUES ('Stick of Truth', 5);
INSERT INTO weapons (name, damage) VALUES ('Sword of Power', 10);
```

**Parameters:**
- `name` - Weapon name (string)
- `damage` - Damage value (number)

Weapons spawn near your current position and appear as blue squares on the map.

### Spawn Creatures (Bosses)

```sql
INSERT INTO creatures (boss) VALUES (1);
INSERT INTO creatures (boss, level) VALUES (2, 5);
```

**Parameters:**
- `boss` - Boss number (1-4) - determines which boss sprite to use
- `level` - Optional level (default: 1) - HP = level × 20

**Examples:**
- `INSERT INTO creatures (boss) VALUES (1);` - Spawns Boss 1 at level 1 (20 HP)
- `INSERT INTO creatures (boss, level) VALUES (3, 10);` - Spawns Boss 3 at level 10 (200 HP)

Creatures spawn near your current position and display as boss sprites from `creatures.png`.

## File Structure

```
MyGame-1/
├── index.html      # Main HTML file
├── style.css       # Game styling
├── main.js         # Game logic and SQL parser
├── character.png   # Player character sprite
├── homebase.png    # Homebase building sprite
└── creatures.png   # Boss creature sprite sheet (2x2 grid)
```

## Technical Details

- **No frameworks** - Pure vanilla JavaScript, HTML, and CSS
- **Canvas-based rendering** - Uses HTML5 Canvas for the game world
- **SQL Parser** - Custom regex-based SQL parser (no external libraries)
- **Sprite sheets** - Boss creatures loaded from a 2x2 sprite sheet
- **Camera system** - Player stays centered, world scrolls around

## Controls

- **WASD** - Move player
- **Enter** - Submit SQL command in terminal
- **Click** - Click on homebase to see welcome message

## UI Elements

- **Top-left**: Player coordinates (X, Z)
- **Top-right**: Control hints
- **Bottom**: SQL terminal with input/output
- **Center**: Game world canvas

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas
- ES6 JavaScript features
- CSS Flexbox

## License

This project is open source and available for modification and distribution.
