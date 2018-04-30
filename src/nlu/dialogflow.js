const dialogflow = require('dialogflow')
const uuidv4 = require("uuid/v4")

class DialogFlow {
	constructor (projectId) {
		this.projectId = projectId
		// Using JSON.parse for heroku deployments. See https://stackoverflow.com/questions/44360792/unable-to-set-rsa-private-key-as-config-var
		let privateKey = (process.env.NODE_ENV=="production") ? JSON.parse(process.env.DIALOGFLOW_PRIVATE_KEY) : process.env.DIALOGFLOW_PRIVATE_KEY
		let clientEmail = process.env.DIALOGFLOW_CLIENT_EMAIL
		let config = {
			credentials: {
				private_key: privateKey,
				client_email: clientEmail
			}
		}
	
		this.detectStream = null
		this.sessionClient = new dialogflow.SessionsClient(config)
	}

	async sendTextMessageToDialogFlow(textMessage, languageCode, sessionID=undefined) {
		// Define session path
		if (!this.sessionID) {
			this.sessionID = sessionID
		}
		const sessionPath = this.sessionClient.sessionPath(this.projectId, this.sessionID)
		// The text query request.
		const request = {
			session: sessionPath,
			queryInput: {
				text: {
					text: textMessage,
					languageCode: languageCode
				}
			}
		}
		try {
			// Send request and log result
			let responses = await this.sessionClient.detectIntent(request)
			
			console.log('DialogFlow.sendTextMessageToDialogFlow: Detected intent')
			return responses
		}
		catch(err) {
			console.error('DialogFlow.sendTextMessageToDialogFlow ERROR:', err)
			throw err
		}
	}
	
	setSocketClient(client) {
		this.client = client
		this.sessionID = uuidv4()
	}

	startStream(language) {
		let sessionPath = this.sessionClient.sessionPath(this.projectId, this.sessionID)
	
		const initialStreamRequest = {
			session: sessionPath,
			queryParams: {
				session: sessionPath
			},
			queryInput: {
				audioConfig: {
					audioEncoding: 'AUDIO_ENCODING_LINEAR_16',
					sampleRateHertz: 16000,
					languageCode: language,
				},
				singleUtterance: false
			}
		}
	
		// Create a stream for the streaming request.
		this.detectStream = this.sessionClient.streamingDetectIntent()
			.on('error', err => {
				console.error("Dialogflow.streamingDetectIntent error:", err)
				this.client.emit('restart', err)
			})
			.on('data', data => {
				if (data.recognitionResult) {
					console.log( `Dialogflow.streamingDetectIntent Intermediate transcript: ${data.recognitionResult.transcript}`)
					this.client.emit('speechData', data)
				} else {
					console.log(`Dialogflow.streamingDetectIntent detected intent. result=`, data.queryResult)
					this.client.emit('nluResponse', {
						intentName: data.queryResult.intent.displayName,
						intentResponse: data.queryResult.fulfillmentMessages[0].text.text[0]
					})
				}
			})
	
		// Write the initial stream request to config for audio input.
		this.detectStream.write(initialStreamRequest)
	}

	writeToStream(binaryData) {
		if (this.detectStream) {
            this.detectStream.write({inputAudio:binaryData})
        }
	}

	endStream() {
		if (this.detectStream) {
			this.detectStream.end()
		}
		this.detectStream = null
	}
}

module.exports = { DialogFlow }