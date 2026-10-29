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
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a }
};
