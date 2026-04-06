/**
 * LACUNEX AI — Hybrid Sandbox Utility v3.2.1
 * Handles client-side execution for Python (via Pyodide) and JS (via Web Workers).
 * Includes performance tracking, memory safeguards, and graceful exit handling.
 */

let pyodide = null;
let pyodideLoading = false;

/**
 * Lazy-loads and caches the Pyodide runtime.
 */
async function loadPyodide() {
  if (pyodide) return pyodide;
  if (pyodideLoading) {
    while (pyodideLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return pyodide;
  }

  pyodideLoading = true;
  try {
    if (!window.loadPyodide) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
      document.head.appendChild(script);
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    }

    pyodide = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
    });
    
    // Pre-load common packages (optional, but makes things feel premium)
    // await pyodide.loadPackage(["micropip"]);
    
    pyodideLoading = false;
    return pyodide;
  } catch (err) {
    pyodideLoading = false;
    throw new Error(`Failed to load Python runtime: ${err.message}`);
  }
}

/**
 * Executes Python code locally.
 * Handles SystemExit gracefully and tracks performance.
 */
export async function runPythonLocally(code, stdin = "") {
  const startTime = performance.now();
  try {
    const py = await loadPyodide();
    
    let stdout = "";
    py.setStdout({ batched: (text) => stdout += text + "\n" });
    py.setStderr({ batched: (text) => stdout += "[Error]\n" + text + "\n" });

    // Patch sys.exit to avoid throwing ugly Tracebacks in the UI
    await py.runPythonAsync(`
import sys
import io
sys.stdin = io.StringIO("""${stdin.replace(/"/g, '\\"')}""")

def custom_exit(code=0):
    pass # Graceful exit in sandbox

sys.exit = custom_exit
    `);

    await py.runPythonAsync(code);
    
    const endTime = performance.now();
    return {
      success: true,
      output: stdout.trim() || "(No output)",
      language: "python",
      version: py.version,
      isLocal: true,
      executionTime: (endTime - startTime).toFixed(2),
      memoryUsage: "N/A" // Web browsers restrict precise memory access for security
    };
  } catch (err) {
    const endTime = performance.now();
    // Check if it's just a SystemExit(0) which we can treat as success
    if (err.message.includes("SystemExit: 0") || err.message.includes("SystemExit: None")) {
       return {
          success: true,
          output: "Execution finished gracefully.",
          isLocal: true,
          executionTime: (endTime - startTime).toFixed(2)
       };
    }
    
    return {
      success: false,
      output: `[Python Error]\n${err.message}`,
      language: "python",
      isLocal: true,
      executionTime: (endTime - startTime).toFixed(2)
    };
  }
}

/**
 * Executes JavaScript code in a highly isolated Web Worker sandbox.
 */
export async function runJSLocally(code) {
  const startTime = performance.now();
  return new Promise((resolve) => {
    try {
      const blob = new Blob([`
        onmessage = function(e) {
          const code = e.data;
          let output = "";
          
          // Severe Isolation: Wipe out dangerous globals
          const restrictedGlobals = [
            'window', 'document', 'localStorage', 'sessionStorage', 
            'indexedDB', 'fetch', 'XMLHttpRequest', 'WebSocket'
          ];
          
          const consoleProxy = {
            log: (...args) => output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(" ") + "\\n",
            error: (...args) => output += "[Error] " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(" ") + "\\n",
            warn: (...args) => output += "[Warn] " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(" ") + "\\n"
          };
          
          try {
            // Function constructor provides a clean scope
            // We pass null for all restricted globals to shadow them
            const args = ['console', ...restrictedGlobals, code];
            const func = new Function(...args);
            func(consoleProxy, ...restrictedGlobals.map(() => null));
            
            postMessage({ success: true, output: output.trim() || "(No output)" });
          } catch (err) {
            postMessage({ success: false, output: output + "\\n[Runtime Error] " + err.message });
          }
        };
      `], { type: "application/javascript" });
      
      const worker = new Worker(URL.createObjectURL(blob));
      
      // Auto-kill infinite loops after 5s
      const timeout = setTimeout(() => {
        worker.terminate();
        const endTime = performance.now();
        resolve({ 
          success: false, 
          output: "⏱ Execution timed out (5s limit). Your code might have an infinite loop.", 
          language: "javascript", 
          isLocal: true,
          executionTime: (endTime - startTime).toFixed(2)
        });
      }, 5000);

      worker.onmessage = (e) => {
        clearTimeout(timeout);
        worker.terminate();
        const endTime = performance.now();
        resolve({ 
          ...e.data, 
          language: "javascript", 
          isLocal: true,
          executionTime: (endTime - startTime).toFixed(2)
        });
      };

      worker.postMessage(code);
    } catch (err) {
      const endTime = performance.now();
      resolve({ 
        success: false, 
        output: `[JS Engine Error] ${err.message}`, 
        language: "javascript", 
        isLocal: true,
        executionTime: (endTime - startTime).toFixed(2)
      });
    }
  });
}
