require('dotenv').config();
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const blendShapeNames = require('./blendshapeNames');
const _ = require('lodash');

const SSML_TEMPLATE = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
<voice name="en-US-JennyNeural">
  <mstts:viseme type="FacialExpression"/>
  __TEXT__
</voice>
</speak>`;

const KEY = process.env.AZURE_KEY;
const REGION = process.env.AZURE_REGION;

const textToSpeech = async (text, voice = 'en-US-JennyNeural') => {
  return new Promise((resolve, reject) => {
    try {
      const ssml = SSML_TEMPLATE.replace("__TEXT__", text);

      const speechConfig = sdk.SpeechConfig.fromSubscription(KEY, REGION);
      speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Mp3;

      const randomString = Math.random().toString(36).slice(2, 7);
      const filename = `./public/speech-${randomString}.mp3`;

      const audioConfig = sdk.AudioConfig.fromAudioFileOutput(filename);
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

      const blendData = [];
      let timeStamp = 0;
      const timeStep = 1 / 60;

      synthesizer.visemeReceived = (s, e) => {
        const animation = JSON.parse(e.animation);

        animation.BlendShapes.forEach((blendArray) => {
          const blend = {};
          blendShapeNames.forEach((shapeName, i) => {
            blend[shapeName] = blendArray[i];
          });

          blendData.push({
            time: timeStamp,
            blendshapes: blend,
          });

          timeStamp += timeStep;
        });
      };

      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result) {
            synthesizer.close();
            resolve({ blendData, filename: `/public/speech-${randomString}.mp3` });
          } else {
            synthesizer.close();
            reject(new Error('Synthesis failed'));
          }
        },
        (error) => {
          synthesizer.close();
          reject(error);
        }
      );
    } catch (error) {
      console.error('Text-to-speech function error details:', error.message);
      reject(error);
    }
  });
};

module.exports = textToSpeech;
