import { useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, Alert, IconButton, InputAdornment,
  FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const ROLES = [
  { value: "user", label: "Normal User" },
  { value: "owner", label: "Store Owner" },
  { value: "admin", label: "System Administrator" }
];

export default function AuthDialog({ open, onClose, mode = "login", onSubmit }) {
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [role, setRole] = useState("user");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");

  const valid = useMemo(() => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const pwdOk = /^(?=.*[A-Z])(?=.*[^\w\s]).{8,16}$/.test(pwd);
    const nameOk = isSignup ? name.trim().length >= 3 && name.trim().length <= 60 : true;
    const roleOk = ROLES.some(r => r.value === role);
    return emailOk && pwdOk && nameOk && roleOk;
  }, [email, pwd, name, role, isSignup]);

  const handleSubmit = async () => {
    setError("");
    try {
      await onSubmit?.({ name: name.trim(), email: email.trim(), password: pwd, role });
      setName("");
      setEmail("");
      setPwd("");
      setRole("user");
      onClose?.();
    } catch (e) {
      setError(e?.message || "Something went wrong");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          width: 720,
          maxWidth: "calc(100vw - 32px)"
        }
      }}
      className="auth-dialog"
    >
      <DialogTitle sx={{ fontWeight: 800 }}>
        {isSignup ? "Sign up" : "Log in"}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          {isSignup && (
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              size="small"
              InputLabelProps={{ shrink: true }}
              autoComplete="name"
              inputProps={{ maxLength: 60 }}
              helperText="3-60 characters"
              fullWidth
              autoFocus
            />
          )}
          <br />
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            size="small"
            InputLabelProps={{ shrink: true }}
            autoComplete="email"
            fullWidth
          />
          <br />
          <TextField
            label="Password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            type={showPwd ? "text" : "password"}
            placeholder="8-16 chars, include uppercase & special"
            size="small"
            InputLabelProps={{ shrink: true }}
            autoComplete={isSignup ? "new-password" : "current-password"}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPwd((s) => !s)} edge="end">
                    {showPwd ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText="8-16 characters, at least one uppercase and one special character"
          />
          <FormControl fullWidth size="small">
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map(r => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!valid} onClick={handleSubmit}>
          {isSignup ? "Create account" : "Log in"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}