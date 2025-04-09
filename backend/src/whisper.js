const { execSync } = require("child_process");
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
    const outputFilePath =
      "/media/chiranth/Data/miniproject/whisper-server/backend/transcriptions/temp.txt";

    console.log(`Transcribing audio file: ${audioFilePath}`);
    console.log(`Using model: ${modelPath}`);
    console.log(`Using whisper executable: ${whisperExecutable}`);

    // Command to run whisper.cpp with the audio file
    // Note: whisper-cli may have slightly different command line options
    const command = `${whisperExecutable} -m ${modelPath} -f ${audioFilePath} > ${outputFilePath} `;

    console.log(`Executing command: ${command}`);

    // Execute the command
    execSync(command, { stdio: "inherit" });

    // Read the transcription from the output file
    const transcription = fs.readFileSync(outputFilePath, "utf8");
    // console.log(transcription)

    // Clean up the temporary file
    fs.writeFile(outputFilePath, "", function () {
      console.log("done");
    });

    return transcription;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
}

module.exports = { transcribeAudio };
