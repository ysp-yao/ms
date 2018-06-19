import * as mediasoupClient from 'mediasoup-client';
import mySignalingChannel from './mySignalingChannel';

// mySignalingChannel is our app custom signaling mechanism to communicate
// with the server running the mediasoup Node.js app.
// 
// Here we assume that a mediasoup Room and a Peer (named 'alice') already
// exist in the server. This channel will be used to communicate with our
// associated remote Peer (among other custom messages exhange up to the app).
const channel = new mySignalingChannel(
  {
    url      : 'wss://myserver.test',
    peerName : 'alice',
    roomId   : 'demo1'
  }); 


const ROOM_OPTIONS =
{
	requestTimeout   : 10000,
	transportOptions :
	{
		tcp : false
	}
};

// Create a local Room instance associated to the remote Room.
const room = new mediasoupClient.Room(ROOM_OPTIONS);

// Transport for sending our media.
let sendTransport;

// Transport for receiving media from remote Peers.
let recvTransport;


// Be ready to receive mediasoup notifications from our remote mediasoup Peer
// in the server.
channel.on('message', (message) =>
{
  if (message.type === 'mediasoup-notification')
  {
    // Pass the mediasoup notification to the local Room.
    room.receiveNotification(message.body);
  }
  else
  {
    // Handle here app custom messages (chat, etc).
  }
});

channel.on('connected', ()=> {
// Join the remote Room.
var displayName = 'fuckyou';
var device = {
    flag: "mediasoup-client-cpp",
    name: "mediasoup-client-cpp",
    version: "1.0"
};

room.join('TestPeer',{displayName, device})
  .then((peers) =>
  {
    // Create the Transport for sending our media.
    sendTransport = room.createTransport('send', { media: 'SEND_MIC_WEBCAM' });

    // Create the Transport for receiving media from remote Peers.
    recvTransport = room.createTransport('recv', { media: 'RECV' });

    // Handle Peers already in to the Room.
    for (const peer of peers)
    {
      handlePeer(peer);
    }
  })
  .then(() =>
  {
    // Get our mic and webcam.
    console.log("111111111111111111111111111111111");
    return navigator.mediaDevices.getUserMedia(
      {
        audio : false,
        video : true
      });
  })
  .then((stream) =>
  {
    console.log("222222222222222222222222222222222");

    const audioTrack = stream.getAudioTracks()[0];
    const videoTrack = stream.getVideoTracks()[0];
    console.log("333333333333333", audioTrack);
    console.log("444444444444444", videoTrack);
    
    // Create Producers for audio and video.
    //const audioProducer = room.createProducer(audioTrack);
    const videoProducer = room.createProducer(videoTrack, { simulcast: true }, { source: 'webcam' });

    // Send our audio.
    // audioProducer.send(sendTransport)
    //   .then(() => console.log('sending our mic'));

    // Send our video.
    console.log("5555555555555555555555555555555555555555555");
    videoProducer.send(sendTransport)
      .then(() => console.log('sending our webcam'));
  })
});


// Event fired when a new remote Peer joins the Room.
room.on('newpeer', (peer) =>
{
  console.log('a new Peer joined the Room: %s', peer.name);

  // Handle the Peer.
  //handlePeer(peer);
});


// Be ready to send mediasoup client requests to our remote mediasoup Peer in
// the server, and also deal with their associated responses.
room.on('request', (request, callback, errback) =>
{
  channel.send({ type: 'mediasoup-request', body: request })
    .then((response) =>
    {
      // Success response, so pass the mediasoup response to the local Room.
      callback(response);
    })
    .catch((error) =>
    {
      // Error response, so pass the error to the local Room.
      errback(error);
    });
});


// Be ready to send mediasoup client notifications to our remote mediasoup
// Peer in the server
room.on('notify', (notification) =>
{
  channel.send({ type: 'mediasoup-notification', body: notification });
});





function handlePeer(peer)
{
  // Handle all the Consumers in the Peer.
  for (const consumer of peer.consumers)
  {
    handleConsumer(consumer);
  }

  // Event fired when the remote Room or Peer is closed.
  peer.on('close', () =>
  {
    console.log('Peer closed');
  });

  // Event fired when the remote Peer sends a new media to mediasoup server.
  peer.on('newconsumer', (consumer) =>
  {
    console.log('Got a new Consumer');

    // Handle the Consumer.
    handleConsumer(consumer);
  });
}


function handleConsumer(consumer)
{
  // Receive the media over our receiving Transport.
  consumer.receive(recvTransport)
    .then((track) =>
    {
      console.log('receiving a new remote MediaStreamTrack');

      // Attach the track to a MediaStream and play it.
    });

  // Event fired when the Consumer is closed.
  consumer.on('close', () =>
  {
    console.log('Consumer closed');
  });
}


