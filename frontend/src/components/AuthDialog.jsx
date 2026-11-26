import { useMemo, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, Alert, IconButton, InputAdornment,

} from "@mui/material";
import { userError } from "../validation";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function AuthDialog({ open, onClose, mode = "login", loginRole, onSubmit }) {
  const isSignup = mode === "signup";
  const roleLabel = { user: 'User', owner: 'Store Owner', admin: 'Admin' }[loginRole];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");

  const validation = useMemo(() => isSignup ? userError({ name, email, password: pwd, address }) : (!email.trim() || !pwd ? 'Email and password required' : ''), [name, email, pwd, address, isSignup]);
  const valid = !validation && !busy;

  const handleSubmit = async () => {
    setError("");
    setBusy(true);
    try {
      await onSubmit?.({ name: name.trim(), email: email.trim(), password: pwd, address: address.trim() });
      setName("");
      setEmail("");
      setPwd("");
      setAddress("");
      onClose?.();
    } catch (e) {
      setError(e?.message || "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <Dialog
      open={open}
      onClose={() => { if (!busy) { setPwd(""); setError(""); onClose(); } }}
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
        {isSignup ? "Sign up" : roleLabel ? `${roleLabel} login` : "Log in"}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}><form id={`${mode}-form`} onSubmit={e => { e.preventDefault(); if (valid) handleSubmit(); }}>
        <Stack spacing={1.5}>
          {!isSignup && roleLabel && <Alert severity="info">Sign in with your {roleLabel.toLowerCase()} account. Your account permissions determine the dashboard you can access.</Alert>}
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
              helperText="20-60 characters"
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
                  <IconButton aria-label="Toggle password visibility" onClick={() => setShowPwd((s) => !s)} edge="end">
                    {showPwd ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText="8-16 characters, at least one uppercase and one special character"
          />
          {isSignup && <TextField label="Address" value={address} onChange={e => setAddress(e.target.value)} multiline helperText="Required, maximum 400 characters" fullWidth />}
          {isSignup && validation && <Alert severity="info">{validation}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </form></DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button disabled={busy} onClick={() => { setPwd(""); setError(""); onClose(); }}>Cancel</Button>
        <Button variant="contained" disabled={!valid} type="submit" form={`${mode}-form`}>
          {isSignup ? "Create account" : "Log in"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
