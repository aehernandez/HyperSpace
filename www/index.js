var connection = new autobahn.Connection({
    url: "ws://localhost:8081/ws",
    realm: "hyperspace"
});

var app_uri = "com.hyperspace.";

connection.onopen = function (session) {

    var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'hyperspace', {
        preload: preload, create: create, update: update, render: render});

    var ship;
    var bullets;
    var cursors;
    var enemies;
    var ship_velocity = 10;
    var ship_angular_velocity = 10;
    
    function render() {
        game.debug.text(game.time.fps || '--', 2, 14, '#00ff00');
    }

    function preload() {
        game.load.image('ship', 'assets/sprites/triangle.png');
        game.load.image('bullet', 'assets/sprites/bullet.png');
        game.time.advancedTiming = true;
    }

    function create() {
        // Canvas Mode, the following gives performance (?)
        // game.renderer.clearBeforeRender = false;
        game.renderer.roundPixels = true;

        game.physics.startSystem(Phaser.Physics.ARCADE);

        bullets = game.add.group();
        bullets.enableBody = true;
        bullets.physicsBodyType = Phaser.Physics.ARCADE;

        bullets.createMultiple(40, 'bullet');
        bullets.setAll('anchor.x', 0.5);
        bullets.setAll('anchor.y', 0.5);

        // enemies = game.add.group();
        // enemies.enableBody = true;
        // enemies.physicsBodyType = Phaser.Physics.ARCADE;
        // enemies.createMultiple(40, 'ship');
        // enemies.setAll('anchor.x', 0.5);
        // enemies.setAll('anchor.y', 0.5);
        // enemies.setAll('scale', 0.4);

        session.call(app_uri + "register_client", [session.id]).then(function(result) {
            var player_id = result[0];
            var x = result[1];
            var y = result[2];
            
            
            ship = game.add.sprite(x, y, 'ship');    
            ship.scale.set(0.4);
            ship.anchor.set(0.5);

            game.physics.enable(ship, Phaser.Physics.ARCADE);

            ship.body.drag.set(100);
            ship.body.maxVelocity.set(200);
            ship.body.angularDrag = 250;

            function send_updates() {
                session.publish(app_uri + 'player_update', 
                        [player_id, ship.x, ship.y, ship.angle, ship.body.speed])
            }

            window.setInterval(send_updates, 1000);
        },
        function (error) {
            console.error("problem occured while registering this client.");
        });

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
}

connection.open();
