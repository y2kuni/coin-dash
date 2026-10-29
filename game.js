/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.coinIsRed = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.boostUntil = 0;
    this.boostReadyAt = 0; // when SPACE can trigger the next boost
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.makeDroneTextures();
    this.drones = this.physics.add.group();
    const droneCount = Phaser.Math.Between(c.droneMin, c.droneMax);
    for (let i = 0; i < droneCount; i++) {
      // Spawn at a random spot well away from the player so the round doesn't end instantly.
      let x, y;
      do {
        x = Phaser.Math.Between(30, c.width - 30);
        y = Phaser.Math.Between(74, c.height - 30);
      } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 150);
      const drone = this.createDrone(x, y, Phaser.Utils.Array.GetRandom(c.droneForms));
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = Phaser.Math.DegToRad(Phaser.Math.Between(0, 359));
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      // Red coins also give a short speed boost.
      if (this.coinIsRed) this.boostPlayer(COIN_DASH.redCoinBoostSeconds);
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.addCapture('SPACE'); // stop the page from scrolling
    this.input.keyboard.on('keydown-SPACE', () => this.tryBoost());
  }

  boostPlayer(seconds) {
    this.boostUntil = Math.max(this.boostUntil, this.time.now + seconds * 1000);
  }

  // SPACE boost: only when ready, then cooldown starts after the boost ends.
  tryBoost() {
    if (this.finished || this.time.now < this.boostReadyAt) return;
    this.boostPlayer(COIN_DASH.boostSeconds);
    this.boostReadyAt = this.boostUntil + COIN_DASH.boostCooldownSeconds * 1000;
  }

  boostLabel() {
    const now = this.time.now;
    if (now < this.boostUntil) return `Boost: ${Math.ceil((this.boostUntil - now) / 1000)}s`;
    if (now < this.boostReadyAt) return `Boost: wait ${Math.ceil((this.boostReadyAt - now) / 1000)}s`;
    return 'Boost: READY';
  }

  // Draw each drone form once into a texture (no image files needed).
  makeDroneTextures() {
    const red = COIN_DASH.colors.drone, dark = 0xa83246, rotor = 0xffd6dc;
    const draw = (key, w, h, paint) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ add: false });
      paint(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };
    // Rotor: light ring with a red hub.
    const rotorAt = (g, x, y, r) => {
      g.lineStyle(2, rotor, 0.9).strokeCircle(x, y, r);
      g.fillStyle(rotor, 0.25).fillCircle(x, y, r);
      g.fillStyle(red, 1).fillCircle(x, y, 2);
    };
    // Arms radiating from the centre, with a rotor at each tip.
    const multirotor = (g, size, arms, armWidth, rotorR, startDeg) => {
      const m = size / 2, reach = m - rotorR - 1;
      g.lineStyle(armWidth, dark, 1);
      for (let i = 0; i < arms; i++) {
        const a = (startDeg + i * 360 / arms) * Math.PI / 180;
        g.lineBetween(m, m, m + Math.cos(a) * reach, m + Math.sin(a) * reach);
      }
      for (let i = 0; i < arms; i++) {
        const a = (startDeg + i * 360 / arms) * Math.PI / 180;
        rotorAt(g, m + Math.cos(a) * reach, m + Math.sin(a) * reach, rotorR);
      }
    };
    draw('drone-quad', 32, 32, (g) => {
      multirotor(g, 32, 4, 3, 6, 45);
      g.fillStyle(red, 1).fillRoundedRect(10, 10, 12, 12, 3);
      g.fillStyle(rotor, 1).fillCircle(20, 16, 1.5); // front light
    });
    draw('drone-hex', 34, 34, (g) => {
      multirotor(g, 34, 6, 2, 5, 0);
      g.fillStyle(red, 1).fillCircle(17, 17, 7);
      g.lineStyle(2, dark, 1).strokeCircle(17, 17, 7);
    });
    draw('drone-racer', 30, 30, (g) => {
      multirotor(g, 30, 4, 4, 5, 45);
      g.fillStyle(red, 1).fillRect(9, 12, 12, 6);
      g.fillStyle(dark, 1).fillRect(19, 13, 3, 4); // camera
    });
    draw('drone-delta', 34, 30, (g) => {
      // Delta wing pointing right (+x), so rotation follows velocity.
      g.fillStyle(red, 1).fillTriangle(33, 15, 3, 1, 3, 29);
      g.fillStyle(dark, 1).fillTriangle(33, 15, 9, 11, 9, 19);
      g.fillStyle(dark, 1).fillRect(1, 12, 5, 6); // pusher motor
      g.lineStyle(2, rotor, 0.9).lineBetween(1, 8, 1, 22); // pusher prop
    });
  }

  // Create one physics-enabled drone of the given form.
  createDrone(x, y, form) {
    const key = this.textures.exists(`drone-${form}`) ? `drone-${form}` : 'drone-quad';
    const drone = this.physics.add.image(x, y, key);
    drone.droneForm = form;
    this.fitDroneBody(drone);
    return drone;
  }

  // Circular hitbox around the drone body, smaller than the arms/rotors.
  fitDroneBody(drone) {
    const r = 11;
    drone.body.setCircle(r, drone.width / 2 - r, drone.height / 2 - r);
  }

  // Turn each drone to face where it is flying (hitbox is a circle, so this is visual only).
  faceDrones() {
    this.drones.children.iterate((d) => {
      if (d && d.body && d.body.speed > 1) d.rotation = Math.atan2(d.body.velocity.y, d.body.velocity.x);
    });
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
    // Some coins are red boost coins, drawn with a white ring.
    this.coinIsRed = Math.random() < c.redCoinChance;
    this.coin.setFillStyle(this.coinIsRed ? c.colors.redCoin : c.colors.coin);
    if (this.coinIsRed) this.coin.setStrokeStyle(3, 0xffffff);
    else this.coin.setStrokeStyle();
  }

  update() {
    if (this.finished) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const boosted = this.time.now < this.boostUntil;
    const speed = COIN_DASH.playerSpeed * (this.time.now < this.boostUntil ? COIN_DASH.boostMultiplier : 1);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(speed);
    this.player.body.setVelocity(direction.x, direction.y);
    // Visual cue while boosted: brighter colour and slightly larger.
    this.player.setFillStyle(boosted ? COIN_DASH.colors.playerBoost : COIN_DASH.colors.player);
    this.player.setScale(boosted ? 1.2 : 1);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}        ${this.boostLabel()}        Time: ${seconds}s`);
    if (seconds === 0) this.finish('Time is up!');
    this.faceDrones();
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 150, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
