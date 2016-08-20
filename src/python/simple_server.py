from asyncio import coroutine
from random import randint
from autobahn.asyncio.wamp import ApplicationSession, ApplicationRunner
from autobahn.wamp.types import PublishOptions
import asyncio

from threading import Thread as Process

# helpfer function to get the current time
import time
millis = lambda: int(round(time.time() * 1000))

app_uri = "com.hyperspace."
canvas_size = (800, 600)

def call_in_bg(target, *, loop=None, executor=None):
    """Schedules and starts target callable as a background task

    If not given, *loop* defaults to the current thread's event loop
    If not given, *executor* defaults to the loop's default executor

    Returns the scheduled task.
    """
    if loop is None:
        loop = asyncio.get_event_loop()
    if callable(target):
        return loop.run_in_executor(executor, target)
    raise TypeError("target must be a callable, "
                    "not {!r}".format(type(target)))

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
        return "<Player {p.session_id} {{{p.position}, {p.angle}, {p.velocity}}}>".format(p=self)

    def update(self, x, y, angle=None, velocity=None):
        self.position = (x, y) 

        if (angle != None):
            self.angle = angle
        if (velocity != None):
            self.velocity = velocity 

        self.last_beat = millis()

    def unwrap(self):
        (x, y) = self.position
        (vx, vy) = self.velocity
        return (self.session_id, x, y, self.angle, vx, vy)


class SimpleServer(ApplicationSession):
    @coroutine
    def onJoin(self, details):
        self.clients = {} 
        print("Server ready")

        def register_client(session_id):
            (x, y) = (randint(0, canvas_size[0]), randint(0, canvas_size[1]))
            player = Player((x, y), player_id=1, session_id=session_id) 
            self.clients[session_id] = player
            print("Registered Client {}".format(session_id))
            return (session_id, x, y)

        def deregister_client(session_id):
            del self.clients[session_id]

        def recv_player_updates(session_id, x, y, angle, vx, vy):
            if session_id in self.clients:
                self.clients[session_id].update(x, y, angle, (vx, vy)) 

        
        yield from self.register(register_client, app_uri + "register_client") 
        yield from self.subscribe(recv_player_updates, app_uri + "player_update")
        yield from self.subscribe(deregister_client, app_uri +
        "deregister_client")

        asyncio.async(self.send_all_player_updates())
        asyncio.async(self.check_player_heartbeat())


    @coroutine
    def send_all_player_updates(self):
        while True:
            for client in self.clients.values():
                unwrapped_players = [player.unwrap() for player in
                        self.clients.values() if player.session_id !=
                        client.session_id] 
                if len(unwrapped_players) > 0:
                    self.publish(app_uri + "player_positions", unwrapped_players,
                               options=PublishOptions(eligible=[client.session_id])) 

            yield from asyncio.sleep(0.01)

    @coroutine
    def check_player_heartbeat(self):
        while True:
            now = millis()
            for client in self.clients.values():
                if now - client.last_beat > 2000:
                    self.publish(app_uri + "deregister_client",
                            client.session_id,
                            options=PublishOptions(exclude_me=False))
                    print("Player {} has timed out".format(client.session_id))

            yield from asyncio.sleep(2)


if __name__ == "__main__":
    runner = ApplicationRunner(url="ws://localhost:8081/ws", realm="hyperspace")
    runner.run(SimpleServer)
