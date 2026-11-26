import { useState, useEffect, lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import StoreList from "./components/StoreList";
import AuthDialog from "./components/AuthDialog";
import PasswordDialog from "./components/PasswordDialog";
import { login, signup, logout, getMe, clearSession } from "./api";
import { Snackbar, Alert, CircularProgress } from "@mui/material";
const OwnerDashboard = lazy(() => import('./components/OwnerDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

export default function App() {
  const [openPassword, setOpenPassword] = useState(false);
  const [openLogin, setOpenLogin] = useState(false);
  const [loginRole, setLoginRole] = useState('user');
  const [openSignup, setOpenSignup] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    const expire = () => { setIsLoggedIn(false); setUser(null); setSnack({ open: true, message: 'Session ended. Please sign in again.', severity: 'info' }); };
    window.addEventListener('session-expired', expire);
    const tokenAtStart = localStorage.getItem('token');
    if (tokenAtStart) getMe().then(({ user }) => { if (active && localStorage.getItem('token') === tokenAtStart) { setUser(user); setIsLoggedIn(true); } }).catch(() => { if (active && localStorage.getItem('token') === tokenAtStart) clearSession(); });
    return () => { active = false; window.removeEventListener('session-expired', expire); };
  }, []);
  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      const token = localStorage.getItem('token');
      const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const timeout = setTimeout(clearSession, Math.max(0, exp * 1000 - Date.now()));
      return () => clearTimeout(timeout);
    } catch { clearSession(); }
  }, [isLoggedIn]);

  const onLogin = (role = 'user') => { setLoginRole(role); setOpenLogin(true); };
  const onSignup = () => setOpenSignup(true);

  const handleLogin = async ({ email, password }) => {
    const { user } = await login({ email, password });
    setOpenLogin(false);
    setIsLoggedIn(true);
    setUser(user || null);
    setSnack({ open: true, message: `Logged in as ${user?.name || "user"}`, severity: "success" });
  };

  const handleSignup = async ({ name, email, password, address }) => {
    await signup({ name, email, password, address });
    setOpenSignup(false);
    setSnack({ open: true, message: "Account created. Please sign in.", severity: "info" });
    setOpenLogin(true);
    setLoginRole('user');
  };

  const handleLogout = async () => {
    try { await logout(); } catch { /* Client session has been cleared. */ }
    setIsLoggedIn(false);
    setUser(null);
    setSnack({ open: true, message: "Logged out", severity: "info" });
  };

  const isOwner = user?.role === "owner" || user?.role === "store_owner";
  const isAdmin = user?.role === "admin";

  return (
    <>
      <PasswordDialog open={openPassword} onClose={() => setOpenPassword(false)} />
      <Navbar onChangePassword={() => setOpenPassword(true)} isLoggedIn={isLoggedIn} onLogin={onLogin} onSignup={onSignup} onLogout={handleLogout} />
      <Suspense fallback={<CircularProgress aria-label="Loading dashboard" sx={{ m: 3 }} />}>
      {isLoggedIn
        ? (isAdmin
            ? <AdminDashboard onLogout={handleLogout} />
            : (isOwner ? <OwnerDashboard user={user} /> : <StoreList key={user?.id || "guest"} canRate={isLoggedIn && user?.role === "user"} />))
        : <StoreList key={user?.id || "guest"} canRate={isLoggedIn && user?.role === "user"} />
      }
      </Suspense>

      <AuthDialog
        key={`login-${loginRole}`}
        open={openLogin}
        onClose={() => setOpenLogin(false)}
        mode="login"
        loginRole={loginRole}
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
