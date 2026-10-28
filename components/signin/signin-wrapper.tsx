"use client";
import React, { useState } from "react";
import AuthShell from "../auth/auth-shell";
import styles from "../auth/auth.module.css";
import SignInForm from "./signin-form";
import OAuthProviders from "./oauth-providers";
import { ClientSafeProvider, LiteralUnion } from "next-auth/react";
import { BuiltInProviderType } from "next-auth/providers/index";

type Props = {
  providers: Record<
    LiteralUnion<BuiltInProviderType>,
    ClientSafeProvider
  > | null;
};
export default function SignInWrapper({ providers }: Props) {
  const hasOAuthProviders = Object.values(providers ?? {}).some(
    (provider) => provider.id !== "credentials"
  );
  const [showSignInUsingCredentials, setShowSignInUsingCredentials] =
    useState(!hasOAuthProviders);

  return (
    <AuthShell mode="signin">
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
          <SignInForm />
          {hasOAuthProviders && <button
            onClick={() => setShowSignInUsingCredentials(false)}
            className={styles.backOption}
          >
            ← Other login options
          </button>}
        </>
      )}
    </AuthShell>
  );
}
