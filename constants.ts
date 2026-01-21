export const GAME_CONSTANTS = {
  // 3D World Units
  LANE_WIDTH: 3.5,
  PLAYER_SPEED_Z: 0.2, // Base forward speed (visual only, world moves)
  JUMP_HEIGHT: 3.5,
  JUMP_DURATION: 0.7, // Seconds
  GRAVITY: 20,
  
  // Difficulty
  START_SPEED: 15, // Units per second world movement
  MAX_SPEED: 40,
  SPEED_INCREMENT: 0.5, // Per 5 seconds or score interval
  SPAWN_DISTANCE: -60, // Where obstacles spawn (negative Z)
  SPAWN_INTERVAL_BASE: 1.5, // Seconds

  // Controls
  LANE_CHANGE_COOLDOWN: 400, // ms
  JUMP_COOLDOWN: 800, // ms

  // Pose Detection Thresholds
  LEAN_THRESHOLD_LEFT: 0.60, // Camera right (mirror)
  LEAN_THRESHOLD_RIGHT: 0.40, // Camera left (mirror)
  JUMP_THRESHOLD_Y: 0.05, // Rise relative to baseline

  // Lives & Damage
  INVINCIBILITY_DURATION: 2000, // ms
};

export const COLORS = {
  // Lunar New Year Theme - Red & Gold
  LAVA_EMISSIVE: 0xcc0000,  // Deep red for obstacles
  LAVA_CORE: 0xff0000,

  TRACK_MAIN: 0x8B0000,     // Dark red track
  TRACK_STRIPE: 0xDAA520,   // Gold stripe

  // Monkey King Colors
  MONKEY_FUR: 0xDAA520,     // Golden fur
  MONKEY_FACE: 0xFFE4B5,    // Peach face
  MONKEY_ARMOR: 0xFFD700,   // Gold armor
  MONKEY_CROWN: 0xFFD700,   // Golden crown
  MONKEY_STAFF: 0x8B4513,   // Brown staff
  MONKEY_PANTS: 0xcc0000,   // Red pants

  // LNY Environment
  SKY_MINECRAFT: 0x1a0a2e,  // Deep night sky (festive evening)
  SKY_HORIZON: 0x2d1b4e,    // Purple horizon

  LANTERN_RED: 0xff0000,    // Red lantern
  LANTERN_GOLD: 0xFFD700,   // Gold accent
  GROUND_FESTIVE: 0x2d5016, // Dark green grass

  FIREWORK_RED: 0xff0000,
  FIREWORK_GOLD: 0xFFD700,
  FIREWORK_PINK: 0xff69b4,
};