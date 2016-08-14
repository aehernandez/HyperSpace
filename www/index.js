var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'hyperspace', {
    preload: preload, create: create, update: update});

var ship;
var bullets;
var cursors;
var ship_velocity = 10;
var ship_angular_velocity = 10;

function preload() {
    game.load.image('ship', 'assets/sprites/triangle.png');
    game.load.image('bullet', 'assets/sprites/bullet.png');
}

function create() {
    // Canvas Mode, the following gives performance (?)
    //game.renderer.clearBeforeRender = false;
    game.renderer.roundPixels = true;

    game.physics.startSystem(Phaser.Physics.ARCADE);

    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;

    bullets.createMultiple(40, 'bullet');
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 0.5);

    ship = game.add.sprite(400, 400, 'ship');    
    ship.scale.set(0.4);
    ship.anchor.set(0.5);

    game.physics.enable(ship, Phaser.Physics.ARCADE);

    ship.body.drag.set(100);
    ship.body.maxVelocity.set(200);
    ship.body.angularDrag = 250 ;

    // Enable Game Inputs
    cursors = game.input.keyboard.createCursorKeys();
    game.input.keyboard.addKeyCapture([Phaser.Keyboard.SPACEBAR]);
}

function update() {
    if (cursors.left.isDown) {
        ship.body.angularVelocity += -ship_angular_velocity;
    } else if (cursors.right.isDown) {
        ship.body.angularVelocity += ship_angular_velocity;
    }


    if (cursors.up.isDown) {
        ship.body.velocity = Phaser.Point.add(ship.body.velocity, 
                game.physics.arcade.velocityFromAngle(ship.angle, ship_velocity));
    } else if (cursors.down.isDown) {
        ship.body.velocity = Phaser.Point.add(ship.body.velocity, 
                game.physics.arcade.velocityFromAngle(ship.angle, -ship_velocity));
    }

    if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
        fireBullet();
    }
}


var bullet_timer = 0;
function fireBullet() {
    if (game.time.now > bullet_timer) {
        var bullet = bullets.getFirstExists(false);
        if (bullet) {
            bullet_timer = game.time.now + 100;
            offset = game.physics.arcade.velocityFromAngle(ship.angle, 50);
            bullet.reset(ship.x + offset.x, ship.y + offset.y);
            bullet.lifespan = 1000;
            bullet.rotation = ship.rotation;
            game.physics.arcade.velocityFromAngle(ship.angle, 500, bullet.body.velocity);
        }
    }
}

function get_client_id() {
    // TODO: Talk to server to get id
}

