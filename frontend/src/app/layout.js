import "./globals.css";

export const metadata = {
  title: "Sign In - Antbox Hive",
  description: "Antbox Hive HR Operations Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&amp;family=Inter:wght@400;500;600&amp;family=Caveat:wght@700&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <script id="tailwind-config" dangerouslySetInnerHTML={{ __html: `
          tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "error": "#ba1a1a",
                        "secondary-container": "#8455ef",
                        "primary": "#000000",
                        "on-secondary-container": "#fffbff",
                        "primary-container": "#1c1b1b",
                        "tertiary-fixed": "#e4e2de",
                        "on-tertiary-container": "#848481",
                        "inverse-on-surface": "#ebf1ff",
                        "tertiary-fixed-dim": "#c8c6c3",
                        "on-tertiary-fixed-variant": "#474744",
                        "on-primary-container": "#858383",
                        "error-container": "#ffdad6",
                        "tertiary-container": "#1b1c1a",
                        "on-tertiary": "#ffffff",
                        "background": "#f9f9ff",
                        "surface-container-lowest": "#ffffff",
                        "on-error": "#ffffff",
                        "outline": "#747878",
                        "surface-container-highest": "#dce2f3",
                        "surface-container": "#e7eefe",
                        "outline-variant": "#c4c7c7",
                        "surface-dim": "#d3daea",
                        "primary-fixed": "#e5e2e1",
                        "on-secondary-fixed-variant": "#5516be",
                        "on-secondary": "#ffffff",
                        "tertiary": "#000000",
                        "inverse-primary": "#c8c6c5",
                        "on-tertiary-fixed": "#1b1c1a",
                        "inverse-surface": "#2a313d",
                        "secondary": "#6b38d4",
                        "surface": "#f9f9ff",
                        "on-primary-fixed": "#1c1b1b",
                        "on-surface-variant": "#444748",
                        "on-background": "#151c27",
                        "on-secondary-fixed": "#23005c",
                        "secondary-fixed": "#e9ddff",
                        "surface-variant": "#dce2f3",
                        "surface-container-high": "#e2e8f8",
                        "on-primary-fixed-variant": "#474646",
                        "surface-bright": "#f9f9ff",
                        "on-primary": "#ffffff",
                        "surface-container-low": "#f0f3ff",
                        "surface-tint": "#5f5e5e",
                        "primary-fixed-dim": "#c8c6c5",
                        "on-error-container": "#93000a",
                        "secondary-fixed-dim": "#d0bcff",
                        "on-surface": "#151c27"
                    },
                    borderRadius: {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    spacing: {
                        "stack-lg": "4rem",
                        "stack-sm": "1rem",
                        "margin-x": "1.5rem",
                        "container-max": "1280px",
                        "stack-md": "2rem",
                        "gutter": "2rem"
                    },
                    fontFamily: {
                        "body-md": ["Inter"],
                        "headline-lg": ["Hanken Grotesk"],
                        "headline-lg-mobile": ["Hanken Grotesk"],
                        "label-sm": ["Hanken Grotesk"],
                        "headline-xl": ["Hanken Grotesk"]
                    },
                    fontSize: {
                        "body-md": ["16px", { lineHeight: "1.6", letterSpacing: "0", fontWeight: "400" }],
                        "headline-lg": ["40px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
                        "headline-lg-mobile": ["32px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
                        "label-sm": ["12px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
                        "headline-xl": ["64px", { lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "700" }]
                    }
                }
            }
          }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
