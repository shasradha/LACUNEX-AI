import { clearAuth, getToken } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export class AuthError extends ApiError {
  constructor(message, status, data) {
    super(message, status, data);
    this.name = "AuthError";
  }
}

function buildHeaders({ auth = true, json = true, headers = {} } = {}) {
  const nextHeaders = { ...headers };

  if (auth) {
    const token = getToken();
    if (token) {
      nextHeaders.Authorization = `Bearer ${token}`;
    }
  }

  if (json) {
    nextHeaders["Content-Type"] = "application/json";
  }

  return nextHeaders;
}

async function parseFailure(response) {
  let data = null;

  try {
    data = await response.json();
  } catch {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  // Handle common server-side errors (500, 502, etc.)
  if (response.status >= 500) {
    throw new ApiError(
      "The server is currently syncing your workspace. Please wait 10 seconds and try again.",
      response.status,
      data
    );
  }

  const message =
    (typeof data === "object" && data?.detail) ||
    (typeof data === "string" && data.slice(0, 100)) ||
    `Request failed with status ${response.status}`;

  if (response.status === 401) {
    clearAuth();
    throw new AuthError(message, response.status, data);
  }

  throw new ApiError(message, response.status, data);
}

async function request(path, options = {}) {
  const {
    auth = true,
    body,
    headers,
    json = true,
    method = "GET",
    ...rest
  } = options;

  const isFormData = body instanceof FormData;

  // Longer timeout for file uploads & image analysis (mobile + cold starts)
  const timeoutMs = isFormData ? 60000 : 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders({ auth, json: json && !isFormData, headers }),
      body:
        body == null
          ? undefined
          : isFormData
            ? body
            : json
              ? JSON.stringify(body)
              : body,
      cache: "no-store",
      signal: controller.signal,
      ...rest,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      await parseFailure(response);
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response.text();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new ApiError(
        "Request timed out. The server may be restarting — please try again in a few seconds.",
        408,
        null
      );
    }
    throw err;
  }
}

export async function signup(email, password, name) {
  return request("/api/auth/signup", {
    method: "POST",
    body: { email, password, name },
  });
}

export async function login(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function getModels() {
  return request("/api/models", { auth: false });
}

export async function pingServer() {
  return request("/", { auth: false });
}

export async function getConversations() {
  return request("/api/history/");
}

export async function getConversation(id) {
  return request(`/api/history/${id}`);
}

export async function createConversation(title = "New Workspace") {
  return request("/api/history/session", {
    method: "POST",
    body: { title },
  });
}

export async function saveMessage(data) {
  return request("/api/history/message", {
    method: "POST",
    body: data,
  });
}

export async function updateConversationTitle(id, title) {
  return request(`/api/history/${id}/title`, {
    method: "PUT",
    body: { title },
  });
}

export async function deleteConversation(id) {
  return request(`/api/history/${id}`, {
    method: "DELETE",
  });
}

export async function executeCode(code, language, stdin = "") {
  return request("/api/execute", {
    method: "POST",
    body: { code, language, stdin },
    auth: false, // Code execution is public for the studio
  });
}

export async function generateImage(prompt) {
  return request("/api/image/generate", {
    method: "POST",
    body: { prompt },
  });
}

export async function analyzeImage(file, prompt) {
  const formData = new FormData();
  formData.append("file", file);
  if (prompt) {
    formData.append("prompt", prompt);
  }

  return request("/api/image/analyze", {
    method: "POST",
    body: formData,
    json: false,
  });
}

export async function extractFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  return request("/api/files/extract", {
    method: "POST",
    body: formData,
    json: false,
  });
}

export async function keepAlive() {
  try {
    await fetch(`${API_BASE_URL}/`, { method: "GET", cache: "no-store" });
  } catch { /* silent */ }
}

export async function streamChat(
  message,
  mode,
  history,
  callbacks,
  provider = "groq",
  model = null,
  webSearch = false,
  signal = null
) {
  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      message,
      mode,
      history,
      provider,
      model,
      web_search: webSearch,
    }),
    signal,
  });

  if (!response.ok) {
    await parseFailure(response);
  }

  if (!response.body) {
    throw new ApiError("Streaming is unavailable in the current environment.", 500, null);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const dataLine = event
        .split("\n")
        .find((line) => line.startsWith("data: "));

      if (!dataLine) {
        continue;
      }

      try {
        const payload = JSON.parse(dataLine.slice(6));

        if (payload.type === "mode_detected") {
          callbacks.onModeDetected?.(payload);
        }

        if (payload.type === "search_status") {
          callbacks.onSearchStatus?.(payload.content || "Searching...");
        }

        if (payload.type === "image_search") {
          callbacks.onImageSearch?.(payload);
        }

        if (payload.type === "images") {
          callbacks.onImages?.(payload);
        }

        if (payload.type === "token") {
          callbacks.onToken?.(payload.content || "");
        }

        if (payload.type === "thinking") {
          callbacks.onThinking?.(payload.content || "");
        }

        if (payload.type === "max_output_activated") {
          callbacks.onMaxOutputActivated?.(payload);
        }

        if (payload.type === "doc_progress") {
          callbacks.onDocProgress?.(payload);
        }

        if (payload.type === "doc_toc") {
          callbacks.onDocToc?.(payload);
        }

        if (payload.type === "done") {
          await callbacks.onDone?.(payload);
        }

        if (payload.type === "error") {
          callbacks.onError?.(payload.content || "The model request failed.");
        }
      } catch (err) {
        console.error("Malformed SSE chunk:", dataLine, err);
        // Continue parsing next events
      }
    }
  }
}

export async function exportConversation(title, messages, format = "pdf", modelName = null) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ title, messages, format, model_name: modelName }),
    cache: "no-store",
  });

  if (!response.ok) {
    await parseFailure(response);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `lacunex-export.${format}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Document Intelligence Exports ─────────────────────────────────────────

export async function exportDocument(docJson, theme = "professional", format = "pdf") {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/export/document`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ document_json: docJson, theme, format }),
    cache: "no-store",
  });

  if (!response.ok) {
    await parseFailure(response);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `lacunex-document.${format}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportDocumentAll(docJson, theme = "professional") {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/export/all`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ document_json: docJson, theme }),
    cache: "no-store",
  });

  if (!response.ok) {
    await parseFailure(response);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : "lacunex-document_all.zip";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function getSuggestions(messageContent) {
  const response = await fetch(`${API_BASE_URL}/api/chat/suggestions`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ message: messageContent }),
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.suggestions || [];
}
