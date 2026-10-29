// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneMin: 2, // each round spawns a random number of drones in [droneMin, droneMax]
  droneMax: 7,
  droneForms: ['quad', 'hex', 'racer', 'delta'],
  boostMultiplier: 1.8,
  boostSeconds: 3,
  boostCooldownSeconds: 8,
  redCoinChance: 0.3,
  redCoinBoostSeconds: 4,
  colors: {
    background: 0x101c31, player: 0x71e8ce, playerBoost: 0xd4fff5,
    coin: 0xffd166, redCoin: 0xe63946, drone: 0xff657a
  }
};
