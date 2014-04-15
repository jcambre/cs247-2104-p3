//BROKEN ENLARGED

// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

(function() {

  var blobs = [];
  var cur_video_blob = null;
  var fb_instance;
  var emotions = ["lol",":)",":("];
  var mediaRecorder = null;
  var recording_video = false;
  var emoticon_start = -1;
  var hasnt_entered_text;

  var DEFAULT_WIDTH = 350;
  var DEFAULT_HEIGHT = 280;

  var WIDTH = DEFAULT_WIDTH;
  var HEIGHT = DEFAULT_HEIGHT;

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();
    console.log($);
    wait_for_it();

    // $("#zoom_slider").change(function() {
    //   var prev_height = HEIGHT;
    //   var prev_width = WIDTH;

    //   var relative_zoom_level = (100 - (25-this.value)) * .01;
    //   HEIGHT = relative_zoom_level * DEFAULT_HEIGHT;
    //   WIDTH = relative_zoom_level * DEFAULT_WIDTH;
    //   console.log(relative_zoom_level * DEFAULT_HEIGHT);

    //   var delta_height = HEIGHT - prev_height;
    //   var delta_width = WIDTH - prev_width;
    //   console.log("HEIGHT: " + delta_height);



    //   var radius_growth = (100 + (25-this.value)) * .01;
    //   var video = $("#webcam_stream").children().first('video');


    //   var new_top = $("#webcam_stream").height() - 100;
    //   var new_left = $("#webcam_stream").offset().left + delta_width;

    //   $("#webcam_stream").offset({top: new_top, left: new_left});
    //   console.log("new percentage: " + relative_zoom_level*70);

    //   console.log(video.top);
    //   // $("#webcam_stream").css("-webkit-mask-size", radius_growth*70 + "%");

    //   video.width(WIDTH);
    //   video.height(HEIGHT);
    // });
  });

  function wait_for_it() {
    $("#submission_text").attr("placeholder", "Say something...");
    hasnt_entered_text = window.setTimeout(
      function(){
        $("#submission_text").attr("placeholder", "Say something... I'm giving up on you");
      },20000);
  }

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
    display_msg({m:"<span style='font-weight: 200'>Share this url with your friend to join this chat: "+ document.location.origin+"/#"+fb_chat_room_id+"</span>"})

    // set up variables to access firebase data structure
    var fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    var fb_instance_users = fb_new_chat_room.child('users');
    var fb_instance_stream = fb_new_chat_room.child('stream');
    var my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:"<div style='font-weight: 700; color: #ffffff; border-radius: 5px; padding: 1px 5px 1px 5px; display: inline-block; background-color:" + snapshot.val().c + "'>" + snapshot.val().name + " joined the room</div>",c: snapshot.val().c});
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
      window.clearTimeout(hasnt_entered_text);
      if (event.originalEvent.repeat) {
        var last_bit_of_text = $(this).val().split(" ").pop();
        if(has_emotions(last_bit_of_text, $(this).val())){
          if (!recording_video) {
            recording_video = true;
            mediaRecorder.start(30000); //Max of thirty seconds
            // Indicate to user that they're currently recording themselves
            $("#stream_wrapper").addClass("recording");

          }
        }
      }
    });
    
    var end_of_emoticon_index = null;

    $("#submission input").keyup(function( event ) {
      if(recording_video) {
        end_of_emoticon_index = $(this).val().length;
        recording_video = false;
        mediaRecorder.stop();

        // Indicate to user that they're no longer being recorded
        $("#stream_wrapper").removeClass("recording");
      }
      if (event.which == 13) {
          if(blobs.length > 0){
            // for video element
            var video_str = "";
            var msg_content = "";
            var text = $(this).val();
            var index = 0;
            var orig_length = blobs.length;
            
            text = text.split(" "); // Split everything into chars
            while(text.length > 0) {
              var chunk = text.shift();

              if (has_emotions(chunk, "")) {
                var emoji = extract_emoji(chunk);
                var blob = blobs.shift();
                video_str += "<div class='another_wrapper' style='width: 50px; height:50px; position:relative; display:inline-block'><div class='videmoji_wrapper' style='position: absolute; -webkit-mask: url(images/mask.svg); -webkit-mask-position: 50% 50%; -webkit-mask-size: 30%; -webkit-mask-repeat: no-repeat; width: 160px; height: 120px; display: inline-block; top:-25px; left:-45px;'>"
                video_str += "<video><source type='video/webm' src='" + URL.createObjectURL(base64_to_blob(blob[0])) + "'></source></video></div><div class='emoji_label' style='display:none; background-color:" + my_color + "; width: 15px; text-align: center;'>" + emoji + "</div></div>";
                console.log(my_color);
                msg_content += " " + video_str + " ";
              } else {
                msg_content += "<span> " + chunk + " <span>";
              }
               console.log("hey");             
              video_str = "";

            }

            //Somehow need to take the emoticon bit out of the value, and replace it with a small version of the circular bit
            fb_instance_stream.push({m: "<span style='color: " + my_color + "; font-weight: 700;'>" + username+"</span>: " +msg_content, c: my_color});            

          } else{
            fb_instance_stream.push({m: "<span style='color: " + my_color + "; font-weight: 700;'>" + username+"</span>: " +$(this).val(), c: my_color});            
          }
          blobs = [];
          $(this).val("");
          wait_for_it();
      }
    });

    // scroll to bottom in case there is already content
    scroll_to_bottom(1300);
  }

  // creates a message node and appends it to the conversation
  function display_msg(data){
    
    $("#conversation").append("<div class='msg'>"+data.m+"</div>");
    var conversation = document.getElementById('conversation');
    var video_obj = conversation.getElementsByTagName('video');
    for (var i=0; i<video_obj.length; i++) {
      console.log(video_obj);
      var curr_video = video_obj[i];
      console.log("here: " + $(curr_video));


      curr_video.autoplay = true;
      curr_video.controls = false; // optional
      curr_video.loop = true;
      curr_video.width = WIDTH*0.4; //Shrunk down size
      curr_video.height = HEIGHT*0.4; // shrunk down size

      var emoji_wrapper_for_video = $(curr_video).parent(".videmoji_wrapper");
      emoji_wrapper_for_video.width(WIDTH*0.4);
      emoji_wrapper_for_video.height(HEIGHT*0.4);

      $(curr_video).hover(
        function() {
          //Display full size
          this.width = WIDTH;
          this.height = HEIGHT;

          $(this).parent(".videmoji_wrapper").parent(".another_wrapper").width(150);
          $(this).parent(".videmoji_wrapper").parent(".another_wrapper").height(100);
          $(this).parent(".videmoji_wrapper").width(WIDTH);
          $(this).parent(".videmoji_wrapper").height(HEIGHT);
          $(this).parent(".videmoji_wrapper").css( "left", "-100px" );
          $(this).parent(".videmoji_wrapper").css( "top", "-80px" );
          console.log("heeeey");
          console.log($(this).parent(".videmoji_wrapper").siblings(".emoji_label").first());
          $(this).parent(".videmoji_wrapper").siblings(".emoji_label").first().css( "display", "inline-block");
        }, function() {
          //Shrink Again
          this.width = WIDTH*0.4;
          this.height = HEIGHT*0.4;

          $(this).parent(".videmoji_wrapper").parent(".another_wrapper").width(50);
          $(this).parent(".videmoji_wrapper").parent(".another_wrapper").height(50);
          $(this).parent(".videmoji_wrapper").width(WIDTH*0.4);
          $(this).parent(".videmoji_wrapper").height(HEIGHT*0.4);
          $(this).parent(".videmoji_wrapper").css( "left", "-45px" );
          $(this).parent(".videmoji_wrapper").css( "top", "-20px" );
          $(this).parent(".videmoji_wrapper").siblings(".emoji_label").first().css( "display", "none");

        }
      );
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
      var video_width= WIDTH;
      var video_height= HEIGHT;
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      video.style.position = "relative";
      video.style.top = "0px";
      video.style.left = "0px";
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


      $(webcam_stream).hover(
        function() {
          $("#smile_position_guide").show();
        }, function() {
          $("#smile_position_guide").hide();
        }
      );

      $("#smile_position_guide").hover(
        function() {
          $("#smile_position_guide").show();
        }, function() {
          $("#smile_position_guide").hide();
        }
      );

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
            var end_of_emoticon_index = $("#submission input").val().length;
            var blob = [cur_video_blob, emoticon_start, end_of_emoticon_index];
            blobs.push(blob);
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
  var has_emotions = function(msg, whole_str){
    for(var i=0;i<emotions.length;i++){
      if(msg.indexOf(emotions[i])!= -1){
        if (whole_str != "") {
          emoticon_start = whole_str.indexOf(msg.substr(msg.indexOf(emotions[i])));
        }
        console.log("emoticon start is: " + emoticon_start + "emotion " + emotions[i]);
        return true;
      }
    }
    return false;
  }


  // check to see if a message qualifies to be replaced with video.
  var extract_emoji = function(msg){
    for(var i=0;i<emotions.length;i++){
      if(msg.indexOf(emotions[i])!= -1){
        return emotions[i];
      }
    }
    return "";
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
