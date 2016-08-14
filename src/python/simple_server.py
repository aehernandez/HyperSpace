from asyncio import coroutine
from random import randint
from autobahn.asyncio.wamp import ApplicationSession, ApplicationRunner

# helpfer function to get the current time
import time
millis = lambda: int(round(time.time() * 1000))

app_uri = "com.hyperspace."
canvas_size = (800, 600)

class Player():
    def __init__(self, position, angle=0, speed=0, session_id=None,
            player_id=None):
        self.position = position
        self.angle = angle
        self.speed = speed
        self.last_beat = millis() 
        self.player_id = player_id 
        self.session_id = session_id


    def update(self, x, y, angle=None, speed=None):
        self.position = (x, y) 

        if (angle != None):
            self.angle = angle
        if (speed != None):
            self.speed = speed

        self.last_bead = millis()



class SimpleServer(ApplicationSession):
    @coroutine
    def onJoin(self, details):
        self.clients = []
        print("Server ready")


        def register_client(x, y, angle, speed, session_id):
            player_id = len(self.clients)
            player = Player((x, y), angle, speed, player_id=player_id,
                    session_id=session_id) 
            print("Registered Client {}".format(len(self.clients)))
            self.clients.append(Player)

            return (player_id, randint(0, canvas_size[0]),
                    randint(0, canvas_size[1]))

        def update_player(unique, x, y, angle, speed):
            self.clients[unique].update(x, y, angle, speed) 

        def send_player_updates():


        yield from self.register(register_client, app_uri + "register_client") 
        yield from self.subscribe(update_player, app_uri + "update_player)

if __name__ == "__main__":
    runner = ApplicationRunner(url="ws://localhost:8081/ws", realm="hyperspace")
    runner.run(SimpleServer)
