"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getSocialAuthorizationCode } from "@/lib/socialAuth";
import type { SocialProvider } from "@/lib/types";
import { Spinner } from "./Spinner";
import styles from "./SocialLoginButtons.module.css";


type Props = {
    onSuccess: () => Promise<void>;
};

const PROVIDERS: {id: SocialProvider; label: string; icon: string}[] = [
    {id: "google", label: "Google", icon: "/auth/google.svg"},
    {id: "facebook", label: "Facebook", icon: "/auth/facebook.svg"},
    {id: "linkedin", label: "LinkedIn", icon: "/auth/linkedin.svg"},
];

export function SocialLoginButtons({ onSuccess }: Props){
    const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);
    const [error, setError] = useState("");

    async function handleSocialLogin(provider: SocialProvider) {
        setError("");
        setLoadingProvider(provider);

        try{
            const { code, redirectUri } = await getSocialAuthorizationCode(provider);
            await api.socialLogin(provider, code, redirectUri);
            await onSuccess();
        } catch (err){
            setError(err instanceof Error ? err.message : "Social login failed");
        } finally{
            setLoadingProvider(null);
        }
    }

    return (
        <div className={styles.root}>
            <div className={styles.divider}>
                <span>or</span>
            </div>

            <div className={styles.buttons}>
                {PROVIDERS.map((provider) => (
                    <button
                    key={provider.id}
                    type="button"
                    className={styles.button}
                    disabled={loadingProvider  !== null}
                    onClick={() => handleSocialLogin(provider.id)}
                    aria-label={`Continue with ${provider.label}`}
                    title={`Continue with ${provider.label}`}>
                        {loadingProvider === provider.id ? (
                            <Spinner size="sm"/>
                        ) : (
                            <img
                                src={provider.icon}
                                alt=""
                                aria-hidden="true"
                                className={styles.icon}
                            />
                        )}
                    </button>
                ))}
            </div>
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
