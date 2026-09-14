"use client";

import { useEffect } from "react";
import type { SocialProvider } from "@/lib/types";

const PROVIDERS = new Set(["google", "facebook", "linkedin"]);

export default function SocialCallbackPage() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const provider = params.get("provider");

        if(!provider || !PROVIDERS.has(provider)) {
            window.opener?.postMessage(
                {
                    type: "scanno-social-callback",
                    error: "Unknown social provider",
                },
                window.location.origin
            );
            window.close();
            return;
        }

        window.opener?.postMessage(
            {
                type: "scanno-social-callback",
                provider: provider as SocialProvider,
                code: params.get("code") || undefined,
                state: params.get("state") || undefined,
                error: params.get("error_description") || params.get("error") || undefined,
            },
            window.location.origin
        );
        window.close();
    }, []);

    return null;
}

