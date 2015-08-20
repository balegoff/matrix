var midi_access = null; // root MIDI layer object
var midi_input = null; // device input port
var midi_output = null; // device output port
var midi_sequence = null; // sequencer grid data

/**
 * Constructor
 * @param {Array[]} seq The sequencer grid data
 */
function MidiManager(seq) {
  midi_sequence = seq;
  navigator.requestMIDIAccess().then(
    onsuccesscallback,
    function(err) { console.log("Failed to get MIDI access - " + err); }
  );
}

/**
 * Called when the access to the MIDI layer has been granted
 * @param {MIDIAccess} access The root MIDI layer object
 */
function onsuccesscallback(access) {
  midi_access = access;
  var found = setDevice("Launchpad");

  if(found) {
    midi_input.onmidimessage = onMidiIn;

    // Launch start animation on launchpad
    for(var i=0; i < 121; i++) {
      midi_output.send( [ 0x90, i, i*64 % 127 ] );
      midi_output.send( [ 0x80, i, 0 ], window.performance.now() + 500 );
    }
  }
};

/**
 * MIDI input messages callback
 * @param {MIDIMessageEvent} midi_mess The received MIDI packet
 */
function onMidiIn(midi_mess) {
  var packet = midi_mess.data;

  // Checking if we are receiving a note on message from the 8x8 grid
  if(packet[2] > 0 && !((packet[1]/8)%2 == 1)) {

    var note = parseInt(packet[1]);
    var i = parseInt(note / 16);
    var j = parseInt(note % 8);

    var cell = document.querySelector("#row" + i).querySelector(".col" + j);

    // Send output feedback and update UI
    if(midi_sequence[i][j] == 1) {
      midi_output.send([0x80, packet[1], 0]);
      cell.classList.remove("active");
      midi_sequence[i][j] = 0;
    }
    else {
      midi_output.send([0x90, packet[1], 100]);
      cell.classList.add("active");
      midi_sequence[i][j] = 1;
    }
  }
}

/**
 * Connects a device in and out ports to the application
 * @param {string} dev The device name
 * @return {boolean} True if the connection has been successfully established
 */
function setDevice(dev) {
  var found_in = false;
  var found_out = false;

  // in
  var iteratorInputs = midi_access.inputs.values();
  while(device = iteratorInputs.next().value) {
    if (device.name == dev) {
      midi_input = device;
      found_in = true;
    }
  }

  // out
  var iteratorOutputs = midi_access.outputs.values();
  while(device = iteratorOutputs.next().value) {
    if (device.name == dev) {
      midi_output = device;
      found_out = true;
    }
  }

  if (!found_in || !found_out) {
    console.log("Unable to find device : " + dev);
    return false;
  }

  return true;
}

/**
 * Sends a note on MIDI message to the device output port
 * @param {integer} note      The MIDI note value (0-127)
 * @param {integer} velocity  The note velocity (0-127)
 */
MidiManager.prototype.noteOn = function(note, velocity) {
  midi_output.send([ 0x90, note, velocity ]);
}

/**
 * Sends a note off MIDI message to the device output port
 * @param {integer} note      The MIDI note value (0-127)
 */
MidiManager.prototype.noteOff = function(note){
  midi_output.send([ 0x90, note, 0 ]);
}
