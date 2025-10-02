import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import StoreList from "./components/StoreList";
import AuthDialog from "./components/AuthDialog";
import OwnerDashboard from "./components/OwnerDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { login, signup, logout } from "./api";
import { Snackbar, Alert } from "@mui/material";

export default function App() {
  const [openLogin, setOpenLogin] = useState(false);
  const [openSignup, setOpenSignup] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
    try { setUser(JSON.parse(localStorage.getItem("user") || "null")); } catch {}
  }, []);

  const onLogin = () => setOpenLogin(true);
  const onSignup = () => setOpenSignup(true);

  const handleLogin = async ({ email, password, role }) => {
    const { user } = await login({ email, password, role });
    setOpenLogin(false);
    setIsLoggedIn(true);
    setUser(user || null);
    setSnack({ open: true, message: `Logged in as ${user?.name || "user"}`, severity: "success" });
  };

  const handleSignup = async ({ name, email, password, role }) => {
    await signup({ name, email, password, role });
    setOpenSignup(false);
    setSnack({ open: true, message: "Account created. Please sign in.", severity: "info" });
    setOpenLogin(true);
  };

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setUser(null);
    setSnack({ open: true, message: "Logged out", severity: "info" });
  };

  const isOwner = user?.role === "owner" || user?.role === "store_owner";
  const isAdmin = user?.role === "admin";

  return (
    <>
      <Navbar isLoggedIn={isLoggedIn} onLogin={onLogin} onSignup={onSignup} onLogout={handleLogout} />
      {isLoggedIn
        ? (isAdmin
            ? <AdminDashboard onLogout={handleLogout} />
            : (isOwner ? <OwnerDashboard user={user} /> : <StoreList />))
        : <StoreList />
      }

      <AuthDialog
        open={openLogin}
        onClose={() => setOpenLogin(false)}
        mode="login"
        onSubmit={handleLogin}
      />
      <AuthDialog
        open={openSignup}
        onClose={() => setOpenSignup(false)}
        mode="signup"
        onSubmit={handleSignup}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSnack(s => ({ ...s, open: false }))} severity={snack.severity} sx={{ width: "100%" }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
