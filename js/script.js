window.onload = init;
var context;
var bufferLoader;
var buffers;
var tempo = 125;
var beats = 8;
var nextNoteTime;
var scheduleAheadTime = 0.1;
var lookahead = 25.0;
var current16thNote = 0;
var playing = false;
var groovy = true;

var rescheduler;
var redrawer;

var kick_line = [0,0,0,0,0,0,0,0];
var clap_line = [0,0,0,0,0,0,0,0];
var hihat_line  = [0,0,0,0,0,0,0,0];
var lowhat_line  = [0,0,0,0,0,0,0,0];
var shaker_line  = [0,0,0,0,0,0,0,0];
var fx_line  = [0,0,0,0,0,0,0,0];

var sequence = [kick_line, clap_line, hihat_line, lowhat_line, shaker_line, fx_line];

var midiAccess = null;
var midi_input = null;
var midi_output = null;

function init() {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  navigator.requestMIDIAccess().then( onsuccesscallback, onerrorcallback );
  context = new AudioContext();

  bufferLoader = new BufferLoader(
    context,
    [
    'sounds/kick.wav',
    'sounds/clap.wav',
    'sounds/hi-h.wav',
    'sounds/lo-h.wav',
    'sounds/shaker.wav',
    'sounds/fx.wav',
    ],
    finishedLoading
  );

  bufferLoader.load();
}

 /* $$$$$$$$$$ MIDI $$$$$$$$$$ */

function onsuccesscallback( access ) {
  midiAccess = access;
  useDevice("Launchpad");
  midi_input.onmidimessage = myMIDIMessagehandler;

  for(var i=0; i < 121; i++) {
    midi_output.send( [ 0x90, i, i*64 % 127 ] );
    midi_output.send( [ 0x80, i, 0 ], window.performance.now() + 500 );
  }
};

function onerrorcallback( err ) {
  console.log( "uh-oh! Something went wrong! Error code: " + err.code );
}

function myMIDIMessagehandler(midi_mess) {
  if(midi_mess.data[2] != 0) {
    //console.log(midi_mess.data);
    var note = parseInt(midi_mess.data[1]);
    var i = parseInt(note / 16);
    var j = parseInt(note % 8);

    if(sequence[i][j] == 1) {
      midi_output.send([0x80, midi_mess.data[1], 0]);
      $(".row" + i + ".col" + j).removeClass("active");
      sequence[i][j] = 0;
    }
    else {
      midi_output.send([0x90, midi_mess.data[1], 100]);
      $(".row" + i + ".col" + j).addClass("active");
      sequence[i][j] = 1;
    }
  }
}

function useDevice(dev) {
  var found_in = false;
  var found_out = false;

  // in
  var iteratorInputs = midiAccess.inputs.values();
  while ( (device = iteratorInputs.next().value) != null ) {
    if (device.name == dev) {
      midi_input = device;
      found_in = true;
    }
  }

  // out
  var iteratorOutputs = midiAccess.outputs.values();
  while ( (device = iteratorOutputs.next().value) != null ) {
    if (device.name == dev) {
      midi_output = device;
      found_out = true;
    }
  }

  if (!found_in || !found_out) {
    console.log("Unable to find device : " + dev);
  }
}

/* $$$$$$$$$$ AUDIO $$$$$$$$$$ */

function finishedLoading(bufferList) {

  buffers = bufferList;

  // Generate matrix view
  for (i=0; i < buffers.length; i++){
    for(j=0; j < beats; j++){
      $('#matrix').append('<div class="cell row'+i+' col'+j+'" data-row='+i+' data-col='+j+' data-checked=0></div>');
    }
    $('#matrix').append('<br>');
  }

  // Press space event
  $(document).bind('keyup', function (evt) {
    if (evt.keyCode == 32) {

      if (!playing){
        playing = true;
        nextNoteTime = context.currentTime;
        scheduler();
      }
      else{
        playing=false;
        clearTimeout(rescheduler);
        clearTimeout(redrawer);
      }
    }
  });

  // Set click listenners on cells
  $('.cell').click(function(){
    var i = this.getAttribute('data-row');
    var j = this.getAttribute('data-col');
    var note = parseInt(i*16) + parseInt(j);

    if(this.getAttribute('data-checked') == 0){
      $(this).attr('data-checked', '1');
      $(this).addClass("active");
      sequence[i][j] = 1;
      midi_output.send( [ 0x90, note, 100 ] );
    }
    else if(this.getAttribute('data-checked') == 1){
      $(this).attr('data-checked', '0');
      $(this).css('opacity', 1);
      $(this).removeClass("active");
      sequence[i][j] = 0;
      midi_output.send( [ 0x80, note, 0 ] );
    }
  });
}

function playSample(index, time){
  var source = context.createBufferSource();
  source.buffer = buffers[index];
  source.connect(context.destination);
  source.start(time);
}

function scheduler(){
  while (nextNoteTime < context.currentTime + scheduleAheadTime && playing) {
      scheduleNote(current16thNote, nextNoteTime);
      nextNote();
  }
  if (playing)
    rescheduler = window.setTimeout(scheduler, lookahead);
}

function scheduleNote(current16thNote, nextNoteTime){
  var toRecheck = [];

  for(i=0; i < sequence.length; i++){

    if(sequence[i][(current16thNote + beats - 1) % beats] == 1)
      toRecheck.push(i);

    if(sequence[i][current16thNote]){
      playSample(i, nextNoteTime);
    }

  }
  // Update matrix view
  redrawer = window.setTimeout(function(){

    $('.col' + ((current16thNote + beats - 1) % beats)).removeClass("active").removeClass("clocked");
    $('.col' + current16thNote).addClass("clocked");

    for(var i=0; i < toRecheck.length; i++)
      $('.row' + toRecheck[i] +  '.col' + ((current16thNote + beats - 1) % beats)).addClass("active");

  }, context.currentTime - nextNoteTime);
}

function nextNote() {
  var secondsPerBeat = 60.0 / tempo;	// picks up the CURRENT tempo value

  if(groovy) {
    if ((current16thNote % 2) == 0)
      nextNoteTime += 0.32 * secondsPerBeat;
    else
      nextNoteTime += 0.18 * secondsPerBeat;
  }

  else {
    nextNoteTime += 0.25 * secondsPerBeat;
  }

  current16thNote = (current16thNote + 1) % beats;	// Advance the beat number, wrap to zero
}
