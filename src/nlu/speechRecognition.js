// Google Cloud
const Speech = require('@google-cloud/speech')
const uuidv4 = require("uuid/v4")

// =========================== GOOGLE CLOUD SETTINGS ================================ //

// The encoding of the audio file, e.g. 'LINEAR16'
// The sample rate of the audio file in hertz, e.g. 16000
// The BCP-47 language code to use, e.g. 'en-US'
const encoding = 'LINEAR16'
const sampleRateHertz = 16000
//const languageCode = 'en-US' //en-US, he-IL, fr-FR

const request = {
    config: {
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        profanityFilter: false,
        enableWordTimeOffsets: true
    },
    interimResults: true // If you want interim results, set this to true
}

class GoogleSpeechRecognition {
	constructor (dfAgent) {
        let privateKey = (process.env.NODE_ENV=="production") ? JSON.parse(process.env.GOOGLE_SPEECH_PRIVATE_KEY) : process.env.GOOGLE_SPEECH_PRIVATE_KEY
        let clientEmail = process.env.GOOGLE_SPEECH_CLIENT_EMAIL
        let config = {
            credentials: {
                private_key: privateKey,
                client_email: clientEmail
            }
        }
        this.dfAgent = dfAgent
        this.speech = Speech(config) // Instantiates a client
    }

    setSocketClient(client) {
        this.client = client
        this.sessionID = uuidv4()
	}

    startStream(language) {
        const encoding = 'LINEAR16'
        const sampleRateHertz = 16000

        const request = {
            config: {
                encoding: encoding,
                sampleRateHertz: sampleRateHertz,
                languageCode: language,
                profanityFilter: false,
                enableWordTimeOffsets: true
            },
            interimResults: true // If you want interim results, set this to true
        }
        this.recognizeStream = this.speech.streamingRecognize(request)
            .on('error', err => {
                console.error("speechRecognition.startStream error: ", err)
                this.client.emit('restart', err)
            })
            .on('data', async data => {
                process.stdout.write(
                    (data.results[0] && data.results[0].alternatives[0])
                        ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
                        : `\n\nReached transcription time limit, press Ctrl+C\n`)
                    this.client.emit('speechData', data)
                    var dataFinal = undefined || (data.results && data.results[0] && data.results[0].isFinal)
                    if (dataFinal) {
                        // send request to DialogFlow
                        let responses = await this.dfAgent.sendTextMessageToDialogFlow(data.results[0].alternatives[0].transcript, language, this.sessionID)
                        // upon response, send to client via emit
                        this.client.emit('nluResponse', {
                            intentName: responses[0].queryResult.intent.displayName,
                            intentResponse: responses[0].queryResult.fulfillmentMessages[0].text.text[0]
                        })
                    }
            })
    }

    writeToStream(data) {
        if (this.recognizeStream) {
            this.recognizeStream.write(data)
        }
    }

    endStream() {
        if (this.recognizeStream) {
            this.recognizeStream.end()
        }
        this.recognizeStream = null
    }
 }

 module.exports = {GoogleSpeechRecognition}