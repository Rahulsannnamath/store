import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

export default function Navbar({ isLoggedIn, onLogin, onSignup, onLogout, onChangePassword }) {
  return (
    <AppBar position="sticky" color="inherit" elevation={1}>
      <Toolbar sx={{ gap: 2, flexWrap: "wrap", py: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Store Ratings
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          {isLoggedIn ? (
            <><Button onClick={onChangePassword}>Change password</Button><Button variant="contained" color="error" onClick={onLogout}>Log out</Button></>
          ) : (
            <>
              <Button variant="text" onClick={() => onLogin('user')}>Log in</Button>
              <Button variant="outlined" onClick={() => onLogin('owner')}>Login as Store Owner</Button>
              <Button variant="outlined" onClick={() => onLogin('admin')}>Login as Admin</Button>
              <Button variant="contained" onClick={onSignup}>Sign up</Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
