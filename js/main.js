var context;
var bufferLoader;
var buffers;

var tempo = 130;
var steps = 8;
var currentStep = 0;

var nextStepTime;
var scheduleAheadTime = 0.1;
var lookahead = 25.0;

var playing = false; // playing state flag
var groovy = false; // activate swing

var rescheduler; // scheduler timeout
var redrawer; // redraw timeout
var sequence; // sequencer grid data

window.onload = init;

/**
 * Entry point of the application
 * This method is responsible to load the samples in memory before the
 * application actually starts.
 */
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

/**
 * Callback method called when the samples have been loaded have been loaded
 * @param {ArrayBuffer} bufferList The array containing the samples buffers
 */
function finishedLoading(bufferList) {
  buffers = bufferList;
  sequence = new Array(buffers.length);
  var matrix = document.getElementById('matrix');

  // Generate matrix view and model
  for (var i=0; i < buffers.length; i++) {
    sequence[i] = new Array(steps);

    var row = document.createElement("div");
    row.id = "row" + i;
    matrix.appendChild(row);

    for(var j=0; j < steps; j++) {
      sequence[i][j] = 0;

      var cell = document.createElement("div");
      cell.classList.add("cell");
      cell.classList.add("col" + j);
      cell.dataset.row = i;
      cell.dataset.col = j;
      row.appendChild(cell);
    }
  }

  midi = new MidiManager(sequence);

  // Set press space event listener
  document.addEventListener('keyup', function (evt) {

    if (evt.keyCode == 32) {
      if (!playing) {
        context.resume();
        playing = true;
        nextStepTime = context.currentTime;
        scheduler();
      }
      else {
        playing = false;
        clearTimeout(rescheduler);
        currentStep = 0;
        repaint(0);
      }
      
    }
  });

  var cells = document.querySelectorAll(".cell");

  // Set click listeners on cells
  for(var c=0; c < cells.length; c++) {
    cell = cells[c];
    cell.addEventListener('click', function(){
      var i = this.dataset.row;
      var j = this.dataset.col;
      var note = parseInt(i*16) + parseInt(j);

      if(sequence[i][j] == 0) {
        this.classList.add("active");
        sequence[i][j] = 1;
        midi.noteOn(note, 100);
      }
      else {
        this.classList.remove("active");
        sequence[i][j] = 0;
        midi.noteOff(note);
      }
    });
  }

  // Center the matrix vertically
  matrix.style.marginTop = parseInt(window.innerHeight/2 - matrix.clientHeight/2) + "px";
  repaint(0);
}

/**
 * Refreshes the matrix view
 * @param {integer} time The time to wait before refresh the view (in ms)
 */
function repaint(time) {
  redrawer = window.setTimeout(function() {

    for(var i=0; i < sequence.length; i++) {
      var cells = document.getElementById("row" + i).querySelectorAll(".cell");

      for (var j=0; j < steps; j++) {
        cells[j].classList.remove("clocked");

        if(j == currentStep && sequence[i][currentStep] == 0) {
          cells[j].classList.add("clocked");
        }
      }
    }

  }, time);
}

/**
 * Requests a sample to play
 * @param {integer} index The index of the sample to play in the buffer array
 * @param {integer} time  The amount of time to wait before playing the sample
 */
function playSample(index, time) {
  var source = context.createBufferSource();
  source.buffer = buffers[index];
  source.connect(context.destination);
  source.start(time);
}

/**
 * Handles the main loop of the application, scheduling the next note to play
 */
function scheduler() {
  while (nextStepTime < context.currentTime + scheduleAheadTime && playing) {
      scheduleNextStep();
      nextStep();
  }
  if (playing)
    rescheduler = window.setTimeout(scheduler, lookahead);
}

/**
 * Schedules next step notes and associated display repaint
 */
function scheduleNextStep() {
  for(i=0; i < sequence.length; i++) {
    if(sequence[i][currentStep]) {
      playSample(i, nextStepTime);
    }
  }

  repaint(context.currentTime - nextStepTime);
}

/**
 * Increments the current sequencer step
 */
function nextStep() {
  var secondsPerStep = 60.0 / tempo;

  if(groovy) { // swing mode
    var swing_coeff = ((currentStep % 2) == 0) ? 0.32 : 0.18;
    nextStepTime += swing_coeff * secondsPerStep;
  }
  else { // regular mode
    nextStepTime += 0.25 * secondsPerStep;
  }

  currentStep = (currentStep + 1) % steps;
}
