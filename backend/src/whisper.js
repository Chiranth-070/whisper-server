const { execSync } = require("child_process");
const util = require("util");
const path = require("path");
const fs = require("fs-extra");
const tmp = require("tmp");
require("dotenv").config();

// Update to use whisper-cli instead of main
const whisperCppPath = process.env.WHISPER_CPP_PATH;
const whisperExecutable = path.join(whisperCppPath, "build/bin/whisper-cli"); // Changed from main to whisper-cli
const modelPath = process.env.MODEL_PATH;

// Check if the executable exists
if (!fs.existsSync(whisperExecutable)) {
  console.error(`Whisper executable not found at: ${whisperExecutable}`);
  throw new Error(
    `Whisper executable not found. Please build whisper.cpp first.`
  );
}

// Ensure the model exists
if (!fs.existsSync(modelPath)) {
  throw new Error(
    `Whisper model not found at ${modelPath}. Please download it first.`
  );
}

/**
 * Transcribe audio using whisper.cpp
 * @param {string} audioFilePath - Path to the audio file
 * @returns {Promise<string>} - Transcription result
 */
async function transcribeAudio(audioFilePath) {
  try {
    // Create transcriptions directory if it doesn't exist
    const transcriptionsDir = path.join(__dirname, "../transcriptions");
    fs.ensureDirSync(transcriptionsDir);
    
    // Use a path within the Docker container
    const outputFilePath = path.join(transcriptionsDir, "temp.txt");
    
    // Check if the file is a WebM file and convert it to WAV if needed
    let fileToProcess = audioFilePath;
    const fileExt = path.extname(audioFilePath).toLowerCase();
    
    if (fileExt === '.webm') {
      console.log('WebM file detected, converting to WAV format...');
      const wavFilePath = `${audioFilePath}.wav`;
      
      // Convert WebM to WAV using FFmpeg
      try {
        execSync(`ffmpeg -i "${audioFilePath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavFilePath}"`, {
          stdio: 'inherit'
        });
        console.log(`Successfully converted WebM to WAV: ${wavFilePath}`);
        fileToProcess = wavFilePath;
      } catch (conversionError) {
        console.error('Error converting WebM to WAV:', conversionError);
        throw new Error(`Failed to convert WebM file: ${conversionError.message}`);
      }
    }

    console.log(`Transcribing audio file: ${fileToProcess}`);
    console.log(`Using model: ${modelPath}`);
    console.log(`Using whisper executable: ${whisperExecutable}`);

    // Command to run whisper.cpp with the audio file
    const command = `${whisperExecutable} -m ${modelPath} -f "${fileToProcess}" > "${outputFilePath}"`;

    console.log(`Executing command: ${command}`);

    // Execute the command
    execSync(command, { stdio: "inherit" });

    // Read the transcription from the output file
    const transcription = fs.readFileSync(outputFilePath, "utf8");

    // Clean up the temporary file
    fs.writeFile(outputFilePath, "", function () {
      console.log("done");
    });
    
    // Clean up the temporary WAV file if we created one
    if (fileToProcess !== audioFilePath) {
      try {
        fs.unlinkSync(fileToProcess);
        console.log(`Removed temporary WAV file: ${fileToProcess}`);
      } catch (cleanupError) {
        console.error(`Error removing temporary WAV file: ${cleanupError}`);
      }
    }

    return transcription;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
}

module.exports = { transcribeAudio };
