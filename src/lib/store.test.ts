import { beforeEach, describe, expect, it } from 'vitest';
import {
  PostError,
  deleteMessage,
  postMessage,
  toggleBlockUser,
  toggleBookmark,
  toggleFollowSymbol,
  toggleFollowUser,
  toggleLike,
  voteInPoll,
} from './store';
import { MAX_MESSAGE_LENGTH, type State } from './types';

function emptyState(): State {
  return {
    users: {
      u_viewer: { id: 'u_viewer', handle: 'you', displayName: 'You', bio: '', avatarColor: '#000', verified: false, rank: 'Cub', joinedAt: 0 },
      u_other: { id: 'u_other', handle: 'other', displayName: 'Other', bio: '', avatarColor: '#111', verified: false, rank: 'Cub', joinedAt: 0 },
    },
    messages: {},
    symbols: {},
    viewerId: 'u_viewer',
    followedUsers: [],
    followedSymbols: [],
    mutedUsers: [],
    blockedUsers: [],
  };
}

let state: State;
beforeEach(() => {
  state = emptyState();
});

function only(s: State) {
  const values = Object.values(s.messages);
  expect(values).toHaveLength(1);
  return values[0];
}

describe('postMessage', () => {
  it('parses entities at post time', () => {
    const message = only(postMessage(state, { body: 'long $lion #hot cc @other' }));
    expect(message.symbols).toEqual(['LION']);
    expect(message.hashtags).toEqual(['hot']);
    expect(message.mentions).toEqual(['other']);
  });

  it('stores an optional sentiment', () => {
    expect(only(postMessage(state, { body: 'up', sentiment: 'bullish' })).sentiment).toBe('bullish');
    expect(only(postMessage(state, { body: 'flat' })).sentiment).toBeUndefined();
  });

  it('rejects an empty message', () => {
    expect(() => postMessage(state, { body: '   ' })).toThrow(PostError);
  });

  it('allows an empty body when there is an image', () => {
    expect(only(postMessage(state, { body: '', images: ['chart'] })).images).toEqual(['chart']);
  });

  it('rejects a body over the character limit', () => {
    expect(() => postMessage(state, { body: 'x'.repeat(MAX_MESSAGE_LENGTH + 1) })).toThrow(PostError);
  });

  it('accepts a body exactly at the limit', () => {
    expect(() => postMessage(state, { body: 'x'.repeat(MAX_MESSAGE_LENGTH) })).not.toThrow();
  });

  it('rejects a reply to a message that does not exist', () => {
    expect(() => postMessage(state, { body: 'hi', parentId: 'nope' })).toThrow(PostError);
  });

  it('flattens a reply to a reply onto the root message', () => {
    let s = postMessage(state, { body: 'root' });
    const rootId = Object.keys(s.messages)[0];
    s = postMessage(s, { body: 'first', parentId: rootId });
    const firstId = Object.values(s.messages).find((m) => m.parentId === rootId)!.id;
    s = postMessage(s, { body: 'second', parentId: firstId });
    const second = Object.values(s.messages).find((m) => m.body === 'second')!;
    expect(second.parentId).toBe(rootId);
  });

  it('allows a bare reshare with no body', () => {
    let s = postMessage(state, { body: 'original' });
    const id = Object.keys(s.messages)[0];
    s = postMessage(s, { body: '', resharedId: id });
    expect(Object.values(s.messages).some((m) => m.resharedId === id)).toBe(true);
  });

  it('rejects a poll with fewer than two usable options', () => {
    expect(() =>
      postMessage(state, { body: 'pick', poll: { options: ['only', '  '], durationMs: 1000 } }),
    ).toThrow(PostError);
  });

  it('rejects a poll with more than four options', () => {
    expect(() =>
      postMessage(state, { body: 'pick', poll: { options: ['a', 'b', 'c', 'd', 'e'], durationMs: 1000 } }),
    ).toThrow(PostError);
  });

  it('does not mutate the input state', () => {
    postMessage(state, { body: 'hello' });
    expect(Object.keys(state.messages)).toHaveLength(0);
  });
});

describe('likes and bookmarks', () => {
  it('toggles on and back off', () => {
    let s = postMessage(state, { body: 'x' });
    const id = Object.keys(s.messages)[0];
    s = toggleLike(s, id);
    expect(s.messages[id].likedBy).toEqual(['u_viewer']);
    s = toggleLike(s, id);
    expect(s.messages[id].likedBy).toEqual([]);
    s = toggleBookmark(s, id);
    expect(s.messages[id].bookmarkedBy).toEqual(['u_viewer']);
  });

  it('ignores an unknown message id', () => {
    expect(toggleLike(state, 'missing')).toBe(state);
  });
});

describe('deleteMessage', () => {
  it('tombstones the viewer’s own message', () => {
    let s = postMessage(state, { body: 'oops' });
    const id = Object.keys(s.messages)[0];
    s = deleteMessage(s, id);
    expect(s.messages[id].deleted).toBe(true);
    expect(s.messages[id].body).toBe('');
  });

  it('refuses to delete another user’s message', () => {
    let s = postMessage(state, { body: 'theirs' });
    const id = Object.keys(s.messages)[0];
    s = { ...s, messages: { ...s.messages, [id]: { ...s.messages[id], authorId: 'u_other' } } };
    expect(deleteMessage(s, id).messages[id].deleted).toBe(false);
  });
});

describe('voteInPoll', () => {
  function withPoll(endsInMs = 60_000) {
    const s = postMessage(state, { body: 'pick', poll: { options: ['a', 'b'], durationMs: endsInMs } });
    const id = Object.keys(s.messages)[0];
    return { s, id, optionId: s.messages[id].poll!.options[0].id };
  }

  it('records one vote', () => {
    const { s, id, optionId } = withPoll();
    const voted = voteInPoll(s, id, optionId);
    expect(voted.messages[id].poll!.options[0].votes).toBe(1);
    expect(voted.messages[id].poll!.votedOptionId).toBe(optionId);
  });

  it('refuses a second vote from the same viewer', () => {
    const { s, id, optionId } = withPoll();
    const once = voteInPoll(s, id, optionId);
    const twice = voteInPoll(once, id, once.messages[id].poll!.options[1].id);
    expect(twice.messages[id].poll!.options[1].votes).toBe(0);
  });

  it('refuses a vote after the poll closes', () => {
    const { s, id, optionId } = withPoll(1000);
    const late = voteInPoll(s, id, optionId, Date.now() + 5000);
    expect(late.messages[id].poll!.options[0].votes).toBe(0);
  });

  it('ignores an option that is not on the poll', () => {
    const { s, id } = withPoll();
    expect(voteInPoll(s, id, 'bogus').messages[id].poll!.options[0].votes).toBe(0);
  });
});

describe('social graph', () => {
  it('toggles following a user', () => {
    const s = toggleFollowUser(state, 'u_other');
    expect(s.followedUsers).toEqual(['u_other']);
    expect(toggleFollowUser(s, 'u_other').followedUsers).toEqual([]);
  });

  it('refuses to follow yourself', () => {
    expect(toggleFollowUser(state, 'u_viewer').followedUsers).toEqual([]);
  });

  it('uppercases followed symbols', () => {
    expect(toggleFollowSymbol(state, 'lion').followedSymbols).toEqual(['LION']);
  });

  it('drops the follow edge when blocking', () => {
    const followed = toggleFollowUser(state, 'u_other');
    const blocked = toggleBlockUser(followed, 'u_other');
    expect(blocked.blockedUsers).toEqual(['u_other']);
    expect(blocked.followedUsers).toEqual([]);
  });
});
