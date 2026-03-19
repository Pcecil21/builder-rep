import { PROFILE_FIELD_ORDER } from "@/lib/builder-profile";

const TOPIC_WEIGHTS = {
  background: 1.0,
  aiRelationship: 0.95,
  currentFocus: 1.1,
  notableBuild: 1.05,
  idealWork: 0.85,
  builderPhilosophy: 0.9,
  originStory: 0.7,
};

const MAX_DEPTH = 3;
const MIN_DEPTH = 1;
const SHORT_ANSWER_THRESHOLD = 80;
const LONG_ANSWER_THRESHOLD = 200;
const STALE_TURN_THRESHOLD = 30;

const QUESTION_BANK = {
  background: {
    primary: "Before AI became central to your work, what was your background and what kind of work shaped you?",
    followUps: [
      "What skills from that earlier career turn out to be surprisingly useful now?",
      "Was there a specific moment where your previous experience directly influenced how you build with AI?",
      "How does your background give you an edge that someone who started in AI from day one wouldn't have?",
    ],
  },
  aiRelationship: {
    primary: "When you build with AI, do you see yourself as technical, non-technical, or hybrid?",
    followUps: [
      "Where does your comfort zone end and where do you start reaching for help or tools?",
      "Has your relationship to the technical side shifted over the last year?",
      "What does 'building with AI' actually look like in your day-to-day?",
    ],
    contextual: {
      hasTools: (tools) =>
        `I can see ${tools} in your stack. Do you think of yourself as technical, non-technical, or something in between when you build with AI?`,
    },
  },
  currentFocus: {
    primary: "What are you building right now, and where is most of your energy going?",
    followUps: [
      "What's the hardest part of what you're working on right now?",
      "Where do you see this current focus leading in six months?",
      "If someone came to you with funding for this, what would you build next?",
    ],
    contextual: {
      hasGithub: "You added a GitHub presence, which helps. What are you actively building right now, and where is most of your energy going?",
    },
  },
  notableBuild: {
    primary: "What is the most interesting thing you've built with AI so far, and why does it stand out to you?",
    followUps: [
      "What was technically hard about it, and how did you solve it?",
      "If you were rebuilding it today, what would you change?",
      "What did building that teach you that you couldn't have learned any other way?",
    ],
  },
  idealWork: {
    primary: "What kind of work, clients, or opportunities do you want to be known for from here?",
    followUps: [
      "Is there a specific type of problem or industry where you think you'd have the most impact?",
      "What kind of project would you turn down, and why?",
      "When you imagine the ideal engagement, what does the first week look like?",
    ],
  },
  builderPhilosophy: {
    primary: "When you build, what is your philosophy? What do you optimize for, and what do you avoid?",
    followUps: [
      "What's a principle you follow that most builders would disagree with?",
      "Can you give me an example of a time your philosophy shaped a concrete decision?",
      "What mistakes have taught you the most about how to build well?",
    ],
  },
  originStory: {
    primary: "How did you get into AI building in the first place? Was there a turning point or a story behind it?",
    followUps: [
      "Was there a specific project or moment where you realized this was going to be your main thing?",
      "Who influenced your path into this, if anyone?",
      "Looking back, what was the first real thing you built with AI, even if it was small?",
    ],
  },
};

export function assessTopicCoverage(builder, history = []) {
  const coverage = {};
  const userMessages = history.filter((m) => m.role === "user");

  for (const field of PROFILE_FIELD_ORDER) {
    const value = builder.profile?.[field] ?? "";
    const hasContent = Boolean(typeof value === "string" && value.trim());

    let depth = 0;
    if (hasContent) {
      depth = 1;
      if (value.length > LONG_ANSWER_THRESHOLD) depth = 2;
      if (value.length > LONG_ANSWER_THRESHOLD * 2) depth = 3;
    }

    let lastMentionedTurn = -1;
    const fieldLower = field.toLowerCase();
    const relatedTerms = getRelatedTerms(field);
    for (let i = 0; i < userMessages.length; i++) {
      const text = (userMessages[i].text ?? "").toLowerCase();
      if (relatedTerms.some((term) => text.includes(term))) {
        lastMentionedTurn = i;
      }
    }

    const stale = hasContent && userMessages.length > STALE_TURN_THRESHOLD && lastMentionedTurn >= 0 && (userMessages.length - lastMentionedTurn) > STALE_TURN_THRESHOLD;

    coverage[field] = {
      covered: hasContent,
      depth,
      stale,
      weight: TOPIC_WEIGHTS[field] ?? 0.8,
      lastMentionedTurn,
    };
  }

  return coverage;
}

function getRelatedTerms(field) {
  const termMap = {
    background: ["background", "career", "before ai", "previous", "came from"],
    aiRelationship: ["technical", "non-technical", "hybrid", "relationship to ai", "how you build"],
    currentFocus: ["right now", "current", "focus", "energy", "working on"],
    notableBuild: ["interesting", "notable", "best build", "proud of", "stand out"],
    idealWork: ["ideal", "want to", "known for", "opportunities", "looking for"],
    builderPhilosophy: ["philosophy", "optimize", "avoid", "principle", "approach"],
    originStory: ["origin", "got into", "started", "turning point", "first"],
  };
  return termMap[field] ?? [field.toLowerCase()];
}

export function selectNextTopic(coverage, history = [], builder = null) {
  const userMessages = history.filter((m) => m.role === "user");
  const lastUserMessage = userMessages[userMessages.length - 1];
  const lastAnswerLength = lastUserMessage?.text?.length ?? 0;

  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  const currentTopic = detectCurrentTopic(lastAssistant?.text ?? "", coverage);

  if (currentTopic && lastAnswerLength > LONG_ANSWER_THRESHOLD) {
    const topicState = coverage[currentTopic];
    if (topicState && topicState.depth < MAX_DEPTH) {
      return { topic: currentTopic, action: "deepen", depth: topicState.depth + 1 };
    }
  }

  if (currentTopic && lastAnswerLength < SHORT_ANSWER_THRESHOLD) {
    // Short answer — move on
  }

  const staleTopic = findStaleTopic(coverage);
  if (staleTopic) {
    return { topic: staleTopic, action: "revisit", depth: coverage[staleTopic].depth };
  }

  const uncovered = PROFILE_FIELD_ORDER
    .filter((field) => !coverage[field].covered)
    .sort((a, b) => (coverage[b].weight ?? 0) - (coverage[a].weight ?? 0));

  if (uncovered.length > 0) {
    return { topic: uncovered[0], action: "introduce", depth: 0 };
  }

  const allAtMax = PROFILE_FIELD_ORDER.every((f) => coverage[f].depth >= MAX_DEPTH);
  if (allAtMax) {
    return { topic: null, action: "transition-to-builds", depth: 0 };
  }

  const shallowest = PROFILE_FIELD_ORDER
    .filter((f) => coverage[f].depth < MAX_DEPTH)
    .sort((a, b) => coverage[a].depth - coverage[b].depth);

  if (shallowest.length > 0) {
    return { topic: shallowest[0], action: "deepen", depth: coverage[shallowest[0]].depth + 1 };
  }

  return { topic: null, action: "transition-to-builds", depth: 0 };
}

function detectCurrentTopic(assistantText, coverage) {
  const lower = assistantText.toLowerCase();
  for (const field of PROFILE_FIELD_ORDER) {
    const terms = getRelatedTerms(field);
    if (terms.some((term) => lower.includes(term))) {
      return field;
    }
  }
  return null;
}

function findStaleTopic(coverage) {
  for (const field of PROFILE_FIELD_ORDER) {
    if (coverage[field].stale) {
      return field;
    }
  }
  return null;
}

export function generateQuestion(topic, depth, builder, history = []) {
  if (!topic) {
    return "We've covered a lot of ground on your background. Want to walk me through a specific build next?";
  }

  const bank = QUESTION_BANK[topic];
  if (!bank) {
    return QUESTION_BANK.background.primary;
  }

  if (depth === 0) {
    if (bank.contextual) {
      if (bank.contextual.hasTools && builder?.toolStack?.regular?.length) {
        const tools = builder.toolStack.regular.slice(0, 3).join(", ");
        return bank.contextual.hasTools(tools);
      }
      if (bank.contextual.hasGithub && builder?.github?.profileUrl) {
        return bank.contextual.hasGithub;
      }
    }
    return bank.primary;
  }

  const followUpIndex = Math.min(depth - 1, bank.followUps.length - 1);
  return bank.followUps[followUpIndex] ?? bank.primary;
}

export function extractProfileUpdates(topic, userText, builder) {
  if (!topic || !userText?.trim()) {
    return {};
  }

  const trimmed = userText.trim();
  const existing = builder?.profile?.[topic] ?? "";

  if (!existing) {
    return { [topic]: trimmed.length > 260 ? `${trimmed.slice(0, 257).trimEnd()}...` : trimmed };
  }

  const enriched = existing.length + trimmed.length > 520
    ? existing
    : `${existing} ${trimmed}`.trim();

  return { [topic]: enriched.length > 520 ? `${enriched.slice(0, 517).trimEnd()}...` : enriched };
}

export function shouldTransitionToBuilds(coverage, builder) {
  const coveredCount = PROFILE_FIELD_ORDER.filter((f) => coverage[f].covered).length;
  const atMinDepth = PROFILE_FIELD_ORDER.every((f) => !coverage[f].covered || coverage[f].depth >= MIN_DEPTH);

  if (coveredCount >= PROFILE_FIELD_ORDER.length && atMinDepth) {
    return true;
  }

  if (coveredCount >= 4 && atMinDepth) {
    return true;
  }

  return false;
}

export function buildEngineContext(builder, history = []) {
  const coverage = assessTopicCoverage(builder, history);
  const selection = selectNextTopic(coverage, history, builder);
  const question = generateQuestion(selection.topic, selection.depth, builder, history);
  const transitionReady = shouldTransitionToBuilds(coverage, builder);

  return {
    coverage,
    suggestedTopic: selection.topic,
    suggestedAction: selection.action,
    suggestedDepth: selection.depth,
    suggestedQuestion: question,
    transitionReady,
  };
}
