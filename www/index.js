var connection = new autobahn.Connection({
    //TODO: Get this from the server
    url: "ws://" + window.location.hostname + ":8081/ws",
    realm: "hyperspace"
});

var app_uri = "com.hyperspace.";

var canvas_size = [800, 600];
var world_size = [4000, 4000];

connection.onopen = function (session) {

    var game = new Phaser.Game(canvas_size[0], canvas_size[1], Phaser.CANVAS, 'hyperspace', {
        preload: preload, create: create, update: update, render: render});
    

    var ship;
    var bullets;
    var cursors;
    var enemies;
    var known_enemies = {};
    var enemy_bullets;
    var ship_velocity = 10;
    var ship_angular_velocity = 10;
    
    function render() {
        game.debug.text(game.time.fps || '--', 2, 14, '#00ff00');
    }

    function preload() {
        game.load.image('ship', 'assets/sprites/triangle.png');
        game.load.image('bullet', 'assets/sprites/bullet.png');
        game.load.image('stars_bg', 'assets/bg/stars.jpg');
        game.time.advancedTiming = true;
    }

    function update_others(others) {
        others[0].forEach((other) => {
            // unpack other
            var id = other[0];
            var x = other[1];
            var y = other[2];
            var angle = other[3];
            var vx = other[4];
            var vy = other[5];

            var enemy;

            if (id in known_enemies) {
                enemy = known_enemies[id];
                enemy.position.x = x;
                enemy.position.y = y;
            } else {
                enemy = enemies.getFirstExists(false);
                enemy.reset(x, y);
                enemy.scale.set(0.4);
                enemy.anchor.set(0.5);
                known_enemies[id] = enemy;
            }
            
            enemy.angle = angle;
            enemy.body.velocity.x = vx;
            enemy.body.velocity.y = vy;
        });

        //TODO: If an enemy wasn't sent in this update that we know about,
        //remove it
    }

    function remove_enemy(id) {
        if (id == session.id) {
            // this client is being kicked
            connection.close();
            alert('You have been kicked from the game');
        } else {
            // another client has left
            enemy = known_enemies[id];
            enemies.remove(enemy);
            delete known_enemies[id];
        }
    }

    function register_bullet(values) {
        //unpack values
        var x = values[0];
        var y = values[1];
        var angle = values[2];
        var velocity = values[3];
        var lifespan = values[4];

        create_bullet(enemy_bullets, x, y, angle, velocity);
    }

    function create_bullet(group, x, y, angle, velocity, lifespan = 1000) {
        var bullet = group.getFirstExists(false);

        if (bullet) {
            bullet.reset(x, y);
            bullet.lifespan = 1000;
            bullet.angle = angle;
            game.physics.arcade.velocityFromAngle(angle, velocity, bullet.body.velocity);
            return true;
        } else {
            return false;
        }
    }

    function broadcast_bullet(x, y, angle, velocity, lifespan = 1000) {
        session.publish(app_uri + 'bullet_broadcast', [x, y, angle, velocity, lifespan]);
    }

    function create() {
        // Canvas Mode, the following gives performance (?)
        // game.renderer.clearBeforeRender = false;
        game.renderer.roundPixels = true;
        game.stage.disableVisibilityChange = true;

        game.world.setBounds(0, 0, world_size[0], world_size[1]);
        bg = game.add.tileSprite(0, 0, world_size[0], world_size[1], 'stars_bg');

        game.physics.startSystem(Phaser.Physics.ARCADE);

        bullets = game.add.group();
        bullets.enableBody = true;
        bullets.physicsBodyType = Phaser.Physics.ARCADE;
        bullets.createMultiple(40, 'bullet');
        bullets.setAll('anchor.x', 0.5);
        bullets.setAll('anchor.y', 0.5);

        enemy_bullets = game.add.group();
        enemy_bullets.enableBody = true;
        enemy_bullets.physicsBodyType = Phaser.Physics.ARCADE;
        enemy_bullets.createMultiple(100, 'bullet');
        enemy_bullets.setAll('anchor.x', 0.5);
        enemy_bullets.setAll('anchor.y', 0.5);

        
        enemies = game.add.group();
        enemies.enableBody = true;
        enemies.physicsBodyType = Phaser.Physics.ARCADE;
        enemies.createMultiple(40, 'ship');

        session.call(app_uri + "register_client", [session.id]).then(function(result) {
            var player_id = result[0];
            var x = result[1];
            var y = result[2];
            
            ship = game.add.sprite(x, y, 'ship');    
            ship.scale.set(0.4);
            ship.anchor.set(0.5);

            game.physics.enable(ship, Phaser.Physics.ARCADE);
            ship.body.collideWorldBounds = true;

            ship.body.drag.set(100);
            ship.body.maxVelocity.set(200);
            ship.body.angularDrag = 250;
            ship.body.maxAngular = 100;
            
            // Have the camera follow the player
            game.camera.follow(ship, Phaser.Camera.FOLLOW_TOPDOWN);

            function send_updates() {
                if (document.hasFocus()) {
                    session.publish(app_uri + 'player_update', 
                            [session.id, ship.position.x, ship.position.y, ship.angle, 
                            ship.body.velocity.x, ship.body.velocity.y]);
                }
            }

            window.setInterval(send_updates, 10);
            
            session.subscribe(app_uri + "bullet_broadcast", register_bullet);
            session.subscribe(app_uri + "player_positions", update_others);
            session.subscribe(app_uri + "deregister_client", remove_enemy);
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
            offset = game.physics.arcade.velocityFromAngle(ship.angle, 50);
            var x = ship.x + offset.x;
            var y = ship.y + offset.y;
            if (create_bullet(bullets, x, y, ship.angle, 500)) {
                bullet_timer = game.time.now + 100;
                broadcast_bullet(x, y, ship.angle, 500);
            }
        }
    }
}

connection.open();
