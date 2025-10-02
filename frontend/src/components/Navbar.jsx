import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

export default function Navbar({ isLoggedIn, onLogin, onSignup, onLogout }) {
  return (
    <AppBar position="sticky" color="inherit" elevation={1}>
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Store Ratings
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          {isLoggedIn ? (
            <Button variant="contained" color="error" onClick={onLogout}>Log out</Button>
          ) : (
            <>
              <Button variant="text" onClick={onLogin}>Log in</Button>
              <Button variant="contained" onClick={onSignup}>Sign up</Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}