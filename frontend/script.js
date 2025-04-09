document.addEventListener("DOMContentLoaded", () => {
  const uploadForm = document.getElementById("upload-form");
  const audioFileInput = document.getElementById("audio-file");
  const fileNameSpan = document.getElementById("file-name");
  const uploadBtn = document.getElementById("upload-btn");
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress");
  const statusMessage = document.getElementById("status-message");
  const resultContainer = document.getElementById("result-container");
  const transcriptionDiv = document.getElementById("transcription");
  const copyBtn = document.getElementById("copy-btn");
  const downloadBtn = document.getElementById("download-btn");

  // Update file name when a file is selected
  audioFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      fileNameSpan.textContent = file.name;

      // Display file size in a readable format
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      fileNameSpan.textContent += ` (${fileSizeMB} MB)`;
    } else {
      fileNameSpan.textContent = "No file selected";
    }
  });

  // Handle form submission
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = audioFileInput.files[0];
    if (!file) {
      alert("Please select an audio file first.");
      return;
    }

    // Create form data
    const formData = new FormData();
    formData.append("audio", file);

    // Show progress and hide result
    progressContainer.style.display = "block";
    resultContainer.style.display = "none";
    progressBar.style.width = "10%";
    statusMessage.textContent = "Uploading audio file...";
    uploadBtn.disabled = true;

    try {
      // Start the transcription process with event stream
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload file");
      }

      // Handle server-sent events for progress updates
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      progressBar.style.width = "50%";
      statusMessage.textContent =
        "Processing transcription. This may take a while for large files...";

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("Stream complete");
          break;
        }

        // Decode and process the chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages in the buffer
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep the last incomplete chunk in the buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.substring(6));

              if (eventData.status === "processing") {
                statusMessage.textContent = eventData.message;
              } else if (eventData.status === "complete") {
                // Transcription completed
                progressBar.style.width = "100%";
                statusMessage.textContent = "Transcription completed!";

                // Display the result
                displayTranscription(eventData.transcription);
              } else if (eventData.status === "error") {
                throw new Error(eventData.message);
              }
            } catch (e) {
              console.error("Error parsing SSE data", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      progressBar.style.width = "0%";
      statusMessage.textContent = `Error: ${error.message}`;
      alert(`Error: ${error.message}`);
    } finally {
      uploadBtn.disabled = false;
    }
  });

  // Display transcription result
  function displayTranscription(text) {
    resultContainer.style.display = "block";
    transcriptionDiv.textContent = text;

    // Store the transcription text for later use
    transcriptionDiv.dataset.text = text;
  }

  // Copy transcription to clipboard
  copyBtn.addEventListener("click", () => {
    const text = transcriptionDiv.dataset.text;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        alert("Failed to copy text to clipboard");
      });
  });

  // Download transcription as text file
  downloadBtn.addEventListener("click", () => {
    const text = transcriptionDiv.dataset.text;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcription.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});
