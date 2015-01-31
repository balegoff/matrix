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
var sequence;

window.onload = init;

function init() {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;

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

function finishedLoading(bufferList) {
  buffers = bufferList;
  matrix = document.getElementById('matrix');
  sequence = new Array(buffers.length);

  // Generate matrix view and model
  for (i=0; i < buffers.length; i++) {
    sequence[i] = new Array(beats);

    var row = document.createElement("div");
    row.id = "row" + i;
    matrix.appendChild(row);

    for(j=0; j < beats; j++) {
      sequence[i][j] = 0;

      var cell = document.createElement("div");
      cell.classList.add("cell");
      cell.classList.add("col" + j);
      cell.dataset.row = i;
      cell.dataset.col = j;
      cell.dataset.checked = 0;
      row.appendChild(cell);
    }
  }

  midi = new MidiManager(sequence);

  // Press space event
  document.addEventListener('keyup', function (evt) {
    if (evt.keyCode == 32) {

      if (!playing) {
        playing = true;
        nextNoteTime = context.currentTime;
        scheduler();
      }
      else {
        playing = false;
        clearTimeout(rescheduler);
        clearTimeout(redrawer);
      }
    }
  });

  var cells = document.querySelectorAll(".cell");

  // Set click listeners on cells
  for(var i=0; i < cells.length; i++) {
    cell = cells[i];
    cell.addEventListener('click', function(){
      var i = this.dataset.row;
      var j = this.dataset.col;
      var note = parseInt(i*16) + parseInt(j);

      if(this.dataset.checked == 0) {
        this.dataset.checked = 1;
        this.classList.add("active");
        sequence[i][j] = 1;
        midi.noteOn(note, 100);
      }

      else if(this.dataset.checked == 1) {
        this.dataset.checked = 0;
        this.style.opacity = 1;
        this.classList.remove("active");
        sequence[i][j] = 0;
        midi.noteOff(note);
      }
    });
  }
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
  for(i=0; i < sequence.length; i++) {
    if(sequence[i][current16thNote]) {
      playSample(i, nextNoteTime);
    }
  }

  // Update matrix view
  redrawer = window.setTimeout(function() {
    var matrix = document.querySelectorAll(".cell");

    for(var i=0; i< matrix.length; i++) {
      var cell = matrix[i];
      cell.classList.remove("clocked");

      if(cell.dataset.col == current16thNote)
        cell.classList.add("clocked");
    }

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
