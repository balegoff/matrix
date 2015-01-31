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

window.onload = init;

function init() {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  
  context = new AudioContext();
  midi = new MidiManager(sequence);

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

function finishedLoading(bufferList) {
  buffers = bufferList;

  // Generate matrix view
  for (i=0; i < buffers.length; i++) {
    for(j=0; j < beats; j++)
      $('#matrix').append('<div class="cell row'+i+' col'+j+'" data-row='+i+' data-col='+j+' data-checked=0></div>');

    $('#matrix').append('<br>');
  }

  // Press space event
  $(document).bind('keyup', function (evt) {
    if (evt.keyCode == 32) {

      if (!playing) {
        playing = true;
        nextNoteTime = context.currentTime;
        scheduler();
      }
      else {
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

    if(this.getAttribute('data-checked') == 0) {
      $(this).attr('data-checked', '1');
      $(this).addClass("active");
      sequence[i][j] = 1;
      midi.noteOn(note, 100);
    }

    else if(this.getAttribute('data-checked') == 1) {
      $(this).attr('data-checked', '0');
      $(this).css('opacity', 1);
      $(this).removeClass("active");
      sequence[i][j] = 0;
      midi.noteOff(note);
    }
  });
}

function playSample(index, time) {
  var source = context.createBufferSource();
  source.buffer = buffers[index];
  source.connect(context.destination);
  source.start(time);
}

function scheduler() {
  while (nextNoteTime < context.currentTime + scheduleAheadTime && playing) {
      scheduleNote(current16thNote, nextNoteTime);
      nextNote();
  }
  if (playing)
    rescheduler = window.setTimeout(scheduler, lookahead);
}

function scheduleNote(current16thNote, nextNoteTime) {
  var toRecheck = [];

  for(i=0; i < sequence.length; i++) {
    if(sequence[i][(current16thNote + beats - 1) % beats] == 1)
      toRecheck.push(i);

    if(sequence[i][current16thNote]) {
      playSample(i, nextNoteTime);
    }
  }

  // Update matrix view
  redrawer = window.setTimeout(function() {
    $('.col' + ((current16thNote + beats - 1) % beats)).removeClass("active").removeClass("clocked");
    $('.col' + current16thNote).addClass("clocked");

    for(var i=0; i < toRecheck.length; i++)
      $('.row' + toRecheck[i] +  '.col' + ((current16thNote + beats - 1) % beats)).addClass("active");
  }, context.currentTime - nextNoteTime);
}

function nextNote() {
  var secondsPerBeat = 60.0 / tempo;

  if(groovy) {
    if ((current16thNote % 2) == 0)
      nextNoteTime += 0.32 * secondsPerBeat;
    else
      nextNoteTime += 0.18 * secondsPerBeat;
  }

  else
    nextNoteTime += 0.25 * secondsPerBeat;

  current16thNote = (current16thNote + 1) % beats;
}
