import type { SocialProvider } from "./types";

type ProviderConfig = {
    authUrl: string;
    clientId?: string;
    scope: string;
};

const PROVIDERS: Record<SocialProvider, ProviderConfig> = {
    google: {
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: "openid email profile",
    },
    facebook: {
        authUrl: "https://www.facebook.com/v20.0/dialog/oauth",
        clientId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
        scope: "email,public_profile",
    },
    linkedin: {
        authUrl: "https://www.linkedin.com/oauth/v2/authorization",
        clientId: process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID,
        scope: "r_liteprofile r_emailaddress",
    },
};

type CallbackMessage = {
    type: "scanno-social-callback";
    provider: SocialProvider;
    code?: string;
    state?: string;
    error?: string;
};

export type SocialAuthorizationCode = {
    code: string;
    redirectUri: string;
};

function base64UrlEncode(bytes: Uint8Array){
    let binary = "";

    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}


function randomString() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
}

function popupFeatures() {
    const width = 520;
    const height = 680;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

    return `popup=yes,width=${width},height=${height},left=${left},top=${top}`;
}

function waitForCallback(provider: SocialProvider, state: string, popup: Window | null){
    return new Promise<string>((resolve,reject) => {
        const timeout = window.setTimeout(() => {
            cleanup();
            reject(new Error("Social login timed out"));
        }, 120000);

        const poll = window.setInterval(() => {
            if (popup?.closed){
                cleanup();
                reject(new Error("Social login was cancelled"));
            }
        }, 500);

        function cleanup() {
            window.clearTimeout(timeout);
            window.clearInterval(poll);
            window.removeEventListener("message", onMessage);
        }

        function onMessage(event: MessageEvent<CallbackMessage>) {
            if (event.origin !== window.location.origin) return;

            const message = event.data;

            if (popup && event.source !== popup) return;
            if (message?.type !== "scanno-social-callback") return ;
            if (message.provider !== provider) return;
            if (message.state !== state) return;
            cleanup();

            if (message.error) {
                reject(new Error(message.error));
                return;
            }

            if (!message.code){
                reject(new Error("Social login did not return a code"));
                return;
            }

            resolve(message.code);
        }

        window.addEventListener("message", onMessage);
    });
}

export async function getSocialAuthorizationCode(
    provider: SocialProvider
): Promise<SocialAuthorizationCode> {
    const config = PROVIDERS[provider];

    if(!config.clientId){
        throw new Error("Social login is not configured");
    }

    const state = randomString();
    const redirectUri = `${window.location.origin}/auth/social/callback?provider=${provider}`;

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        state,
        scope: config.scope,
    });

    const popup = window.open(
        `${config.authUrl}?${params.toString()}`,
        "scanno-social-login",
        popupFeatures()
    );

    if(!popup) {
        throw Error("Popup was blocked");
    }

    const code = await waitForCallback(provider, state, popup);
    popup.close();

    return { code, redirectUri };
}
