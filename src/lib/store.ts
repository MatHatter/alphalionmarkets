/** Mutations over State. Pure functions: each returns a new State. */
import {
  MAX_MESSAGE_LENGTH,
  type Message,
  type Poll,
  type Sentiment,
  type State,
} from './types';
import {
  buildLinkPreview,
  extractHashtags,
  extractMentions,
  extractSymbols,
} from './parse';

let counter = 0;
export function newId(prefix = 'm'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export interface DraftInput {
  body: string;
  sentiment?: Sentiment;
  parentId?: string;
  resharedId?: string;
  images?: string[];
  poll?: { options: string[]; durationMs: number };
}

export class PostError extends Error {}

/**
 * Create a message. Entities are parsed and frozen at post time, matching the
 * no-edit rule (§1): a message's links never change after it is posted.
 */
export function postMessage(state: State, input: DraftInput, now = Date.now()): State {
  const body = input.body.trim();
  const isBareReshare = Boolean(input.resharedId) && body.length === 0;

  if (!body && !isBareReshare && !(input.images?.length) && !input.poll) {
    throw new PostError('A message needs a body, an image, or a poll.');
  }
  if (body.length > MAX_MESSAGE_LENGTH) {
    throw new PostError(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`);
  }
  if (input.parentId && !state.messages[input.parentId]) {
    throw new PostError('The message being replied to no longer exists.');
  }
  if (input.resharedId && !state.messages[input.resharedId]) {
    throw new PostError('The message being reshared no longer exists.');
  }

  let poll: Poll | undefined;
  if (input.poll) {
    const options = input.poll.options.map((o) => o.trim()).filter(Boolean);
    if (options.length < 2 || options.length > 4) {
      throw new PostError('A poll needs between 2 and 4 options.');
    }
    poll = {
      options: options.map((label) => ({ id: newId('opt'), label, votes: 0 })),
      endsAt: now + input.poll.durationMs,
    };
  }

  // Threads are one level deep: replying to a reply attaches to its root.
  const parent = input.parentId ? state.messages[input.parentId] : undefined;
  const parentId = parent ? parent.parentId ?? parent.id : undefined;

  const message: Message = {
    id: newId(),
    authorId: state.viewerId,
    body,
    createdAt: now,
    sentiment: input.sentiment,
    symbols: extractSymbols(body),
    hashtags: extractHashtags(body),
    mentions: extractMentions(body),
    parentId,
    resharedId: input.resharedId,
    poll,
    linkPreview: buildLinkPreview(body),
    images: input.images ?? [],
    likedBy: [],
    bookmarkedBy: [],
    deleted: false,
  };

  return { ...state, messages: { ...state.messages, [message.id]: message } };
}

function updateMessage(
  state: State,
  id: string,
  fn: (message: Message) => Message,
): State {
  const message = state.messages[id];
  if (!message) return state;
  return { ...state, messages: { ...state.messages, [id]: fn(message) } };
}

function toggleMembership(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function toggleLike(state: State, id: string): State {
  return updateMessage(state, id, (m) => ({
    ...m,
    likedBy: toggleMembership(m.likedBy, state.viewerId),
  }));
}

export function toggleBookmark(state: State, id: string): State {
  return updateMessage(state, id, (m) => ({
    ...m,
    bookmarkedBy: toggleMembership(m.bookmarkedBy, state.viewerId),
  }));
}

/**
 * Tombstone rather than remove: replies and reshares still point here, and a
 * dangling reference would break their rendering.
 */
export function deleteMessage(state: State, id: string): State {
  return updateMessage(state, id, (m) =>
    m.authorId === state.viewerId
      ? { ...m, deleted: true, body: '', images: [], poll: undefined, linkPreview: undefined }
      : m,
  );
}

/** One vote per user, and only while the poll is open. */
export function voteInPoll(
  state: State,
  id: string,
  optionId: string,
  now = Date.now(),
): State {
  return updateMessage(state, id, (m) => {
    if (!m.poll || m.poll.votedOptionId || now >= m.poll.endsAt) return m;
    if (!m.poll.options.some((o) => o.id === optionId)) return m;
    return {
      ...m,
      poll: {
        ...m.poll,
        votedOptionId: optionId,
        options: m.poll.options.map((o) =>
          o.id === optionId ? { ...o, votes: o.votes + 1 } : o,
        ),
      },
    };
  });
}

export function toggleFollowUser(state: State, userId: string): State {
  if (userId === state.viewerId) return state;
  return { ...state, followedUsers: toggleMembership(state.followedUsers, userId) };
}

export function toggleFollowSymbol(state: State, ticker: string): State {
  return {
    ...state,
    followedSymbols: toggleMembership(state.followedSymbols, ticker.toUpperCase()),
  };
}

export function toggleMuteUser(state: State, userId: string): State {
  return { ...state, mutedUsers: toggleMembership(state.mutedUsers, userId) };
}

/** Blocking also drops the follow edge, as it does in the real product. */
export function toggleBlockUser(state: State, userId: string): State {
  const blocked = toggleMembership(state.blockedUsers, userId);
  return {
    ...state,
    blockedUsers: blocked,
    followedUsers: blocked.includes(userId)
      ? state.followedUsers.filter((id) => id !== userId)
      : state.followedUsers,
  };
}
