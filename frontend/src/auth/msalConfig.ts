/**
 * MSAL (Microsoft Authentication Library) Configuration
 * Used for Azure AD SSO integration with Microsoft Entra ID.
 */
import { LogLevel, type Configuration } from '@azure/msal-browser';

// Azure AD App Registration
const CLIENT_ID = '51187ec7-4430-485a-bb6a-d3f70f83ff77';
const TENANT_ID = '9a3bb301-12fd-4106-a7f7-563f72cfdf69';
const AUTHORITY = `https://login.microsoftonline.com/${TENANT_ID}`;

// Redirect URI — defaults to current origin (works for both dev and prod)
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || window.location.origin;

export const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: AUTHORITY,
    redirectUri: REDIRECT_URI,
    postLogoutRedirectUri: REDIRECT_URI,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error('[MSAL]', message);
            break;
          case LogLevel.Warning:
            console.warn('[MSAL]', message);
            break;
          case LogLevel.Info:
            // console.info('[MSAL]', message);
            break;
          case LogLevel.Verbose:
            // console.debug('[MSAL]', message);
            break;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

// Scopes required for login and group membership
export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

// Graph API endpoint for fetching group memberships (fallback if groups not in token)
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphMemberOfEndpoint: 'https://graph.microsoft.com/v1.0/me/memberOf',
};
