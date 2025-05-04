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

// Convert a PNG image to JPG using canvas
function convertToJpg(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.src = event.target.result;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      // Fill white background (to remove transparency)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          const url = URL.createObjectURL(blob);
          const name = file.name.replace(/\.png$/i, ".jpg");
          resolve({ blob, url, name });
        },
        "image/jpeg",
        0.92
      );
    };

    img.onerror = () => reject("Image load error");
    reader.readAsDataURL(file);
  });
}

// Convert images in batches
async function processInBatches(files, maxConcurrent = 1) {
  const queue = [...files];
  let inProgress = 0;
  let completed = 0;

  return new Promise((resolve) => {
    const next = () => {
      if (queue.length === 0 && inProgress === 0) {
        return resolve();
      }

      while (inProgress < maxConcurrent && queue.length > 0) {
        const file = queue.shift();

        if (!file.type.includes("png") && !file.name.toLowerCase().endsWith(".png")) {
          errorMessage.textContent = "Only PNG files are allowed.";
          progressWrapper.style.display = "none";
          actions.style.display = "none";
          progressText.textContent = "";
          continue;
        }

        inProgress++;

        convertToJpg(file).then(({ blob, url, name }) => {
          convertedImages.push({ blob, name });

          const card = document.createElement("div");
          card.className = "image-card";
          card.innerHTML = `
            <img src="${url}" alt="preview" />
            <button class="download-btn" onclick="downloadImage('${url}', '${name}')">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#f0efef"><path d="M8 11L12 15M12 15L16 11M12 15V3M21 11V17.8C21 18.9 21 19.5 20.8 19.9C20.6 20.3 20.3 20.6 19.9 20.8C19.5 21 18.9 21 17.8 21H6.2C5.1 21 4.5 21 4.1 20.8C3.7 20.6 3.4 20.3 3.2 19.9C3 19.5 3 18.9 3 17.8V11" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          `;
          previewGrid.appendChild(card);

          completed++;
          progressText.textContent = `${completed}/${files.length} done`;
          progressBar.style.width = `${(completed / files.length) * 100}%`;
        }).catch(console.error).finally(() => {
          inProgress--;
          next();
        });
      }
    };

    next();
  });
}

// Upload handler
uploadInput.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  errorMessage.textContent = "";
  previewGrid.innerHTML = "";
  convertedImages = [];
  progressBar.style.width = "0%";
  progressText.textContent = `0/${files.length} done`;

  progressWrapper.style.display = "block";
  actions.style.display = "none";
  downloadAllBtn.disabled = true;
  clearAllBtn.disabled = true;

  processingNote.style.display = "block";
  processingNote.textContent = "Processing, please wait...";

  const hasLargeImage = files.some(file => file.size > 2 * 1024 * 1024);
  if (hasLargeImage) {
    processingNote.textContent += " Large image(s) detected, this may take a while...";
  }

  const isMobileOrTablet = /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent);
  const concurrency = isMobileOrTablet ? 1 : 2;

  await processInBatches(files, concurrency);

  progressWrapper.style.display = "none";
  processingNote.style.display = "none";
  actions.style.display = "flex";
  downloadAllBtn.disabled = false;
  clearAllBtn.disabled = false;
});

// Download single image
function downloadImage(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Download all as zip
downloadAllBtn.addEventListener("click", async () => {
  if (convertedImages.length === 0) return;
  const zip = new JSZip();
  const folder = zip.folder("converted");

  for (const img of convertedImages) {
    const arrayBuffer = await img.blob.arrayBuffer();
    folder.file(img.name, arrayBuffer);
  }

  zip.generateAsync({ type: "blob" }).then((content) => {
    const zipUrl = URL.createObjectURL(content);
    downloadImage(zipUrl, "converted_images.zip");
  });
});

// Clear all
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
