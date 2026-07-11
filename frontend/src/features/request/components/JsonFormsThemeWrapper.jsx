import { useMemo } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useDarkMode } from "@context/DarkModeContext";

/**
 * Wraps JSONForms in a MUI theme that follows the app-level dark/light mode
 * so the inputs adopt the same background/text/border colors as the rest of
 * the UI. Without this, JSONForms renders with MUI's default (light) palette.
 */
function JsonFormsThemeWrapper({ children }) {
    const { isDarkMode } = useDarkMode();

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: isDarkMode ? "dark" : "light",
                    primary: { main: "#4f46e5" },
                    background: isDarkMode
                        ? { default: "#18212f", paper: "#1f2937" }
                        : { default: "#ffffff", paper: "#ffffff" },
                    text: isDarkMode
                        ? { primary: "#e5e7eb", secondary: "#9ca3af" }
                        : { primary: "#374151", secondary: "#6b7280" },
                },
                typography: {
                    fontSize: 14,
                },
                components: {
                    MuiOutlinedInput: {
                        styleOverrides: {
                            root: {
                                backgroundColor: "var(--color-grey-0)",
                                color: "var(--color-grey-800)",
                            },
                        },
                    },
                    MuiInputLabel: {
                        styleOverrides: {
                            root: {
                                color: "var(--color-grey-600)",
                            },
                        },
                    },
                    MuiFormHelperText: {
                        styleOverrides: {
                            root: {
                                color: "var(--color-grey-500)",
                            },
                        },
                    },
                },
            }),
        [isDarkMode],
    );

    return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

export default JsonFormsThemeWrapper;
