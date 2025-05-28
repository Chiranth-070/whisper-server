FROM ubuntu:22.04

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    curl \
    ffmpeg \
    nodejs \
    npm \
    python3 \
    python3-pip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Clone whisper.cpp repository
RUN git clone https://github.com/ggerganov/whisper.cpp.git

# Build whisper.cpp
WORKDIR /app/whisper.cpp
RUN make

# Download the base English model
RUN bash ./models/download-ggml-model.sh base.en

# Copy the backend and frontend code
WORKDIR /app
COPY . .

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Create uploads directory
RUN mkdir -p uploads

# Create .env file with correct paths
RUN echo "PORT=8000\n\
MODEL_PATH=/app/whisper.cpp/models/ggml-base.en.bin\n\
WHISPER_CPP_PATH=/app/whisper.cpp\n\
WHISPER_EXECUTABLE=/app/whisper.cpp/build/bin/whisper-cli" > .env

# No need to install frontend dependencies as it's just static files
# Create frontend directory if it doesn't exist
RUN mkdir -p /app/frontend

# Expose the port
EXPOSE 8000

# Start the server
WORKDIR /app/backend
CMD ["npm", "start"]