from asyncio import coroutine
from random import randint
from autobahn.asyncio.wamp import ApplicationSession, ApplicationRunner
from autobahn.wamp.types import PublishOptions
import asyncio

# helpfer function to get the current time
import time
millis = lambda: int(round(time.time() * 1000))

app_uri = "com.hyperspace."
canvas_size = (800, 600)

class Player():
    def __init__(self, position, angle=0, velocity=(0, 0), session_id=None,
            player_id=None):
        self.position = position
        self.angle = angle
        self.velocity = velocity 
        self.last_beat = millis() 
        self.player_id = player_id 
        self.session_id = session_id

    def __repr__(self):
        return "<Player {p.player_id} {{{p.position}, {p.angle}, {p.velocity}}}>".format(p=self)

    def update(self, x, y, angle=None, velocity=None):
        self.position = (x, y) 

        if (angle != None):
            self.angle = angle
        if (velocity != None):
            self.velocity = velocity 

        self.last_bead = millis()

    def unwrap(self):
        (x, y) = self.position
        (vx, vy) = self.velocity
        return (self.session_id, x, y, self.angle, vx, vy)



class SimpleServer(ApplicationSession):
    @coroutine
    def onJoin(self, details):
        self.clients = []
        print("Server ready")

        def register_client(session_id):
            player_id = len(self.clients)
            (x, y) = (randint(0, canvas_size[0]), randint(0, canvas_size[1]))
            player = Player((x, y), player_id=player_id, session_id=session_id) 
            print("Registered Client {} with session id {}".format(player_id,
                session_id))
            self.clients.append(player)
            return (player_id, x, y)

        def recv_player_updates(unique, x, y, angle, vx, vy):
            if (unique >= 0 and unique < len(self.clients)):
                self.clients[unique].update(x, y, angle, (vx, vy)) 

        
        yield from self.register(register_client, app_uri + "register_client") 
        yield from self.subscribe(recv_player_updates, app_uri + "player_update")

        while True:
            yield from self.send_all_player_updates()

    @coroutine
    def send_all_player_updates(self):
        for idx, client in enumerate(self.clients):
            players = self.clients[:idx] + self.clients[idx+1:]
            unwrapped_players = [player.unwrap() for player in players] 
            if len(unwrapped_players) > 0:
                try:
                    options = PublishOptions(eligible=[client.session_id])
                    self.publish(app_uri + "player_positions", unwrapped_players,
                               options=options) 
                except AssertionError:
                    import sys
                    import traceback
                    _, _, tb = sys.exc_info()
                    traceback.print_tb(tb)
                    tb_info = traceback.extract_tb(tb)
                    filename, line, func, text = tb_info[-1]
                    print('An error occurred on line {} in statement {}'.format(line, text))
                    exit(1)
        yield from asyncio.sleep(0.1)

if __name__ == "__main__":
    # PublishOptions(eligible=50)
    runner = ApplicationRunner(url="ws://localhost:8081/ws", realm="hyperspace")
    runner.run(SimpleServer)
