// scripts/converter.js

const uploadInput = document.getElementById("upload");
const previewGrid = document.getElementById("preview");
const downloadAllBtn = document.getElementById("downloadAll");
const clearAllBtn = document.getElementById("clearAll");
const errorMessage = document.getElementById("errorMessage");

let convertedImages = [];

uploadInput.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  errorMessage.textContent = "";
  previewGrid.innerHTML = "";
  convertedImages = [];

  for (const file of files) {
    if (!file.type.includes("jpeg") && !file.name.endsWith(".jpg")) {
      errorMessage.textContent = "Only JPG files are allowed.";
      continue;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            const url = URL.createObjectURL(blob);
            convertedImages.push({ blob, name: file.name.replace(/\.jpe?g$/, ".png") });

            const card = document.createElement("div");
            card.className = "image-card";
            card.innerHTML = `
              <img src="${url}" alt="preview" />
              <button class="download-btn " onclick="downloadImage('${url}', '${file.name.replace(/\.jpe?g$/, ".png")}')">Download</button>
            `;
            previewGrid.appendChild(card);
          },
          "image/png",
          1.0
        );
      };
    };
    reader.readAsDataURL(file);
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
    const arrayBuffer = await img.blob.arrayBuffer();
    folder.file(img.name, arrayBuffer);
  }

  zip.generateAsync({ type: "blob" }).then((content) => {
    const zipUrl = URL.createObjectURL(content);
    downloadImage(zipUrl, "converted_images.zip");
  });
});

clearAllBtn.addEventListener("click", () => {
  previewGrid.innerHTML = "";
  convertedImages = [];
  uploadInput.value = "";
  errorMessage.textContent = "";
});



