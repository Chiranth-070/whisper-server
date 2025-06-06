const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const { transcribeAudio } = require("./whisper");
const { default: axios } = require("axios");

const router = express.Router();

// Configure multer for handling large file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Create multer instance with large file size limits
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit (adjust as needed for 1-2 hour audio)
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    const allowedMimeTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/x-m4a",
      "audio/webm",
      "video/webm", // Some WebM files might be detected as video/webm
      "audio/flac",
    ];

    console.log("Uploaded file MIME type:", file.mimetype);

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only audio files are allowed."), false);
    }
  },
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Transcription endpoint
router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const audioFilePath = req.file.path;
    const username = req.body.username;
    console.log(`Username: ${username}`);
    console.log(
      `Received audio file: ${req.file.originalname}, size: ${req.file.size} bytes`
    );

    // Send initial response to acknowledge receipt
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    res.write(
      'data: {"status": "processing", "message": "Starting transcription..."}\n\n'
    );

    // Process transcription asynchronously
    try {
      const transcription = await transcribeAudio(audioFilePath);

      // Check if response is still writable before writing to it
      if (!res.writableEnded) {
        // Send completed transcription
        res.write(
          `data: {"status": "complete", "transcription": ${JSON.stringify(
            transcription
          )}}\n\n`
        );

        const axiosResponse = axios.post(
          "https://briefly-ai-ten.vercel.app/api/meet",
          {
            username: username,
            transcript: transcription,
          }
        );

        console.log(axiosResponse.data);

        // End the response here and don't try to write to it again
        res.end();
      }

      // Clean up the uploaded file - this should happen after ending the response
      fs.removeSync(audioFilePath);
    } catch (error) {
      // Only write and end if the response hasn't been ended yet
      if (!res.writableEnded) {
        res.write(
          `data: {"status": "error", "message": "${error.message}"}\n\n`
        );
        res.end();
      }
    }
  } catch (error) {
    console.error("Error in transcribe endpoint:", error);

    // If headers haven't been sent yet, send error response
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    }
  }
});

module.exports = router;
