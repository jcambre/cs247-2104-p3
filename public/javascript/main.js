// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

(function() {

  var cur_video_blob = null;
  var fb_instance;
  var emotions = ["lol",":)",":("];
  var mediaRecorder = null;
  var recording_video = false;
  var emoticon_start = -1;

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();
    console.log($)
  });

  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://gsroth-p3-v1.firebaseio.com");

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("/#");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    display_msg({m:"Share this url with your friend to join this chat: "+ document.location.origin+"/#"+fb_chat_room_id,c:"red"})

    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val());
    });

    // block until username is answered
    var username = window.prompt("Welcome, warrior! please declare your name?");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }
    fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();

    // bind submission box
    $("#submission input").keydown(function( event ) {
      if (event.originalEvent.repeat) {
        var last_bit_of_text = $(this).val().split(" ").pop();
        if(has_emotions(last_bit_of_text)){
          if (!recording_video) {
            recording_video = true;
            mediaRecorder.stop();
            mediaRecorder.start(30000); //Max of thirty seconds
          }
        }
      }
    });
    
    var end_of_emoticon_index = null;

    $("#submission input").keyup(function( event ) {
      if(recording_video) {
        console.log("i am here");
        end_of_emoticon_index = $(this).val().length;
        console.log($(this).val().length);
        recording_video = false;
        mediaRecorder.stop();

      }
      if (event.which == 13) {
          if(cur_video_blob && has_emotions($(this).val())){
            // for video element
            var video_str = "<video><source type='video/webm' src='" + URL.createObjectURL(base64_to_blob(cur_video_blob)) + "'></source></video>";

            console.log("start: " + emoticon_start);
            console.log("end: " + end_of_emoticon_index);
            var msg_content = "<span>" + $(this).val().substr(0, emoticon_start) + "</span>";
            msg_content += video_str;
            msg_content += "<span>" + $(this).val().substr(end_of_emoticon_index) + "</span>";

            //Somehow need to take the emoticon bit out of the value, and replace it with a small version of the circular bit
            fb_instance_stream.push({m:username+": " +msg_content, c: my_color});            

            //Reset the video, so for plain emoticons like :), there's no video.
            cur_video_blob = null;
          }else{
            fb_instance_stream.push({m:username+": " +$(this).val(), c: my_color});
          }
          $(this).val("");
      }
    });

    // scroll to bottom in case there is already content
    scroll_to_bottom(1300);
  }

  // creates a message node and appends it to the conversation
  function display_msg(data){
    
    $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+data.m+"</div>");
    var conversation = document.getElementById('conversation');
    var video_obj = conversation.getElementsByTagName('video');
    if (video_obj.length > 0) {
      video_obj = video_obj[0];
      video_obj.autoplay = true;
      video_obj.controls = false; // optional
      video_obj.loop = true;
      video_obj.width = 120;
    }
  }

  function scroll_to_bottom(wait_time){
    // scroll to bottom of div
    setTimeout(function(){
      $("html, body").animate({ scrollTop: $(document).height() }, 200);
    },wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var video_width= 160;
      var video_height= 120;
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      webcam_stream.innerHTML = "";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          width: video_width,
          height: video_height,
          src: URL.createObjectURL(stream)
      });
      video.play();
      webcam_stream.appendChild(video);

      // counter
      var time = 0;
      var second_counter = document.getElementById('second_counter');
      var second_counter_update = setInterval(function(){
        second_counter.innerHTML = time++;
      },1000);

      // now record stream in 5 seconds interval
      var video_container = document.getElementById('video_container');
      mediaRecorder = new MediaStreamRecorder(stream);
      var index = 1;

      mediaRecorder.mimeType = 'video/webm';
      // mediaRecorder.mimeType = 'image/gif';
      // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
      mediaRecorder.video_width = video_width/2;
      mediaRecorder.video_height = video_height/2;

      mediaRecorder.ondataavailable = function (blob) {
          //console.log("new data available!");
          video_container.innerHTML = "";

          // convert data into base 64 blocks
          blob_to_base64(blob,function(b64_data){
            cur_video_blob = b64_data;
          });
      };
      //This says record a new video every 3 seconds. And then it will call ondataava
      // setInterval( function() {
      //   mediaRecorder.stop();
      //   mediaRecorder.start(3000);
      // }, 3000 );
      console.log("connect to media stream!");
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }

  // check to see if a message qualifies to be replaced with video.
  var has_emotions = function(msg){
    for(var i=0;i<emotions.length;i++){
      if(msg.indexOf(emotions[i])!= -1){
        emoticon_start = msg.indexOf(emotions[i]);
        return true;
      }
    }
    return false;
  }


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note useing String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };

})();
