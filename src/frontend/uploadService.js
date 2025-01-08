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