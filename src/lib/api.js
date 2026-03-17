async function postJson(url, body) {
  const response = await fetch(url, {
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

export async function requestViewerTurn({ slug, history, userText }) {
  return postJson("/api/public/chat", {
    slug,
    history,
    userText,
  });
}

export async function requestStudioTurn({
  history,
  userText,
  stage,
  currentProject,
  focusField,
}) {
  return postJson("/api/studio/chat", {
    history,
    userText,
    stage,
    currentProject,
    focusField,
  });
}
