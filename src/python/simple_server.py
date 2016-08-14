from asyncio import coroutine
from random import randint
from autobahn.asyncio.wamp import ApplicationSession, ApplicationRunner
import asyncio

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

    def __repr__(self):
        return "<Player {p.player_id} {{{p.position}, {p.angle}, {p.speed}}}>".format(p=self)

    def update(self, x, y, angle=None, speed=None):
        self.position = (x, y) 

        if (angle != None):
            self.angle = angle
        if (speed != None):
            self.speed = speed

        self.last_bead = millis()

    def unwrap(self):
        (x, y) = self.position
        return (x, y, self.angle, self.speed)



class SimpleServer(ApplicationSession):
    @coroutine
    def onJoin(self, details):
        self.clients = []
        print("Server ready")

        def register_client(session_id):
            player_id = len(self.clients)
            (x, y) = (randint(0, canvas_size[0]), randint(0, canvas_size[1]))
            player = Player((x, y), player_id=player_id, session_id=session_id) 
            print("Registered Client {}".format(len(self.clients)))
            self.clients.append(player)
            return (player_id, x, y)

        def recv_player_updates(unique, x, y, angle, speed):
            if (unique >= 0 and unique < len(self.clients)):
                self.clients[unique].update(x, y, angle, speed) 

        
        yield from self.register(register_client, app_uri + "register_client") 
        yield from self.subscribe(recv_player_updates, app_uri + "player_update")

        while True:
            yield from self.send_all_player_updates()

    @coroutine
    def send_all_player_updates(self):
        for idx, client in enumerate(self.clients):
            players = self.clients[:idx] + self.clients[idx+1:]
            players = [player.unwrap() for player in players] 
            self.publish(app_uri + "player_positions", players, 
                    eligible_authid=client.session_id)
        yield from asyncio.sleep(0.1)

if __name__ == "__main__":
    runner = ApplicationRunner(url="ws://localhost:8081/ws", realm="hyperspace")
    runner.run(SimpleServer)
