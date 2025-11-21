require("dotenv").config(); // Retained for local testing environment
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const { BlobServiceClient } = require("@azure/storage-blob");
const blendShapeNames = require("./blendshapeNames");
const fs = require("fs");
const path = require("path");

// Use Environment Variables for security and Vercel compatibility
const AZURE_KEY = process.env.AZURE_KEY;
const AZURE_REGION = process.env.AZURE_REGION;

// Initialize Azure Storage Clients
const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerClient = blobServiceClient.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER_NAME
);

const SSML_TEMPLATE = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
<voice name="__VOICE__">
  <mstts:viseme type="FacialExpression"/>
  __TEXT__
</voice>
</speak>`;

const textToSpeech = async (text, voice = "en-US-JennyNeural") => {
    return new Promise((resolve, reject) => {
        const ssml = SSML_TEMPLATE
            .replace("__TEXT__", text)
            .replace("__VOICE__", voice);

        const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
        speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Mp3;

        // Generate a unique filename and path (we'll save temporarily)
        const randomString = Math.random().toString(36).slice(2, 7);
        const filename = `speech-${randomString}.mp3`;
        const filepath = path.join(__dirname, "../public", filename);

        const audioConfig = sdk.AudioConfig.fromAudioFileOutput(filepath);
        const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

        const blendData = [];
        let timeStamp = 0;
        const timeStep = 1 / 60;

        // Collect blend shape data
        synthesizer.visemeReceived = (s, e) => {
            const animation = JSON.parse(e.animation);
            animation.BlendShapes.forEach((blendArray) => {
                const blend = {};
                blendShapeNames.forEach((shapeName, i) => {
                    // Blend shape values are normalized between 0 and 1
                    blend[shapeName] = blendArray[i]; 
                });
                blendData.push({ time: timeStamp, blendshapes: blend });
                timeStamp += timeStep;
            });
        };

        synthesizer.speakSsmlAsync(
            ssml,
            async (result) => {
                synthesizer.close();

                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    try {
                        // 1. Read the locally saved file
                        const fileData = fs.readFileSync(filepath);
                        
                        // 2. Upload to Azure Blob Storage
                        const blockBlobClient = containerClient.getBlockBlobClient(filename);
                        await blockBlobClient.upload(fileData, fileData.length, {
                            // Ensure the file is publicly readable
                            blobHTTPHeaders: { blobContentType: 'audio/mpeg' }
                        });
                        
                        // 3. Clean up the local file (Crucial for Vercel Serverless)
                        fs.unlinkSync(filepath);
                        
                        // 4. Resolve with the public URL
                        resolve({ blendData, filename: blockBlobClient.url });
                        

                    } catch (uploadError) {
                        // Cleanup on upload fail
                        if (fs.existsSync(filepath)) fs.unlinkSync(filepath); 
                        reject(new Error(`Azure Upload Failed: ${uploadError.message}`));
                        console.log("Azure upload failed")
                    }
                } else {
                    reject(new Error(`Synthesis failed: ${result.errorDetails}`));
                }
            },
            (error) => {
                synthesizer.close();
                // Ensure local file cleanup on synthesis error
                if (fs.existsSync(filepath)) fs.unlinkSync(filepath); 
                reject(error);
            }
        );
    });
};

module.exports = textToSpeech;

