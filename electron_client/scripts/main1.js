import mySignalingChannel from './mySignalingChannel1';
import sdpTransform from 'sdp-transform';
import * as sdpCommonUtils from './lib/handlers/sdp/commonUtils';
import * as sdpPlanBUtils from './lib/handlers/sdp/planBUtils';
import RemotePlanBSdp from './lib/handlers/sdp/RemotePlanBSdp';
import * as ortc from './lib/ortc';


const channel = new mySignalingChannel(
  {
    url      : 'wss://myserver.test',
    peerName : 'alice',
    roomId   : 'demo1'
  }); 

var rtpParametersByKind;
var pc;
var direction = 'send';
var remoteSdp;

var audioTrack;
var videoTrack;
var roomSettings;
// var roomSettings = {
//   rtpCapabilities:{
//     codecs:[
//       {kind:"audio",name:"opus",mimeType:"audio/opus",clockRate:48000,channels:2,parameters:{useinbandfec:1},rtcpFeedback:[],preferredPayloadType:100},
//       {kind:"video",name:"VP8",mimeType:"video/VP8",clockRate:90000,rtcpFeedback:[{type:"nack"},{type:"nack",parameter:"pli"},{type:"nack",parameter:"sli"},{type:"nack",parameter:"rpsi"},{type:"nack",parameter:"app"},{type:"ccm",parameter:"fir"},{type:"ack",parameter:"rpsi"},{type:"ack",parameter:"app"},{type:"goog-remb"}],parameters:{},preferredPayloadType:101},
//       {kind:"video",name:"rtx",mimeType:"video/rtx",preferredPayloadType:102,clockRate:90000,parameters:{apt:101}}
//     ],
//     headerExtensions:[
//       {kind:"audio",uri:"urn:ietf:params:rtp-hdrext:ssrc-audio-level",preferredId:1,preferredEncrypt:false},
//       {kind:"video",uri:"urn:ietf:params:rtp-hdrext:toffset","preferredId":2,preferredEncrypt:false},
//       {kind:"audio",uri:"http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",preferredId:3,preferredEncrypt:false},
//       {kind:"video",uri:"http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",preferredId:3,preferredEncrypt:false},
//       {kind:"video",uri:"urn:3gpp:video-orientation",preferredId:4,preferredEncrypt:false},
//       {kind:"video",uri:"urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id",preferredId:5,preferredEncrypt:false}
//     ],
//     fecMechanisms:[]
//   },
//   mandatoryCodecPayloadTypes:[]
// }




function getNativeRtpCapabilities() {

return new Promise(function (resolve, reject) {

	const pc = new RTCPeerConnection(
        {
            iceServers         : [],
            iceTransportPolicy : 'all',
            bundlePolicy       : 'max-bundle',
            rtcpMuxPolicy      : 'require'
        });

    pc.createOffer(
        {
            offerToReceiveAudio : true,
            offerToReceiveVideo : true
        })
        .then((offer) =>
        {
            try { pc.close(); }
            catch (error) {}
            const sdpObj = sdpTransform.parse(offer.sdp);
            const nativeRtpCapabilities = sdpCommonUtils.extractRtpCapabilities(sdpObj);
            const extendedRtpCapabilities = ortc.getExtendedRtpCapabilities(nativeRtpCapabilities, roomSettings.rtpCapabilities);
            const unsupportedRoomCodecs = ortc.getUnsupportedCodecs(roomSettings.rtpCapabilities, roomSettings.mandatoryCodecPayloadTypes, extendedRtpCapabilities);
            const effectiveLocalRtpCapabilities = ortc.getRtpCapabilities(extendedRtpCapabilities);
            rtpParametersByKind =
            {
              audio : ortc.getSendingRtpParameters('audio', extendedRtpCapabilities),
              video : ortc.getSendingRtpParameters('video', extendedRtpCapabilities)
            };
            resolve(nativeRtpCapabilities);
        })
        .catch((error) =>
        {
            try { pc.close(); }
            catch (error2) {}

            throw error;
        });
});
}

function getEffectiveLocalRtpCapabilities() {

  return new Promise(function (resolve, reject) {
  
    const pc = new RTCPeerConnection(
          {
              iceServers         : [],
              iceTransportPolicy : 'all',
              bundlePolicy       : 'max-bundle',
              rtcpMuxPolicy      : 'require'
          });
  
      pc.createOffer(
          {
              offerToReceiveAudio : true,
              offerToReceiveVideo : true
          })
          .then((offer) =>
          {
              try { pc.close(); }
              catch (error) {}
              const sdpObj = sdpTransform.parse(offer.sdp);
              const nativeRtpCapabilities = sdpCommonUtils.extractRtpCapabilities(sdpObj);
              const extendedRtpCapabilities = ortc.getExtendedRtpCapabilities(nativeRtpCapabilities, roomSettings.rtpCapabilities);
              const unsupportedRoomCodecs = ortc.getUnsupportedCodecs(roomSettings.rtpCapabilities, roomSettings.mandatoryCodecPayloadTypes, extendedRtpCapabilities);
              const effectiveLocalRtpCapabilities = ortc.getRtpCapabilities(extendedRtpCapabilities);
              rtpParametersByKind =
              {
                audio : ortc.getSendingRtpParameters('audio', extendedRtpCapabilities),
                video : ortc.getSendingRtpParameters('video', extendedRtpCapabilities)
              };
              resolve(effectiveLocalRtpCapabilities);
          })
          .catch((error) =>
          {
              try { pc.close(); }
              catch (error2) {}
  
              throw error;
          });
  });
  }



async function CreateTransport() {

    remoteSdp = new RemotePlanBSdp(direction, rtpParametersByKind);

    pc = new RTCPeerConnection(
        {
            iceServers         :  [],
            iceTransportPolicy : 'all',
            bundlePolicy       : 'max-bundle',
            rtcpMuxPolicy      : 'require'
        });

    pc.addEventListener('iceconnectionstatechange', () =>
    {
        switch (pc.iceConnectionState)
        {
            case 'checking':
                //this.emit('@connectionstatechange', 'connecting');
                console.log("==============================connecting");
                break;
            case 'connected':
            case 'completed':
                //this.emit('@connectionstatechange', 'connected');
                console.log("==============================connected");
                break;
            case 'failed':
                //this.emit('@connectionstatechange', 'failed');
                console.log("==============================failed");
                break;
            case 'disconnected':
                //this.emit('@connectionstatechange', 'disconnected');
                console.log("==============================disconnected");
                break;
            case 'closed':
                //this.emit('@connectionstatechange', 'closed');
                console.log("==============================closed");
                break;
        }
    });

    var stream = await navigator.mediaDevices.getUserMedia({audio : false, video : true});
    audioTrack = stream.getAudioTracks()[0];
    videoTrack = stream.getVideoTracks()[0];

    // video producer
    stream.addTrack(videoTrack);
    pc.addStream(stream);

    var offer =  await pc.createOffer();
    console.log('offer原始的sdp', offer.sdp);
    const sdpObject = sdpTransform.parse(offer.sdp);

    sdpPlanBUtils.addSimulcastForTrack(sdpObject, videoTrack);

    const offerSdp = sdpTransform.write(sdpObject);
    console.log('offer经过处理的sdp', offerSdp);
    offer = { type: 'offer', sdp: offerSdp };



    return Promise.resolve()
    .then(() =>
    {        

        return pc.setLocalDescription(offer);
    })
    .then(() =>
    {
        // Get our local DTLS parameters.
        const transportLocalParameters = {};
        const sdp = pc.localDescription.sdp;


        const sdpObj = sdpTransform.parse(sdp);
        const dtlsParameters = sdpCommonUtils.extractDtlsParameters(sdpObj);

        // Let's decide that we'll be DTLS server (because we can).
        dtlsParameters.role = 'server';

        transportLocalParameters.dtlsParameters = dtlsParameters;

        remoteSdp.setTransportLocalParameters(transportLocalParameters);

        return new Promise(function(resolve, reject){

            const data =
            {
              id        : 12345678, // 随机值transportId
              direction : "send",
              options   : {tcp:false},
              appData   : {media:"SEND_MIC_WEBCAM"}
            };
    
            if (transportLocalParameters)
              data.dtlsParameters = transportLocalParameters.dtlsParameters;

            resolve(data);
        });
    });
}



function Send(request, id, method, data) {
  var msg = {};
  msg.request = request;
  msg.id = id;
  msg.method = method;
  msg.data = data;
  console.log('<-- ', msg);
  channel.Send2(msg);
}

// async function test() {

 

//     // <-- queryRoom
//     // -->
//     var data1 = {};
//     data1.method = "queryRoom";
//     data1.target = "room";    
//     Send(true, 0, "mediasoup-request", data1);

//     // <-- join
//     // -->
//     var data2 = {};   
//     var  rtpCapabilities = await getNativeRtpCapabilities();
//     data2.method="join";
//     data2.target="room";
//     data2.peerName="TestPeer";
//     data2.rtpCapabilities = rtpCapabilities;
//     data2.appData = {
//       displayName:"fy",
//       device:{
//         flag:"mediasoup-client-electron",
//         name:"mediasoup-client-electron",
//         version:"1.0"
//       }
//     }
//     Send(true, 1, "mediasoup-request", data2);

//     // <-- createTransport
//     // --> 
//     var data3 = await CreateTransport();
//     data3.method = "createTransport";
//     data3.target = "peer";
//     Send(true, 2, "mediasoup-request", data3);

// }


//test();

function QueryRoom() {
  // <-- queryRoom
  // -->
  var data1 = {};
  data1.method = "queryRoom";
  data1.target = "room";    
  Send(true, 0, "mediasoup-request", data1);
}

async function Join() {
  var data2 = {};   
  var effectiveLocalRtpCapabilities = await getEffectiveLocalRtpCapabilities();
  data2.method="join";
  data2.target="room";
  data2.peerName="TestPeer";
  data2.rtpCapabilities = effectiveLocalRtpCapabilities;
  data2.appData = {
    displayName:"fy",
    device:{
      flag:"mediasoup-client-electron",
      name:"mediasoup-client-electron",
      version:"1.0"
    }
  }
  Send(true, 1, "mediasoup-request", data2);
}


async function CreateTransport2() {
  var data3 = await CreateTransport();
  data3.method = "createTransport";
  data3.target = "peer";
  Send(true, 2, "mediasoup-request", data3);
}



function CreateProducer(transportRemoteParameters) { // producer封装了webrtc里的track
  remoteSdp.setTransportRemoteParameters(transportRemoteParameters);
  const localSdpObj = sdpTransform.parse(pc.localDescription.sdp);
  const sdp = remoteSdp.createAnswerSdp(localSdpObj);
  console.log("answer的sdp", sdp);
  const answer = { type: 'answer', sdp: sdp };
  pc.setRemoteDescription(answer);
  const rtpParameters = rtpParametersByKind['video'];
  sdpPlanBUtils.fillRtpParametersForTrack(rtpParameters, localSdpObj, videoTrack);

  const data =
  {
    id            : 87654321, // 随机值producerId
    kind          : videoTrack.kind,
    transportId   : 12345678, // 随机值transportId
    rtpParameters : rtpParameters,
    paused        : false,
    appData       : {media:"SEND_MIC_WEBCAM"}
  };

  data.method = "createProducer";
  data.target = "peer";   
 
  Send(true, 3, "mediasoup-request", data);
}



channel.on('connected', ()=> {
  QueryRoom();
});

channel.on('message', (message) => {
  console.log('--> ', message)

  if (message.type === 'mediasoup-notification') {
    // Pass the mediasoup notification to the local Room.
    //room.receiveNotification(message.body);
  }
  else {
    if (message.id === 0) { // queryRoom的返回值
      roomSettings = message.data;
      Join();
    }
    else if (message.id === 1) {// join的返回值
      // TODO: 处理已经存在的peers
      CreateTransport2();
    }
    else if (message.id === 2) { // CreateTransport的返回值
      CreateProducer(message.data);
    }
    else if (message.id === 3) { // CreateProducer的返回值

    }
  }
});




