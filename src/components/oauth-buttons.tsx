import { useIntl } from "react-intl";
import { OAuthProviders, startOAuthLogin } from "../const";
import useTheme from "../hooks/theme";

/**
 * Standard full-color Google "G". Per Google's branding guidelines this logo
 * must not be recolored or replaced with a monochrome version.
 * https://developers.google.com/identity/branding-guidelines
 */
function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden style={{ display: "block" }}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * Custom "Sign in with Google" button, per Google's branding guidelines for
 * custom buttons. The call-to-action text is localizable (guidelines permit and
 * encourage it); the standard-color "G", theme colors, boundary and font follow
 * the spec. Light theme: #FFFFFF fill / #747775 stroke / #1F1F1F text. Dark
 * theme: #131314 fill / #8E918F stroke / #E3E3E3 text.
 */
function GoogleButton() {
  const { formatMessage } = useIntl();
  const { theme } = useTheme();
  const dark = theme !== "light";
  const label = formatMessage({ defaultMessage: "Sign in with Google" });

  return (
    <button
      onClick={() => startOAuthLogin("google")}
      aria-label={label}
      className="h-12 w-full inline-flex items-center justify-center gap-3 rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyber-primary"
      style={{
        border: `1px solid ${dark ? "#8E918F" : "#747775"}`,
        backgroundColor: dark ? "#131314" : "#FFFFFF",
        color: dark ? "#E3E3E3" : "#1F1F1F",
        fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: 0.2,
        padding: "0 16px",
      }}
    >
      {/* Standard-color G sits on a white chip so it always meets contrast rules. */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 4,
          backgroundColor: "#FFFFFF",
          flexShrink: 0,
        }}
      >
        <GoogleG />
      </span>
      {label}
    </button>
  );
}

/** Size-matched fallback for other enabled providers (e.g. github, apple). */
function GenericProviderButton({ provider }: { provider: string }) {
  const { formatMessage } = useIntl();
  const label = provider.charAt(0).toUpperCase() + provider.slice(1);
  return (
    <button
      onClick={() => startOAuthLogin(provider)}
      className="h-12 w-full px-5 inline-flex items-center justify-center gap-2 rounded border border-[#8E918F] bg-[#131314] text-[#E3E3E3] hover:bg-[#1c1c1d] transition-colors"
      style={{ fontFamily: '"Google Sans", Roboto, Arial, sans-serif', fontSize: 14, fontWeight: 500 }}
    >
      {formatMessage(
        { defaultMessage: "Continue with {provider}" },
        { provider: label },
      )}
    </button>
  );
}

/**
 * Renders a sign-in button for each server-enabled OAuth provider. Google uses
 * a branding-compliant custom button; others use a size-matched fallback so no
 * provider is more prominent than another.
 */
export default function OAuthButtons() {
  if (OAuthProviders.length === 0) return null;
  return (
    <div className="flex flex-col items-stretch gap-2">
      {OAuthProviders.map((p) =>
        p === "google" ? (
          <GoogleButton key={p} />
        ) : (
          <GenericProviderButton key={p} provider={p} />
        ),
      )}
    </div>
  );
}
