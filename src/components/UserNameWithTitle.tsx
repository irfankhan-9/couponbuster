import React from 'react';
import { Link } from 'react-router-dom';
import { useDisplayedTitle, useWinCount } from '../hooks/useUserTitles';
import { InlineTitleBadge } from './InlineTitleBadge';

interface UserNameWithTitleProps {
  userId: string;
  name?: string;
  badgeSize?: 'xs' | 'sm' | 'md';
  nameClassName?: string;
  /** When false, the name is rendered as plain text (no link). Default true. */
  showLink?: boolean;
  titleSize?: 'xs' | 'sm' | 'md';
  /** Suppress underline hover so the name reads as part of a denser row. */
  noUnderline?: boolean;
}

/**
 * Single chokepoint for rendering a username with the user's chosen display title
 * beside it. All leaderboards, picks, and author labels should use this component.
 * The badge emoji repeats once per win (e.g. 🏆🏆) and shows a ⏳ marker for
 * current-season temporary titles.
 *
 * By default the entire row is a one-click link to /profile/:userId, so anyone
 * on the site can open any user's profile in a single tap/click.
 */
export const UserNameWithTitle: React.FC<UserNameWithTitleProps> = ({
  userId,
  name,
  badgeSize = 'xs',
  nameClassName = 'font-black text-slate-900 tracking-tight leading-none',
  showLink = true,
  titleSize = 'xs',
  noUnderline = false
}) => {
  const displayedTitle = useDisplayedTitle(userId);
  const winCount = useWinCount(userId, displayedTitle?.source_id);
  const displayText = name ?? userId;

  const content = (
    <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
      <span className={`truncate ${nameClassName}`}>{displayText}</span>
      {displayedTitle && (
        <InlineTitleBadge
          title={displayedTitle}
          size={titleSize}
          count={winCount}
        />
      )}
    </span>
  );

  if (!showLink) {
    return content;
  }

  return (
    <Link
      to={`/profile/${userId}`}
      onClick={(e) => e.stopPropagation()}
      className={`max-w-full inline-flex min-w-0 group ${noUnderline ? '' : 'hover:underline'} decoration-emerald-500/40 underline-offset-2`}
    >
      {content}
    </Link>
  );
};