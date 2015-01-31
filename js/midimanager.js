var midi_access = null;
var midi_input = null;
var midi_output = null;
var midi_sequence = null;

function MidiManager(seq) {
  midi_sequence = seq;
  navigator.requestMIDIAccess().then(onsuccesscallback, onerrorcallback);
}

function onsuccesscallback(access) {
  midi_access = access;
  setDevice("Launchpad");
  midi_input.onmidimessage = onMidiIn;

  for(var i=0; i < 121; i++) {
    midi_output.send( [ 0x90, i, i*64 % 127 ] );
    midi_output.send( [ 0x80, i, 0 ], window.performance.now() + 500 );
  }
};

function onerrorcallback( err ) {
  console.log( "uh-oh! Something went wrong! Error code: " + err.code );
}

function onMidiIn(midi_mess) {
  if(midi_mess.data[2] != 0) {
    var note = parseInt(midi_mess.data[1]);
    var i = parseInt(note / 16);
    var j = parseInt(note % 8);

    if(midi_sequence[i][j] == 1) {
      midi_output.send([0x80, midi_mess.data[1], 0]);
      $(".row" + i + ".col" + j).removeClass("active");
        midi_sequence[i][j] = 0;
    }
    
    else {
      midi_output.send([0x90, midi_mess.data[1], 100]);
      $(".row" + i + ".col" + j).addClass("active");
      midi_sequence[i][j] = 1;
    }
  }
}

function setDevice(dev) {
  var found_in = false;
  var found_out = false;

  // in
  var iteratorInputs = midi_access.inputs.values();
  while ( (device = iteratorInputs.next().value) != null ) {
    if (device.name == dev) {
      midi_input = device;
      found_in = true;
    }
  }

  // out
  var iteratorOutputs = midi_access.outputs.values();
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

MidiManager.prototype.noteOn = function(note, velocity) {
  midi_output.send( [ 0x90, note, velocity ] );
}

MidiManager.prototype.noteOff = function(note){
  midi_output.send( [ 0x90, note, 0 ] );
}
