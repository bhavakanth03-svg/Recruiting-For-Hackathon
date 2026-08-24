import { getGoogleAccessToken } from './google-auth';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
}

/**
 * List files from Google Drive with optional query
 */
export const listDriveFiles = async (
  query = '',
  pageSize = 20
): Promise<DriveFileItem[]> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Google Drive is not connected. Please sign in with Google.');
  }

  const params = new URLSearchParams({
    pageSize: pageSize.toString(),
    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink, iconLink, parents)',
    orderBy: 'modifiedTime desc'
  });

  if (query) {
    params.set('q', query);
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `Failed to list Drive files: ${response.statusText}`;
    throw new Error(message);
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Search or find an existing folder in Google Drive by name
 */
export const findOrCreateFolder = async (folderName: string): Promise<string> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not connected.');

  // Check if folder exists
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
  const existing = await listDriveFiles(q, 1);
  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create folder
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create Drive folder');
  }

  const created = await response.json();
  return created.id;
};

/**
 * Upload a text, JSON, HTML, or Blob file to Google Drive using multipart upload
 */
export const uploadFileToDrive = async ({
  name,
  mimeType,
  content,
  folderId,
  description
}: {
  name: string;
  mimeType: string;
  content: string | Blob;
  folderId?: string;
  description?: string;
}): Promise<DriveFileItem> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Google Drive is not connected. Please sign in with Google.');
  }

  const metadata: any = {
    name,
    mimeType
  };

  if (description) {
    metadata.description = description;
  }

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  let bodyContent: string;
  if (typeof content === 'string') {
    bodyContent = content;
  } else {
    bodyContent = await content.text();
  }

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    bodyContent +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to upload file to Google Drive: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Delete a file in Google Drive
 */
export const deleteDriveFile = async (fileId: string): Promise<boolean> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not connected.');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to delete file from Google Drive');
  }

  return true;
};
