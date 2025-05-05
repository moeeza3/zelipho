const uploadInput = document.getElementById("upload");
const previewGrid = document.getElementById("preview");
const downloadAllBtn = document.getElementById("downloadAll");
const clearAllBtn = document.getElementById("clearAll");
const errorMessage = document.getElementById("errorMessage");
const progressBar = document.getElementById("progressBar");
const progressWrapper = document.querySelector(".progress-wrapper");
const actions = document.querySelector(".actions");
const progressText = document.getElementById("progressText");
const processingNote = document.getElementById("processingNote");

let convertedImages = [];

function convertTiffToPng(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function(e) {
      try {
        const buffer = e.target.result;
        const ifds = UTIF.decode(buffer);
        if (!ifds || ifds.length === 0) {
          reject(new Error("Invalid or corrupt TIFF file"));
          return;
        }

        UTIF.decodeImage(buffer, ifds[0]);
        const rgba = UTIF.toRGBA8(ifds[0]);

        const canvas = document.createElement("canvas");
        canvas.width = ifds[0].width;
        canvas.height = ifds[0].height;
        const ctx = canvas.getContext("2d");
        
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        imageData.data.set(rgba);
        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error("Conversion failed"));
              return;
            }
            const url = URL.createObjectURL(blob);
            const name = file.name.replace(/\.tiff?$/i, ".png");
            resolve({ blob, url, name });
          },
          "image/png" // Changed MIME type
        );
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("File reading failed"));
    reader.readAsArrayBuffer(file);
  });
}

async function processInBatches(files, maxConcurrent = 1) {
  const validFiles = files.filter(file => 
    file.name.toLowerCase().endsWith(".tif") || 
    file.name.toLowerCase().endsWith(".tiff")
  );

  if (validFiles.length === 0) {
    errorMessage.textContent = "No valid TIFF files found";
    return Promise.reject("No valid files");
  }

  const queue = [...validFiles];
  let completed = 0;
  let failed = 0;

  return new Promise((resolve) => {
    const processNext = async () => {
      if (queue.length === 0) {
        if (failed > 0) {
          errorMessage.textContent = `${failed} file(s) failed to convert`;
        }
        resolve();
        return;
      }

      const batch = queue.splice(0, maxConcurrent);
      await Promise.allSettled(batch.map(async (file) => {
        try {
          const result = await convertTiffToPng(file); // Changed function name
          convertedImages.push(result);

          const card = document.createElement("div");
          card.className = "image-card";
          card.innerHTML = `
            <img src="${result.url}" alt="preview" />
            <button class="download-btn" onclick="downloadImage('${result.url}', '${result.name}')">Download</button>
          `;
          previewGrid.appendChild(card);

          completed++;
        } catch (error) {
          console.error("Conversion error:", error);
          failed++;
          errorMessage.textContent = `Failed to convert ${file.name}: ${error.message}`;
        } finally {
          progressText.textContent = `${completed}/${files.length} done`;
          progressBar.style.width = `${(completed / files.length) * 100}%`;
        }
      }));

      processNext();
    };

    processNext();
  });
}

uploadInput.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  // Reset state
  errorMessage.textContent = "";
  previewGrid.innerHTML = "";
  convertedImages = [];
  progressBar.style.width = "0%";
  progressText.textContent = `0/${files.length} done`;
  actions.style.display = "none";
  downloadAllBtn.disabled = true;
  clearAllBtn.disabled = true;
  progressWrapper.style.display = "block";
  processingNote.style.display = "block";

  try {
    await processInBatches(files, navigator.hardwareConcurrency || 2);
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    progressWrapper.style.display = "none";
    processingNote.style.display = "none";
    if (convertedImages.length > 0) {
      actions.style.display = "flex";
      downloadAllBtn.disabled = false;
      clearAllBtn.disabled = false;
    }
  }
});

function downloadImage(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

downloadAllBtn.addEventListener("click", async () => {
  if (convertedImages.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder("converted");

  for (const img of convertedImages) {
    const buffer = await img.blob.arrayBuffer();
    folder.file(img.name, buffer);
  }

  zip.generateAsync({ type: "blob" }).then((zipContent) => {
    const url = URL.createObjectURL(zipContent);
    downloadImage(url, "converted_images.zip");
  });
});

clearAllBtn.addEventListener("click", () => {
  previewGrid.innerHTML = "";
  convertedImages = [];
  uploadInput.value = "";
  errorMessage.textContent = "";
  progressBar.style.width = "0%";
  progressWrapper.style.display = "none";
  actions.style.display = "none";
  progressText.textContent = "";
  processingNote.style.display = "none";
});
