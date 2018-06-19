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

using tcp = boost::asio::ip::tcp;               // from <boost/asio/ip/tcp.hpp>
namespace websocket = boost::beast::websocket;  // from <boost/beast/websocket.hpp>

                                                //------------------------------------------------------------------------------

                                                // Report a failure
void
fail(boost::system::error_code ec, char const* what)
{
  std::cerr << what << ": " << ec.message() << "\n";
}

// Echoes back all received WebSocket messages
class session : public std::enable_shared_from_this<session>
{
  websocket::stream<tcp::socket> ws_;
  boost::asio::strand<
    boost::asio::io_context::executor_type> strand_;
  boost::beast::multi_buffer buffer_;
  std::function<void(const boost::beast::multi_buffer& buffer, bool is_from_client)> cb_;
  std::string str_;

public:
  // Take ownership of the socket
  explicit
    session(tcp::socket socket, std::function<void(const boost::beast::multi_buffer& buffer, bool is_from_client)> cb)
    : ws_(std::move(socket))
    , strand_(ws_.get_executor())
    , cb_(cb)

  {
  }

  // Start the asynchronous operation
  void
    run()
  {
    // Accept the websocket handshake
    ws_.async_accept(
      boost::asio::bind_executor(
        strand_,
        std::bind(
          &session::on_accept,
          shared_from_this(),
          std::placeholders::_1)));
  }

  void Send(const boost::beast::multi_buffer& buffer) {
    //ws_.async_write(
    //  buffer.data(),
    //  boost::asio::bind_executor(
    //    strand_,
    //    std::bind(
    //      &session::on_write,
    //      shared_from_this(),
    //      std::placeholders::_1,
    //      std::placeholders::_2)));

    std::stringstream ss;
    ss << boost::beast::buffers(buffer.data());
    str_ = ss.str();

    ws_.async_write(boost::asio::buffer(str_), std::bind(
      &session::onWriteDone,
      this,
      std::placeholders::_1,
      std::placeholders::_2
    ));
  }

  void onWriteDone(boost::system::error_code ec, std::size_t bytes_transferred) {
    int a = 10;
  }

  void
    on_accept(boost::system::error_code ec)
  {
    if (ec)
      return fail(ec, "accept");

    // Read a message
    do_read();
  }

  void
    do_read()
  {
    // Read a message into our buffer
    ws_.async_read(
      buffer_,
      boost::asio::bind_executor(
        strand_,
        std::bind(
          &session::on_read,
          shared_from_this(),
          std::placeholders::_1,
          std::placeholders::_2)));
  }

  void
    on_read(
      boost::system::error_code ec,
      std::size_t bytes_transferred)
  {
    boost::ignore_unused(bytes_transferred);

    // This indicates that the session was closed
    if (ec == websocket::error::closed)
      return;

    if (ec)
      fail(ec, "read");

    // Echo the message
    ws_.text(ws_.got_text());


    std::stringstream ss;
    ss << boost::beast::buffers(buffer_.data());
    auto str = ss.str();


    cb_(buffer_, true);
    //ws_.async_write(
    //  buffer_.data(),
    //  boost::asio::bind_executor(
    //    strand_,
    //    std::bind(
    //      &session::on_write,
    //      shared_from_this(),
    //      std::placeholders::_1,
    //      std::placeholders::_2)));
  }

  void
    on_write(
      boost::system::error_code ec,
      std::size_t bytes_transferred)
  {
    boost::ignore_unused(bytes_transferred);

    if (ec)
      return fail(ec, "write");

    // Clear the buffer
    buffer_.consume(buffer_.size());

    // Do another read
    do_read();
  }
};


class WSServer {
public:
  WSServer(){}

  void run()
  {
    init();
    if (!acceptor_.is_open())
      return;
    do_accept();
    ioc.run();
  }

  void Send(const boost::beast::multi_buffer& buffer) {
    session_->Send(buffer);
  }

  void SetCB(std::function<void(const boost::beast::multi_buffer& buffer, bool is_from_client)> cb) {
    cb_ = cb;
  }

private:
  void init() {
    boost::system::error_code ec;

    // Open the acceptor
    acceptor_.open(endpoint.protocol(), ec);
    if (ec)
    {
      fail(ec, "open");
      return;
    }

    // Allow address reuse
    acceptor_.set_option(boost::asio::socket_base::reuse_address(true));
    if (ec)
    {
      fail(ec, "set_option");
      return;
    }

    // Bind to the server address
    acceptor_.bind(endpoint, ec);
    if (ec)
    {
      fail(ec, "bind");
      return;
    }

    // Start listening for connections
    acceptor_.listen(boost::asio::socket_base::max_listen_connections, ec);
    if (ec)
    {
      fail(ec, "listen");
      return;
    }
  }

  void do_accept()
  {
    acceptor_.async_accept(socket_, std::bind(&WSServer::on_accept, this, std::placeholders::_1));
  }

  void on_accept(boost::system::error_code ec)
  {
    if (ec) {
      fail(ec, "accept");
    }
    else {
      // Create the session and run it
      session_ = std::make_shared<session>(std::move(socket_), cb_);
      session_->run();
    }

    // Accept another connection
    do_accept();
  }



private:
  std::function<void(const boost::beast::multi_buffer& buffer, bool is_from_client)> cb_;

  boost::asio::io_context ioc;
  tcp::acceptor acceptor_{ ioc };
  tcp::socket socket_{ioc};
  tcp::endpoint endpoint{ boost::asio::ip::make_address("0.0.0.0"), static_cast<unsigned short>(std::atoi("8080")) };

  std::shared_ptr<session> session_;
};