import {
  auth,
  signInWithGoogle,
  signOutGoogle,
  initGoogleAuth,
  getGoogleAccessToken
} from './google-auth';
import { User } from 'firebase/auth';

export { auth };
export const initGmailAuth = initGoogleAuth;
export const signInWithGmail = signInWithGoogle;
export const signOutGmail = signOutGoogle;
export const getGmailAccessToken = getGoogleAccessToken;

export interface GmailUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  isSentByMe?: boolean;
}

/**
 * Fetch Gmail user profile
 */
export const fetchGmailProfile = async (token?: string): Promise<GmailProfile> => {
  const accessToken = token || getGoogleAccessToken();
  if (!accessToken) {
    throw new Error('Gmail is not connected. Please sign in with Google.');
  }

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch Gmail profile: ${res.statusText}`);
  }

  return await res.json();
};

/**
 * Encode unicode string to URL-safe Base64 for Gmail API
 */
const encodeBase64Url = (str: string): string => {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Send an email directly through the user's connected Gmail account
 */
export const sendEmailViaGmail = async ({
  to,
  subject,
  bodyHtml,
  bodyText,
  fromName = 'The Crucible TN CS Assessment'
}: {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  fromName?: string;
}): Promise<{ id: string; threadId: string; labelIds?: string[] }> => {
  const accessToken = getGoogleAccessToken();
  if (!accessToken) {
    throw new Error('Gmail is not connected. Please sign in with Google first.');
  }

  const currentUser = auth.currentUser;
  const fromEmail = currentUser?.email || 'me';

  // Construct standard MIME multipart or HTML email
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    `From: "${fromName}" <${fromEmail}>`,
    `To: <${to}>`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    bodyHtml
  ];

  const rawMessage = messageParts.join('\r\n');
  const base64EncodedMessage = encodeBase64Url(rawMessage);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: base64EncodedMessage
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gmail API Send failed: ${res.statusText}`);
  }

  return await res.json();
};

/**
 * List recent Gmail messages
 */
export const listRecentGmailMessages = async (
  query = '',
  maxResults = 10
): Promise<GmailMessageSummary[]> => {
  const accessToken = getGoogleAccessToken();
  if (!accessToken) {
    throw new Error('Gmail is not connected.');
  }

  const params = new URLSearchParams({
    maxResults: maxResults.toString()
  });
  if (query) {
    params.set('q', query);
  }

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to list Gmail messages');
  }

  const listData = await res.json();
  if (!listData.messages || !Array.isArray(listData.messages)) {
    return [];
  }

  // Fetch summary for top items
  const details = await Promise.all(
    listData.messages.slice(0, 10).map(async (msg: { id: string; threadId: string }) => {
      try {
        const itemRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );
        if (!itemRes.ok) return { id: msg.id, threadId: msg.threadId, snippet: '' };
        const data = await itemRes.json();

        const headers = data.payload?.headers || [];
        const subject = headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value || '(No Subject)';
        const from = headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value || '';
        const to = headers.find((h: any) => h.name?.toLowerCase() === 'to')?.value || '';
        const date = headers.find((h: any) => h.name?.toLowerCase() === 'date')?.value || '';

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: data.snippet || '',
          subject,
          from,
          to,
          date
        };
      } catch {
        return { id: msg.id, threadId: msg.threadId, snippet: '' };
      }
    })
  );

  return details;
};
