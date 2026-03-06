async function postChat(body) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }

  return response.json();
}

export async function requestViewerTurn({ builder, history, userText }) {
  return postChat({
    surface: "viewer",
    builder,
    history,
    userText,
  });
}

export async function requestStudioTurn({ builder, history, userText, stage, currentProject }) {
  return postChat({
    surface: "studio",
    builder,
    history,
    userText,
    stage,
    currentProject,
  });
}
