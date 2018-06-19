const EventEmitter = require('events');

export default class mySignalingChannel extends EventEmitter  {
  constructor(option) {

    super();
    self = this;
    self.requestId = 0;
    self.ws = new WebSocket("ws://127.0.0.1:8080");
    self.ws.onopen = function()
    {
      self.emit('connected');
    };
    
    self.ws.onmessage = function (evt) 
    { 
      //self.emit('message', JSON.parse(evt.data)); // 新
      self.emit('msg', evt.data); // 旧
    };
    
    self.ws.onclose = function()
    { 
      // 关闭 websocket
      alert("连接已关闭..."); 
    };

  }

  send(msg) {
    // // console.log('<--', JSON.stringify(msg));
    // // var json = {
    // //   "request": true,
    // //   "id": self.requestId++,
    // //   "method":msg.type,
    // //   "data":msg.body
    // // };
    // // console.log('<--', JSON.stringify(json));
    // // self.ws.send(JSON.stringify(json));

    const promise = new Promise(function(resolve, reject) {

      var json = {
        "request": true,
        "id": self.requestId++,
        "method":msg.type,
        "data":msg.body
      };
      console.log('<--', JSON.stringify(json));
      self.ws.send(JSON.stringify(json));
      self.on('msg', (data)=>{
        console.log('-->', data);
        resolve( JSON.parse(data).data);
      });


    });

    return promise;

  }

  Send2(json) {
    self.ws.send(JSON.stringify(json));
  } 
};


 
