# Example for connecting real-time streaming through socket.io to a Node server
An easy-to-set-up playground for cross device real-time Speech Recognition amd intent extraction with a Node server and socket.io.

## NLU Options 
1. Using [Google Cloud Speech](https://cloud.google.com/speech-to-text/) for transcription and DialogFlow for extracting intent from the trnscription
2. Using [DialogFlow audio streaming intent detect](https://dialogflow.com/docs/reference/api-v2/rpc/google.cloud.dialogflow.v2#google.cloud.dialogflow.v2.StreamingDetectIntentRequest) to transcribe and extract intent in one call

## How to run
1. Set a service account for [Google Cloud Speech](https://cloud.google.com/speech/docs/quickstart ) 
2. Set a service acconut for [Dialogflow project](https://medium.com/@tzahi/how-to-setup-dialogflow-v2-authentication-programmatically-with-node-js-b37fa4815d89)
3. For each service acconut, set their private_key and email fields values in .env
4. Choose the Google Cloud Speech option by setting 'NLU' in .env to 'GOOGLE_SPEECH. For Dialogflow option, don't set the value

### Made by [Zach (Tzahi) Efrati](http://linkedin.com/in/efrati) 

This is a work in progress. Please feel free to submit issues and PR!

Work is based on the GitHub repository by [Vinzenz Aubry](https://github.com/vin-ni/Google-Cloud-Speech-Node-Socket-Playground)