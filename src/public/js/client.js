'use strict'

//  Google Cloud Speech Playground with node.js and socket.io
//  Created by Vinzenz Aubry for sansho 24.01.17
//  Feel free to improve!
//	Contact: vinzenz@sansho.studio

//connection to socket
const socket = io.connect();

//================= CONFIG =================
// Stream Audio
let bufferSize = 2048,
	AudioContext,
	context,
	processor,
	input,
	globalStream;

//vars
let audioElement = document.querySelector('audio'),
	finalWord = false,
	resultText = document.getElementById('ResultText'),
	intentNameEl = document.getElementById('intentName'),
	intentResponseEl = document.getElementById('intentResponse'),
	removeLastWord = true,
	streamStreaming = false;


//audioStream constraints
const constraints = {
	audio: true,
	video: false
};

//================= RECORDING =================
var initRecording = language => {
	socket.emit('startStream', language)
	streamStreaming = true;
	AudioContext = window.AudioContext || window.webkitAudioContext;
	context = new AudioContext();
	processor = context.createScriptProcessor(bufferSize, 1, 1);
	processor.connect(context.destination);
	context.resume();

	var handleSuccess = function (stream) {
		globalStream = stream;
		input = context.createMediaStreamSource(stream);
		input.connect(processor);

		processor.onaudioprocess = function (e) {
			microphoneProcess(e);
		};
	};

	navigator.mediaDevices.getUserMedia(constraints)
		.then(handleSuccess);

}

var microphoneProcess = (e) => {
	var left = e.inputBuffer.getChannelData(0)
	var left16 = convertFloat32ToInt16(left)
	socket.emit('binaryData', left16)
}


//================= INTERFACE =================
var languageElement = document.querySelector("#language")
languageElement.addEventListener("change", (e) => {
	if (startButton.disabled) {
		// Currently streaming voice. We're going to change
		restart(languageElement.value)
	}
})

var startButton = document.getElementById("startRecButton");
startButton.addEventListener("click", () => {
	startRecording(languageElement.value)
});

var endButton = document.getElementById("stopRecButton");
endButton.addEventListener("click", stopRecording);
endButton.disabled = true;

var startRecording = language => {
	startButton.disabled = true;
	endButton.disabled = true;
	initRecording(language);
}

var stopRecording = async () => {
	// waited for FinalWord
	startButton.disabled = true;
	endButton.disabled = true;
	streamStreaming = false;
	socket.emit('endStream', '');

	let track = globalStream.getTracks()[0];
	track.stop();

	input.disconnect(processor);
	processor.disconnect(context.destination);
	await context.close()
	input = null;
	processor = null;
	context = null;
	AudioContext = null;
	startButton.disabled = false;
}

//================= SOCKET IO =================
socket.on('connect', data => {
	socket.emit('join', 'Server Connected to Client');
});

socket.on('messages', data => {
	console.log(data);
});

socket.on('speechData', data => {
	if (data && data.results && data.results[0]) {
		console.log(data.results[0].alternatives[0].transcript);
	}
	var dataFinal = undefined || (data.results && data.results[0] && data.results[0].isFinal)

	if (dataFinal === false) {
		if (removeLastWord) { resultText.lastElementChild.remove(); }
		removeLastWord = true;

		//add empty span
		let empty = document.createElement('span');
		resultText.appendChild(empty);

		//add children to empty span
		let edit = addTimeSettingsInterim(data);

		for (var i = 0; i < edit.length; i++) {
			resultText.lastElementChild.appendChild(edit[i]);
			resultText.lastElementChild.appendChild(document.createTextNode('\u00A0'));
		}

	} else if (dataFinal === true) {
		resultText.lastElementChild.remove();

		//add empty span
		let empty = document.createElement('span');
		resultText.appendChild(empty);

		//add children to empty span
		let edit = addTimeSettingsFinal(data);
		for (var i = 0; i < edit.length; i++) {
			resultText.lastElementChild.appendChild(edit[i]);
			resultText.lastElementChild.appendChild(document.createTextNode('\u00A0'));
		}

		console.log("Google Speech sent 'final' Sentence.");
		finalWord = true;
		endButton.disabled = false;

		removeLastWord = false;
	}
});

socket.on('nluResponse', intent => {
	intentNameEl.innerText = "Intent name: " + intent.intentName
	intentResponseEl.innerText = "Intent Response: " + intent.intentResponse
})

socket.on('restart', error => {
	restart(languageElement.value)
})

var restart = async language => {
	await stopRecording()
	startRecording(language)
}
//================= Juggling Spans for nlp Coloring =================
var addTimeSettingsInterim = speechData => {
	let wholeString = speechData.results[0].alternatives[0].transcript;
	console.log(wholeString);

	let nlpObject = nlp(wholeString).out('terms');

	let words_without_time = [];

	for (let i = 0; i < nlpObject.length; i++) {
		//data
		let word = nlpObject[i].text;
		let tags = [];

		//generate span
		let newSpan = document.createElement('span');
		newSpan.innerHTML = word;

		//push all tags
		for (let j = 0; j < nlpObject[i].tags.length; j++) {
			tags.push(nlpObject[i].tags[j]);
		}

		//add all classes
		for (let j = 0; j < nlpObject[i].tags.length; j++) {
			let cleanClassName = tags[j];
			// console.log(tags);
			let className = `nl-${cleanClassName}`;
			newSpan.classList.add(className);
		}

		words_without_time.push(newSpan);
	}

	finalWord = false;
	endButton.disabled = true;

	return words_without_time;
}

var addTimeSettingsFinal = speechData => {
	let wholeString = speechData.results[0].alternatives[0].transcript;

	let nlpObject = nlp(wholeString).out('terms');
	let words = speechData.results[0].alternatives[0].words;

	let words_n_time = [];

	for (let i = 0; i < words.length; i++) {
		//data
		let word = words[i].word;
		let startTime = `${words[i].startTime.seconds}.${words[i].startTime.nanos}`;
		let endTime = `${words[i].endTime.seconds}.${words[i].endTime.nanos}`;
		let tags = [];

		//generate span
		let newSpan = document.createElement('span');
		newSpan.innerHTML = word;
		newSpan.dataset.startTime = startTime;

		//push all tags
		for (let j = 0; j < nlpObject[i].tags.length; j++) {
			tags.push(nlpObject[i].tags[j]);
		}

		//add all classes
		for (let j = 0; j < nlpObject[i].tags.length; j++) {
			let cleanClassName = nlpObject[i].tags[j];
			// console.log(tags);
			let className = `nl-${cleanClassName}`;
			newSpan.classList.add(className);
		}

		words_n_time.push(newSpan);
	}

	return words_n_time;
}

window.onbeforeunload = () => {
	if (streamStreaming) { 
		socket.emit('endStream', ''); 
	}
};

var convertFloat32ToInt16 = buffer => {
	let l = buffer.length;
	let buf = new Int16Array(l / 3);

	while (l--) {
		if (l % 3 == 0) {
			buf[l / 3] = buffer[l] * 0xFFFF;
		}
	}
	return buf.buffer
}