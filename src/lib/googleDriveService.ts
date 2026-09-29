import { getDriveAccessToken } from './googleDriveAuth';

export interface DriveUploadedFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
}

/**
 * Upload a media file (video, photo, or gif) to the user's Google Drive.
 * Uses the Drive v3 multipart upload endpoint.
 * Sets permission anyone with link can view so it can be previewed/streamed as promo media.
 */
export async function uploadMediaToGoogleDrive(
  file: File,
  folderName: string = 'Toko_Promo_Media'
): Promise<{
  fileId: string;
  name: string;
  mimeType: string;
  driveViewUrl: string;
  driveDirectUrl: string;
  driveEmbedUrl: string;
}> {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error('Belum terhubung ke Google Drive. Silakan hubungkan akun Google Anda terlebih dahulu.');
  }

  // 1. Check or create dedicated folder in Google Drive
  let folderId: string | null = null;
  try {
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
        folderName
      )}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      if (listData.files && listData.files.length > 0) {
        folderId = listData.files[0].id;
      }
    }
  } catch (err) {
    console.warn('Folder lookup warning:', err);
  }

  if (!folderId) {
    try {
      const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
      if (createFolderRes.ok) {
        const folderData = await createFolderRes.json();
        folderId = folderData.id;
      }
    } catch (err) {
      console.warn('Folder creation warning:', err);
    }
  }

  // 2. Prepare Multipart Upload Body
  const metadata: any = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}`;
  const mediaHeader = `${delimiter}Content-Type: ${file.type || 'application/octet-stream'}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;

  // Read file as Base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const b64 = res.split(',')[1] || '';
      resolve(b64);
    };
    reader.onerror = () => reject(new Error('Gagal membaca data file untuk Google Drive'));
    reader.readAsDataURL(file);
  });

  const multipartRequestBody =
    metadataPart + mediaHeader + base64Data + closeDelimiter;

  // 3. Upload file via multipart request
  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error('Google Drive Upload Failed:', errText);
    throw new Error(`Upload ke Google Drive gagal: ${uploadRes.statusText || 'Terjadi kesalahan'}`);
  }

  const uploadedData: DriveUploadedFile = await uploadRes.json();

  // 4. Set file permission to anyone with link (read-only) so it can display in web app
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadedData.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (permErr) {
    console.warn('Set permission warning:', permErr);
  }

  const fileId = uploadedData.id;
  const driveViewUrl = uploadedData.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  const driveDirectUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const driveEmbedUrl = `https://drive.google.com/file/d/${fileId}/preview`;

  return {
    fileId,
    name: uploadedData.name,
    mimeType: uploadedData.mimeType,
    driveViewUrl,
    driveDirectUrl,
    driveEmbedUrl,
  };
}

/**
 * List files uploaded in the Google Drive promo folder
 */
export async function listGoogleDrivePromoMedia(folderName: string = 'Toko_Promo_Media'): Promise<DriveUploadedFile[]> {
  const token = await getDriveAccessToken();
  if (!token) return [];

  try {
    // 1. Find folder ID
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
        folderName
      )}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!listRes.ok) return [];
    const listData = await listRes.json();
    const folderId = listData.files?.[0]?.id;
    if (!folderId) return [];

    // 2. List files in folder
    const filesRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,createdTime)&orderBy=createdTime desc&pageSize=20`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!filesRes.ok) return [];
    const filesData = await filesRes.json();
    return filesData.files || [];
  } catch (err) {
    console.error('Error listing Google Drive promo media:', err);
    return [];
  }
}
