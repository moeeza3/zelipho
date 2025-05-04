const uploadInput = document.getElementById("upload");
const previewGrid = document.getElementById("preview");
const downloadAllBtn = document.getElementById("downloadAll");
const clearAllBtn = document.getElementById("clearAll");
const errorMessage = document.getElementById("errorMessage");
const progressBar = document.getElementById("progressBar");
const progressWrapper = document.querySelector(".progress-wrapper");
const actions = document.querySelector(".actions");
const progressText = document.getElementById("progressText");

let convertedImages = [];

// Convert a JPG image to PNG using canvas
function convertToPng(file) {
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
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          const url = URL.createObjectURL(blob);
          const name = file.name.replace(/\.jpe?g$/i, ".png").replace(/\.jpg$/i, ".png");
          resolve({ blob, url, name });
        },
        "image/png",
        1.0
      );
    };

    img.onerror = () => reject("Image load error");
    reader.readAsDataURL(file);
  });
}

// Convert images in batches (max 3 at a time)
async function processInBatches(files, maxConcurrent = 1) {
  const queue = [...files];
  let inProgress = 0;
  let completed = 0;

  return new Promise((resolve) => {
    const next = () => {
      if (queue.length === 0 && inProgress === 0) {
        return resolve(); // All done
      }

      while (inProgress < maxConcurrent && queue.length > 0) {
        const file = queue.shift();

        if (!file.type.includes("jpeg") && !file.name.toLowerCase().endsWith(".jpg")) {
          errorMessage.textContent = "Only JPG  files are allowed.";
          progressWrapper.style.display = "none";
         actions.style.display = "none";
         progressText.textContent = "";
          continue;
        }

        inProgress++;

        convertToPng(file).then(({ blob, url, name }) => {
          convertedImages.push({ blob, name });

          const card = document.createElement("div");
          card.className = "image-card";
          card.innerHTML = `
            <img src="${url}" alt="preview" />
            <button class="download-btn" onclick="downloadImage('${url}', '${name}')">
                                   <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#f0efef"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M8 11L12 15M12 15L16 11M12 15V3M21 11V17.7992C21 18.9193 21 19.4794 20.782 19.9072C20.5903 20.2835 20.2843 20.5895 19.908 20.7812C19.4802 20.9992 18.9201 20.9992 17.8 20.9992H6.2C5.0799 20.9992 4.51984 20.9992 4.09202 20.7812C3.71569 20.5895 3.40973 20.2835 3.21799 19.9072C3 19.4794 3 18.9193 3 17.7992V11" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
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

  // Show progress bar, hide buttons
  progressWrapper.style.display = "block";
  actions.style.display = "none";
  downloadAllBtn.disabled = true;
  clearAllBtn.disabled = true;

  await processInBatches(files, 3); // max 3 at once

  // Done - hide progress bar, show buttons
  progressWrapper.style.display = "none";
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
});
