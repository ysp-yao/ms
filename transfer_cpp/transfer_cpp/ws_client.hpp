#ifndef WS_CLIENT_H_
#define WS_CLIENT_H_

#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/connect.hpp>

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/beast/websocket/ssl.hpp>

#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/connect.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/beast/websocket/ssl.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/bind_executor.hpp>
#include <boost/asio/strand.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <algorithm>
#include <cstdlib>
#include <functional>
#include <iostream>
#include <memory>
#include <string>
#include <thread>
#include <vector>
using tcp = boost::asio::ip::tcp;
namespace websocket = boost::beast::websocket;
namespace ssl = boost::asio::ssl;

class WSClient {

public:
  WSClient() {
    path_ =  "/?peerName=" + peername + "&roomId=" + roomid;
  }

  void SetCB(std::function<void(const boost::beast::multi_buffer& buffer, bool is_from_client)> cb) {
    cb_ = cb;
  }

  void Run() {
    Connect();
    Loop();
  }

  void Send(const boost::beast::multi_buffer& buffer) {

    std::stringstream ss;
    ss << boost::beast::buffers(buffer.data());
    auto str = ss.str();
   
    ws.async_write(boost::asio::buffer(str), std::bind(
      &WSClient::onWriteDone,
      this,
      std::placeholders::_1,
      std::placeholders::_2
    ));
  }

  void onWriteDone(boost::system::error_code ec, std::size_t bytes_transferred) {
    int a = 10;
  }


private:
  void Connect() {
    resolver.async_resolve(host, port, std::bind( &WSClient::onResolve, this,std::placeholders::_1, std::placeholders::_2));
  }

  void Loop() {
    while (true) {
      ioc.poll();
    }
  }


private:
  void onResolve(
    boost::system::error_code ec,
    tcp::resolver::results_type results) {
    if (ec) {
      auto error = "Could not resolve host address";
      //logError(error);
      //listener->onTransportError(error);
    }
    else {
      boost::asio::async_connect(
        ws.next_layer().next_layer(),
        results.begin(),
        results.end(),
        std::bind(&WSClient::onConnect,this,std::placeholders::_1));
    }
  }

  void onConnect(boost::system::error_code ec) {
    if (ec) {
      auto error = "Could not connect to the host";
      //logError(error);
      //listener->onTransportError(error);
    }
    else {
      ws.next_layer().async_handshake(
        ssl::stream_base::client,
        std::bind(
          &WSClient::onSSLHandshake,
          this,
          std::placeholders::_1));
    }
  }

  void onSSLHandshake(boost::system::error_code ec) {
    if (ec) {
      auto error = "Could not perform SSL handshake";
      //logError(error);
      //listener->onTransportError(error);
    }
    else {
      ws.async_handshake_ex(
        host,
        path_,
        [](websocket::request_type& m) {
        m.insert(boost::beast::http::field::sec_websocket_protocol, "protoo");
      },
        std::bind(
          &WSClient::onHandshake,
          this,
          std::placeholders::_1));
    }
  }

  void onHandshake(boost::system::error_code ec) {
    if (ec) {
      auto error = "Could not perform WebSocket handshake";
      //logError(error);
      //listener->onTransportError(error);
    }
    else {
      //listener->onTransportConnected();
      std::cout << "连接到WebSocket服务器\n";
      readMessage();
    }
  }

  void readMessage() {
    // Clear the buffer
    buffer.consume(buffer.size());

    ws.async_read(
      buffer,
      std::bind(
        &WSClient::onReadMessage,
        this,
        std::placeholders::_1,
        std::placeholders::_2
      )
    );
  }

  void onReadMessage(
    boost::system::error_code ec,
    std::size_t bytes_transferred) {
    boost::ignore_unused(bytes_transferred);

    // This indicates that the session was closed
    if (ec == websocket::error::closed) {
      //listener->onTransportClose();
      return;
    }

    if (ec) {
      //logError("ERROR: could not receive message! " + ec.message());
      return;
    }

    cb_(buffer, false);
    
    //std::stringstream ss;
    //ss << boost::beast::buffers(buffer.data());

    // Clear the buffer
    buffer.consume(buffer.size());

    //auto str = ss.str();

    // log("Message: " + str);

    // Read the next message
    readMessage();

    //json parsed;
    //try {
    //  parsed = json::parse(str);
    //}
    //catch (json::type_error& e) {
    //  logError("Could not parse JSON: " + str);
    //  throw e;
    //}
    //handleMessage(parsed);


  }


private:
  boost::asio::io_context ioc;
  ssl::context ctx{ ssl::context::sslv23_client };
  websocket::stream<ssl::stream<tcp::socket>> ws{ ioc, ctx };
  tcp::resolver resolver{ioc};
  boost::beast::multi_buffer buffer; // used to read incoming websocket messages
   
private:
  std::string host = "172.16.16.194";
  std::string port = "3443";
  std::string peername = "TestPeer";
  std::string roomid = "TestRoom";
  std::string path_;

  std::function<void(const boost::beast::multi_buffer& buffer, bool is_from_client)> cb_;

};





#endif // WS_CLIENT_H_