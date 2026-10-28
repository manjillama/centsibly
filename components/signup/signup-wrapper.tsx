"use client";
import React, { useState } from "react";
import AuthShell from "../auth/auth-shell";
import styles from "../auth/auth.module.css";
import OAuthProviders from "../signin/oauth-providers";
import { ClientSafeProvider, LiteralUnion } from "next-auth/react";
import { BuiltInProviderType } from "next-auth/providers/index";
import SignUpForm from "./signup-form";

type Props = {
  providers: Record<
    LiteralUnion<BuiltInProviderType>,
    ClientSafeProvider
  > | null;
};
export default function SignUpWrapper({ providers }: Props) {
  const hasOAuthProviders = Object.values(providers ?? {}).some(
    (provider) => provider.id !== "credentials"
  );
  const [showSignInUsingCredentials, setShowSignInUsingCredentials] =
    useState(!hasOAuthProviders);

  return (
    <AuthShell mode="signup">
      {!showSignInUsingCredentials ? (
        <>
          <OAuthProviders providers={providers} />
          <div className={styles.divider}>or use your email</div>
          <button
            onClick={() => setShowSignInUsingCredentials(true)}
            className={styles.option}
          >
            Continue with email
          </button>
        </>
      ) : (
        <>
          <SignUpForm />
          {hasOAuthProviders && <button
            onClick={() => setShowSignInUsingCredentials(false)}
            className={styles.backOption}
          >
            ← Other signup options
          </button>}
        </>
      )}
    </AuthShell>
  );
}
