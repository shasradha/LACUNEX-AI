/**
 * LACUNEX AI — Hybrid Sandbox Utility
 * Handles client-side execution for Python (via Pyodide) and JS (via Web Workers).
 * This ensures 100% reliability for the most common languages.
 */

let pyodide = null;
let pyodideLoading = false;

/**
 * Lazy-loads the Pyodide runtime from CDN.
 */
async function loadPyodide() {
  if (pyodide) return pyodide;
  if (pyodideLoading) {
    // Wait for existing load to finish
    while (pyodideLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return pyodide;
  }

  pyodideLoading = true;
  try {
    // Load script tag dynamically
    if (!window.loadPyodide) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
      document.head.appendChild(script);
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    }

    // Initialize pyodide
    pyodide = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
      stdout: (text) => console.log(`[Pyodide] ${text}`),
      stderr: (text) => console.error(`[Pyodide Error] ${text}`),
    });
    
    pyodideLoading = false;
    return pyodide;
  } catch (err) {
    pyodideLoading = false;
    throw new Error(`Failed to load Python runtime: ${err.message}`);
  }
}

/**
 * Executes Python code locally in the browser.
 */
export async function runPythonLocally(code, stdin = "") {
  try {
    const py = await loadPyodide();
    
    // Redirect stdout/stderr to capture output
    let stdout = "";
    py.setStdout({ batched: (text) => stdout += text + "\n" });
    py.setStderr({ batched: (text) => stdout += "[Error]\n" + text + "\n" });

    // Mock stdin if provided
    if (stdin) {
      // Very basic stdin mock for Pyodide
      py.runPython(`
import sys
from io import StringIO
sys.stdin = StringIO("""${stdin.replace(/"/g, '\\"')}""")
      `);
    }

    await py.runPythonAsync(code);
    
    return {
      success: true,
      output: stdout.trim() || "(No output)",
      language: "python",
      version: py.version,
      isLocal: true
    };
  } catch (err) {
    return {
      success: false,
      output: `[Python Engine Error]\n${err.message}`,
      language: "python",
      isLocal: true
    };
  }
}

/**
 * Executes JavaScript code safely in the browser.
 */
export async function runJSLocally(code) {
  return new Promise((resolve) => {
    try {
      // Use a blob to create a worker to avoid same-origin issues and sandbox the execution
      const blob = new Blob([`
        onmessage = function(e) {
          const code = e.data;
          let output = "";
          const customConsole = {
            log: (...args) => output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(" ") + "\\n",
            error: (...args) => output += "[Error] " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(" ") + "\\n",
            warn: (...args) => output += "[Warn] " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(" ") + "\\n"
          };
          
          try {
            const func = new Function("console", code);
            func(customConsole);
            postMessage({ success: true, output: output.trim() || "(No output)" });
          } catch (err) {
            postMessage({ success: false, output: output + "\\n[Runtime Error] " + err.message });
          }
        };
      `], { type: "application/javascript" });
      
      const worker = new Worker(URL.createObjectURL(blob));
      const timeout = setTimeout(() => {
        worker.terminate();
        resolve({ success: false, output: "⏱ Execution timed out (5s limit).", language: "javascript", isLocal: true });
      }, 5000);

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        worker.terminate();
        resolve({ ...e.data, language: "javascript", isLocal: true });
      };

      worker.postMessage(code);
    } catch (err) {
      resolve({ success: false, output: `[JS Engine Error] ${err.message}`, language: "javascript", isLocal: true });
    }
  });
}
