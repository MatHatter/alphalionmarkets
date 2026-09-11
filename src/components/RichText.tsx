import { tokenize } from '../lib/parse';

interface Props {
  body: string;
  onNavigate: (target: { kind: 'symbol'; ticker: string } | { kind: 'hashtag'; tag: string }) => void;
}

/** Renders a message body with cashtags, mentions, hashtags and links. */
export function RichText({ body, onNavigate }: Props) {
  return (
    <p className="body">
      {tokenize(body).map((token, i) => {
        switch (token.kind) {
          case 'cashtag':
            return (
              <button
                key={i}
                type="button"
                className="entity cashtag"
                onClick={() => onNavigate({ kind: 'symbol', ticker: token.ticker })}
              >
                {token.value}
              </button>
            );
          case 'hashtag':
            return (
              <button
                key={i}
                type="button"
                className="entity hashtag"
                onClick={() => onNavigate({ kind: 'hashtag', tag: token.tag })}
              >
                {token.value}
              </button>
            );
          case 'mention':
            return (
              <span key={i} className="entity mention">
                {token.value}
              </span>
            );
          case 'url':
            return (
              <a
                key={i}
                className="entity link"
                href={token.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                {token.href.replace(/^https?:\/\//, '')}
              </a>
            );
          default:
            return <span key={i}>{token.value}</span>;
        }
      })}
    </p>
  );
}
