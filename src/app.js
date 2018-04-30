'use strict'

//  Example for connecting real-time streaming through socket.io to a Node server
//  Originally created by Vinzenz Aubry for sansho 24.01.17 (Contact: vinzenz@sansho.studio)
//  Improvements and connection to DialogFlow done by Zach (Tzahi) Efrati (Contact: tzahi.efrati@gmail.com)
//  Feel free to improve!

const express = require('express')
const environmentVars = require('dotenv').config()

const app = express();
const port = process.env.PORT || 1337;
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const GoogleSpeechRecognition = require("./nlu/speechRecognition").GoogleSpeechRecognition
const DialogFlow = require("./nlu/dialogFlow").DialogFlow
const dfAgent = new DialogFlow(process.env.DIALOGFLOW_GOOGLE_PROJECT_ID)

var nluAgent = (process.env.NLU=="GOOGLE_SPEECH") ? new GoogleSpeechRecognition(dfAgent) : dfAgent

app.use('/assets', express.static(__dirname + '/public'));
app.use('/session/assets', express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

// =========================== ROUTERS ================================ //
app.get('/', (req, res) => {
    res.render('index', {});
});

app.use('/', (req, res, next) => {
    next();
});


// =========================== SOCKET.IO ================================ //
io.on('connection', client => {
    console.log('Client Connected to server');
    
    nluAgent.setSocketClient(client)

    client.on('join', data => {
        console.log('Client joined to server');
        client.emit('messages', 'Socket Connected to Server');
    });

    client.on('messages', data => {
        client.emit('broad', data);
    });

    client.on('startStream', language => {
        console.log('Client sent startStream event with language:', language);
        nluAgent.startStream(language)
    })

    client.on('endStream', data => {
        console.log('Client sent endStream event');
        nluAgent.endStream()
    });

    client.on('binaryData', binaryData => {
        nluAgent.writeToStream(binaryData)
    });
});




// =========================== START SERVER ================================ //

server.listen(port, "127.0.0.1", function () { //http listen, to make socket work
    // app.address = "127.0.0.1";
    console.log('Server started on port:' + port)
});