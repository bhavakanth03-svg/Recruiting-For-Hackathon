import { getGoogleAccessToken } from './google-auth';

export interface GoogleContact {
  resourceName: string;
  etag?: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  phoneNumber?: string;
  photoUrl?: string;
  jobTitle?: string;
  organization?: string;
}

/**
 * List contacts from Google People API
 */
export const listGoogleContacts = async (
  pageSize = 50
): Promise<GoogleContact[]> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Google Contacts is not connected. Please sign in with Google.');
  }

  const params = new URLSearchParams({
    pageSize: pageSize.toString(),
    personFields: 'names,emailAddresses,phoneNumbers,photos,organizations,biographies',
    sortOrder: 'FIRST_NAME_ASCENDING'
  });

  const response = await fetch(
    `https://people.googleapis.com/v1/people/me/connections?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch Google Contacts: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.connections || !Array.isArray(data.connections)) {
    return [];
  }

  return data.connections.map((person: any) => {
    const primaryName = person.names?.[0];
    const primaryEmail = person.emailAddresses?.[0];
    const primaryPhone = person.phoneNumbers?.[0];
    const primaryPhoto = person.photos?.[0];
    const primaryOrg = person.organizations?.[0];

    return {
      resourceName: person.resourceName,
      etag: person.etag,
      displayName: primaryName?.displayName || 'Unnamed Contact',
      givenName: primaryName?.givenName || '',
      familyName: primaryName?.familyName || '',
      email: primaryEmail?.value || '',
      phoneNumber: primaryPhone?.value || '',
      photoUrl: primaryPhoto?.url || '',
      jobTitle: primaryOrg?.title || '',
      organization: primaryOrg?.name || ''
    };
  });
};

/**
 * Create a new Google Contact using People API
 */
export const createGoogleContact = async ({
  givenName,
  familyName = '',
  email,
  phoneNumber = '',
  jobTitle = 'Student Scholar',
  organization = 'Tamil Nadu Higher Secondary CS'
}: {
  givenName: string;
  familyName?: string;
  email: string;
  phoneNumber?: string;
  jobTitle?: string;
  organization?: string;
}): Promise<GoogleContact> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Google Contacts is not connected. Please sign in with Google.');
  }

  const payload: any = {
    names: [
      {
        givenName,
        familyName
      }
    ]
  };

  if (email) {
    payload.emailAddresses = [{ value: email, type: 'work' }];
  }

  if (phoneNumber) {
    payload.phoneNumbers = [{ value: phoneNumber, type: 'mobile' }];
  }

  if (organization || jobTitle) {
    payload.organizations = [
      {
        name: organization,
        title: jobTitle
      }
    ];
  }

  const response = await fetch('https://people.googleapis.com/v1/people:createContact', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create Google Contact: ${response.statusText}`);
  }

  const created = await response.json();
  const primaryName = created.names?.[0];
  const primaryEmail = created.emailAddresses?.[0];
  const primaryPhone = created.phoneNumbers?.[0];

  return {
    resourceName: created.resourceName,
    etag: created.etag,
    displayName: primaryName?.displayName || `${givenName} ${familyName}`.trim(),
    givenName: primaryName?.givenName || givenName,
    familyName: primaryName?.familyName || familyName,
    email: primaryEmail?.value || email,
    phoneNumber: primaryPhone?.value || phoneNumber,
    jobTitle,
    organization
  };
};

/**
 * Delete a Google Contact
 */
export const deleteGoogleContact = async (resourceName: string): Promise<boolean> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('Google Contacts is not connected.');

  const response = await fetch(`https://people.googleapis.com/v1/${resourceName}:deleteContact`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to delete contact from Google Contacts');
  }

  return true;
};
