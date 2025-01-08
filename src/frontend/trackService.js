
const CHUNK_SIZE = 2000000; // Match backend chunk size

export async function uploadFile(file, title, actor, onFinish) {
  const reader = new FileReader();
  const contentType = file.type;
  const progressDiv = document.getElementById('upload-progress');

  return new Promise((resolve, reject) => {
    reader.onload = async function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
        
        // Show initial progress
        progressDiv.textContent = 'Starting upload...';

        // Upload chunks
        for(let i = 0; i < data.length; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE);
          const currentChunk = Math.floor(i / CHUNK_SIZE) + 1;
          progressDiv.textContent = `Uploading chunk ${currentChunk}/${totalChunks}`;
          await actor.upload(Array.from(chunk));
        }

        // Finalize upload with title
        const result = await actor.uploadFinalize(title, file.type);
        
        // Check for errors in the Result type
        if ('err' in result) {
          progressDiv.textContent = `Upload failed: ${result.err}`;
          reject(new Error(result.err));
          return;
        }

        progressDiv.textContent = 'Upload complete!';
        
        // Call the callback if provided
        if (onFinish) {
          await onFinish();
        }
        
        resolve();
      } catch (error) {
        progressDiv.textContent = `Upload failed: ${error.message}`;
        reject(error);
      }
    };

    reader.onerror = () => {
      progressDiv.te// [title, contentType]xtContent = 'Error reading file';
      reject(new Error('File reading failed'));
    };

    reader.readAsArrayBuffer(file);
  });
}

// Helper function to get file list (optional)
export async function getFileList(actor) {
  try {
    const files = await actor.listFiles();
    return files;
  } catch (error) {
    console.error('Error getting file list:', error);
    return [];
  }
}

export async function loadAudio(auth) {
    const audioContainer = document.getElementById('audio-container');
    if (!audioContainer) {
        console.error('Audio container not found');
        return;
    }

    const actor = auth.getCurrentActor();
    try {
        // Get list of files
        const files = await actor.listFiles();
        
        // Clear existing tracks
        audioContainer.innerHTML = '';
        
        // Create track list
        const trackList = document.getElementById('track-list');
        trackList.innerHTML = '';

        for (const [title, contentType] of files) {
            const trackItem = document.createElement('div');
            trackItem.className = 'track-item';
            
            // Add title and play button
            trackItem.innerHTML = `
                <span>${title}</span>
                <div>
                    <button class="play-btn">Play</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;
            
            // Add click handler for playing
            trackItem.querySelector('.play-btn').addEventListener('click', async () => {
                await loadSingleTrack(actor, title, audioContainer);
            });
            
            // Add click handler for deletion
            trackItem.querySelector('.delete-btn').addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete "${title}"?`)) {
                    await actor.deleteFile(title);
                    await loadAudio(auth); // Refresh the list
                }
            });
            
            trackList.appendChild(trackItem);
        }
    } catch (error) {
        console.error('Error loading audio files:', error);
    }
}

export async function loadSingleTrack(actor, title, container) {
    try {
        let chunkId = 0;
        let chunks = [];
        let contentType;
        let totalChunks;

        // Get first chunk to get metadata
        const firstChunkResponse = await actor.getFileChunk(title, 0);
        console.log('First chunk response:', firstChunkResponse);
        
        if (!firstChunkResponse || !firstChunkResponse[0]) {
            throw new Error('Could not load file data');
        }

        // Extract from array wrapper
        const firstChunk = firstChunkResponse[0];
        contentType = firstChunk.contentType;
        totalChunks = Number(firstChunk.totalChunks);
        chunks.push(firstChunk.chunk);

        // Get remaining chunks
        for (chunkId = 1; chunkId < totalChunks; chunkId++) {
            console.log(`Requesting chunk ${chunkId}/${totalChunks}`);
            const response = await actor.getFileChunk(title, chunkId);
            
            if (!response || !response[0]) {
                throw new Error(`Failed to load chunk ${chunkId}`);
            }
            
            chunks.push(response[0].chunk);
        }

        console.log('All chunks loaded, total chunks:', chunks.length);

        // Combine chunks
        const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const allData = new Uint8Array(totalSize);
        let offset = 0;
        
        for (const chunk of chunks) {
            allData.set(chunk, offset);
            offset += chunk.length;
        }

        // Create and play audio
        const blob = new Blob([allData], { type: contentType });
        const url = URL.createObjectURL(blob);
        
        // Clear existing audio players
        container.innerHTML = '';
        
        const audioPlayer = document.createElement('audio');
        audioPlayer.controls = true;
        audioPlayer.src = url;
        audioPlayer.onerror = (e) => {
            console.error('Audio player error:', e);
            container.innerHTML = `<div class="error">Error playing audio: ${e.message}</div>`;
        };
        
        container.appendChild(audioPlayer);
    } catch (error) {
        console.error('Error loading track:', error);
        container.innerHTML = `<div class="error">Error loading track: ${error.message}</div>`;
    }
}

export async function initUpload(auth) {
    const fileInput = document.getElementById('file-input');
    const titleInput = document.getElementById('file-title');
    const uploadProgress = document.getElementById('upload-progress');

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        const title = titleInput.value.trim();
        
        // Validate inputs
        if (!file) {
            uploadProgress.textContent = 'Please select a file';
            return;
        }
        
        if (!title) {
            uploadProgress.textContent = 'Please enter a title';
            return;
        }

        try {
            uploadProgress.textContent = 'Starting upload...';
            const actor = auth.getCurrentActor();
            
            // Use the uploadFile function with a callback
            await uploadFile(file, title, actor, async () => {
                await loadAudio(auth);
            });

            // Clear inputs
            fileInput.value = '';
            titleInput.value = '';
            
        } catch (error) {
            uploadProgress.textContent = `Upload failed: ${error.message}`;
            console.error('Upload error:', error);
        }
    });

    // Add keyboard support for the title input
    titleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && fileInput.files[0]) {
            const event = new Event('change');
            fileInput.dispatchEvent(event);
        }
    });
}

export async function initTrackPage(auth) {
    // Get track ID from URL
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('id');
    
    // Get references to DOM elements
    const titleElement = document.getElementById('track-title');
    const trackIdElement = document.getElementById('track-id');
    const audioContainer = document.getElementById('audio-container');
    
    // Update track ID display
    trackIdElement.textContent = `Track ID: ${trackId || 'Not specified'}`;
    
    if (!trackId) {
        titleElement.textContent = 'No track specified';
        audioContainer.innerHTML = '<div class="error-message">Please specify a track ID in the URL</div>';
        return;
    }

    try {
        titleElement.textContent = `Loading track: ${trackId}`;
        const actor = auth.getCurrentActor();
        await loadSingleTrack(actor, trackId, audioContainer);
    } catch (error) {
        console.error('Error loading track:', error);
        audioContainer.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
}