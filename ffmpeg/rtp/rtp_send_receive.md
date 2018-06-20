## send and receive RTP stream(only video)
* send:ffmpeg -re -i test.mp4 -vcodec copy -an -f rtp rtp://127.0.0.1:11111>test.sdp
* recv:ffplay -protocol_whitelist “file,http,https,rtp,udp,tcp,tls” test.sdp

   