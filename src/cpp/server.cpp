
#include "parameters.hpp"
#include <autobahn/autobahn.hpp>
#include <boost/asio.hpp>
#include <boost/version.hpp>
#include <boost/date_time/posix_time/posix_time.hpp>
#include <iostream>
#include <memory>
#include <string>
#include <thread>
#include <tuple>

using namespace std;

class Position {
    public:
        int x;
        int y;
}

class Player {
    public:
        Position position;
        int angle;
        int speed;
}

void register_client(autobahn::wamp_inocation invocation) {
    static int clients = 0;

    std::cout << "Registering Client " << clients; 
    invocation->result(clients); 
    clients += 1;
}

int main() {

    try {
        auto parameters = get_parameters(argc, argv);
        boost::asio:io_service io;
        bool debug = parameters->debug();

        auto transport = std::make_shared<autobahn::wamp_tcp_transport>(io, parameters->rawsock
    }
    auto r1 = session.provide("com.hyperspace.client_id",
            [](autobahn::wamp_invocation invocation) {
                std::cout << "New Client" << endl;
                uint64_t x = invocation->argument<uint64_t>(0);
                return x * x;
            })
    .then([](boost::future<autobahn::wamp_registration> reg) {
                std::cout << "Registered with ID " << reg.get().id() << std::endl;
            }); 
}
