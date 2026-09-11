import { useState } from 'react';
import type { Message, State } from '../lib/types';
import { countReplies, countReshares, likeCount, selectReplies } from '../lib/streams';
import { absoluteTime, compactNumber, durationUntil, relativeTime } from '../lib/format';
import { RichText } from './RichText';
import { Composer } from './Composer';
import type { DraftInput } from '../lib/store';
import type { NavTarget } from '../lib/nav';

interface Props {
  message: Message;
  state: State;
  onNavigate: (target: NavTarget) => void;
  onLike: (id: string) => void;
  onBookmark: (id: string) => void;
  onDelete: (id: string) => void;
  onReshare: (id: string) => void;
  onVote: (id: string, optionId: string) => void;
  onPost: (draft: DraftInput) => void;
  /** Replies are shown inline on a permalink, collapsed in a stream. */
  showReplies?: boolean;
  isReply?: boolean;
}

export function MessageCard({
  message,
  state,
  onNavigate,
  onLike,
  onBookmark,
  onDelete,
  onReshare,
  onVote,
  onPost,
  showReplies = false,
  isReply = false,
}: Props) {
  const [replying, setReplying] = useState(false);
  const author = state.users[message.authorId];
  const viewerLiked = message.likedBy.includes(state.viewerId);
  const viewerBookmarked = message.bookmarkedBy.includes(state.viewerId);
  const reshared = message.resharedId ? state.messages[message.resharedId] : undefined;
  const replies = showReplies ? selectReplies(state, message.id) : [];
  const replyCount = countReplies(state, message.id);

  if (message.deleted) {
    return <article className="message deleted">This message was deleted.</article>;
  }

  return (
    <article className={`message${isReply ? ' reply' : ''}`}>
      <div className="message-head">
        <span
          className="avatar"
          style={{ background: author?.avatarColor ?? '#666' }}
          aria-hidden="true"
        >
          {author?.displayName.charAt(0) ?? '?'}
        </span>
        <div className="identity">
          <button
            type="button"
            className="name"
            onClick={() => onNavigate({ kind: 'user', userId: message.authorId })}
          >
            {author?.displayName ?? 'Unknown'}
          </button>
          {author?.verified && (
            <span className="verified" title="Verified (they paid)">
              ✓
            </span>
          )}
          <span className="handle">@{author?.handle}</span>
          <span className="rank" title="Rank">
            {author?.rank}
          </span>
          <span className="dot">·</span>
          <time
            className="timestamp"
            dateTime={new Date(message.createdAt).toISOString()}
            title={absoluteTime(message.createdAt)}
          >
            {relativeTime(message.createdAt)}
          </time>
        </div>
        {message.sentiment && (
          <span className={`tag ${message.sentiment} on`}>
            {message.sentiment === 'bullish' ? 'Bullish' : 'Bearish'}
          </span>
        )}
      </div>

      {message.body && <RichText body={message.body} onNavigate={onNavigate} />}

      {message.images.length > 0 && (
        <div className={`media count-${Math.min(message.images.length, 4)}`}>
          {message.images.map((image) => (
            <div key={image} className="media-item" role="img" aria-label={`Attachment: ${image}`}>
              <span>{image}</span>
            </div>
          ))}
        </div>
      )}

      {message.poll && <PollCard message={message} onVote={onVote} />}

      {message.linkPreview && (
        <a
          className="link-preview"
          href={message.linkPreview.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          <span className="link-domain">{message.linkPreview.domain}</span>
          <span className="link-title">{message.linkPreview.title}</span>
          <span className="link-desc">{message.linkPreview.description}</span>
        </a>
      )}

      {reshared && !reshared.deleted && (
        <div className="quoted">
          <span className="quoted-author">
            {state.users[reshared.authorId]?.displayName} @
            {state.users[reshared.authorId]?.handle}
          </span>
          <RichText body={reshared.body} onNavigate={onNavigate} />
        </div>
      )}

      <div className="actions">
        <button type="button" onClick={() => setReplying(!replying)}>
          Reply{replyCount > 0 && ` ${compactNumber(replyCount)}`}
        </button>
        <button type="button" onClick={() => onReshare(message.id)}>
          Reshare{countReshares(state, message.id) > 0 && ` ${countReshares(state, message.id)}`}
        </button>
        <button
          type="button"
          className={viewerLiked ? 'on' : undefined}
          aria-pressed={viewerLiked}
          onClick={() => onLike(message.id)}
        >
          Like {compactNumber(likeCount(message))}
        </button>
        <button
          type="button"
          className={viewerBookmarked ? 'on' : undefined}
          aria-pressed={viewerBookmarked}
          onClick={() => onBookmark(message.id)}
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => onNavigate({ kind: 'message', messageId: message.parentId ?? message.id })}
        >
          Permalink
        </button>
        {message.authorId === state.viewerId && (
          <button type="button" className="danger" onClick={() => onDelete(message.id)}>
            Delete
          </button>
        )}
      </div>

      {replying && (
        <Composer
          compact
          parentId={message.id}
          placeholder={`Reply to @${author?.handle}`}
          onPost={(draft) => {
            onPost(draft);
            setReplying(false);
          }}
          onCancel={() => setReplying(false)}
        />
      )}

      {showReplies && replies.length > 0 && (
        <div className="replies">
          {replies.map((reply) => (
            <MessageCard
              key={reply.id}
              message={reply}
              state={state}
              onNavigate={onNavigate}
              onLike={onLike}
              onBookmark={onBookmark}
              onDelete={onDelete}
              onReshare={onReshare}
              onVote={onVote}
              onPost={onPost}
              isReply
            />
          ))}
        </div>
      )}
    </article>
  );
}

function PollCard({
  message,
  onVote,
}: {
  message: Message;
  onVote: (id: string, optionId: string) => void;
}) {
  const poll = message.poll!;
  const total = poll.options.reduce((sum, o) => sum + o.votes, 0);
  const closed = Date.now() >= poll.endsAt;
  const revealed = closed || Boolean(poll.votedOptionId);

  return (
    <div className="poll">
      {poll.options.map((option) => {
        const share = total ? (option.votes / total) * 100 : 0;
        return (
          <button
            key={option.id}
            type="button"
            className={`poll-option${poll.votedOptionId === option.id ? ' picked' : ''}`}
            disabled={revealed}
            onClick={() => onVote(message.id, option.id)}
          >
            {revealed && <span className="poll-bar" style={{ width: `${share}%` }} />}
            <span className="poll-label">{option.label}</span>
            {revealed && <span className="poll-share">{share.toFixed(0)}%</span>}
          </button>
        );
      })}
      <p className="poll-meta">
        {compactNumber(total)} votes ·{' '}
        {closed ? 'Final' : `${durationUntil(poll.endsAt)} left`}
      </p>
    </div>
  );
}
