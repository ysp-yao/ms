#include "ws_client.hpp"
#include "ws_server.h"
#include <string>
#include <thread>


#include <mutex>



//int main() {
//
//
//
//  WSClient client;
//  WSServer wsserver;
//
//  auto cb = [&client, &wsserver](const boost::beast::multi_buffer& buffer, bool is_from_client) {
//    std::stringstream ss;
//    ss << boost::beast::buffers(buffer.data());
//    auto str = ss.str();
//    if (is_from_client) {
//      client.Send(buffer);
//      std::cout << "ToServer:" << str << "\n\n\n";
//    }
//    else {
//      wsserver.Send(buffer);
//      std::cout << "ToClient:" << str << "\n\n\n";
//    }
//  };
//
//  client.SetCB(cb);
//  wsserver.SetCB(cb);
//
//
//
//  std::thread t2(std::bind(&WSServer::run, &wsserver));
//
//
//  std::thread t1(std::bind(&WSClient::Run, &client));
//
//  
//  while (1);
//  return 0;
//}



std::mutex g_pages_mutex;

websocket::stream<tcp::socket>* p_ws;
WSClient* p_client;

void
do_session(tcp::socket& socket)
{
  try
  {
    // Construct the stream by moving in the socket
    websocket::stream<tcp::socket> ws{ std::move(socket) };
    p_ws = &ws;

    // Accept the websocket handshake
    ws.accept();

    for (;;)
    {
      // This buffer will hold the incoming message
      boost::beast::multi_buffer buffer;

      // Read a message
      ws.read(buffer);

      p_client->Send(buffer);

      std::stringstream ss;
      ss << boost::beast::buffers(buffer.data());
      auto str = ss.str();

      {
        std::lock_guard<std::mutex> guard(g_pages_mutex);
        std::cout << "ToServer:" << str << "\n\n\n";
      }
      // Echo the message back
      //ws.text(ws.got_text());
      //ws.write(buffer.data());
    }
  }
  catch (boost::system::system_error const& se)
  {
    // This indicates that the session was closed
    if (se.code() != websocket::error::closed)
      std::cerr << "Error: " << se.code().message() << std::endl;
  }
  catch (std::exception const& e)
  {
    std::cerr << "Error: " << e.what() << std::endl;
  }
}


int main() {

  WSClient client;
  p_client = &client;

    auto cb = [&client](const boost::beast::multi_buffer& buffer, bool is_from_client) {
      std::stringstream ss;
      ss << boost::beast::buffers(buffer.data());
      auto str = ss.str();

      p_ws->write(boost::asio::buffer(str));
//      if (is_from_client) {
        //client.Send(buffer);
      {
        std::lock_guard<std::mutex> guard(g_pages_mutex);
        std::cout << "ToClient:" << str << "\n\n\n";
      }
      //}
      //else {
      //  //wsserver.Send(buffer);
      //  std::cout << "ToClient:" << str << "\n\n\n";
      //}
    };
  
    client.SetCB(cb);

    std::thread t1(std::bind(&WSClient::Run, &client));

     
     
     auto const address = boost::asio::ip::make_address("127.0.0.1");
  auto const port = static_cast<unsigned short>(std::atoi("8080"));

  // The io_context is required for all I/O
  boost::asio::io_context ioc{ 1 };

  // The acceptor receives incoming connections
  tcp::acceptor acceptor{ ioc,{ address, port } };
  for (;;)
  {
    // This will receive the new connection
    tcp::socket socket{ ioc };

    // Block until we get a connection
    acceptor.accept(socket);

    // Launch the session, transferring ownership of the socket
    std::thread{ std::bind(
      &do_session,
      std::move(socket)) }.detach();
  }


  return 0;
}