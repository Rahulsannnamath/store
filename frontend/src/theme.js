import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#6366f1" },
    secondary: { main: "#06b6d4" },
    background: { default: "#f7f7fb" }
  },
  shape: { borderRadius: 12 }
});

export default theme;