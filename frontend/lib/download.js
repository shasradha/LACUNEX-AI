/**
 * Cross-platform download helper.
 * On web browsers: uses the standard blob URL + anchor trick.
 * On Capacitor native: writes file to Downloads via @capacitor/filesystem,
 * then shows a share sheet so the user can see / open the file.
 */

let _Filesystem = null;
let _Directory = null;
let _Share = null;

async function loadCapacitorPlugins() {
  if (_Filesystem) return;
  try {
    const fs = await import("@capacitor/filesystem");
    _Filesystem = fs.Filesystem;
    _Directory = fs.Directory;
  } catch {
    _Filesystem = null;
  }
  try {
    const share = await import("@capacitor/share");
    _Share = share.Share;
  } catch {
    _Share = null;
  }
}

function isNative() {
  if (typeof window === "undefined") return false;
  try {
    return !!(
      window.Capacitor?.isNativePlatform?.() ||
      window.Capacitor?.platform === "android" ||
      window.Capacitor?.platform === "ios"
    );
  } catch {
    return false;
  }
}

/**
 * Convert a Blob to a base64 data string (without the data URI prefix).
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      // Strip the "data:...;base64," prefix
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Download a blob as a file.
 * @param {Blob} blob - The file content
 * @param {string} filename - Desired filename (e.g. "export.pdf")
 */
export async function downloadBlob(blob, filename) {
  if (isNative()) {
    await loadCapacitorPlugins();

    if (_Filesystem) {
      try {
        const base64Data = await blobToBase64(blob);

        // Write to the Downloads directory
        const result = await _Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: _Directory.Documents,
          recursive: true,
        });

        // Try to share the file so user gets feedback that it was saved
        if (_Share) {
          try {
            await _Share.share({
              title: filename,
              text: `${filename} has been saved`,
              url: result.uri,
              dialogTitle: "File saved successfully",
            });
          } catch {
            // User cancelled share dialog — file is still saved, that's fine
          }
        }

        return; // Success — exit early
      } catch (err) {
        console.error("Capacitor Filesystem write failed:", err);
        // Fall through to web-based download as last resort
      }
    }
  }

  // Web fallback: standard blob download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
