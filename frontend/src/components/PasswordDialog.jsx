import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, Alert } from '@mui/material';
import { changePassword, clearSession } from '../api';
import { passwordValid } from '../validation';
export default function PasswordDialog({ open, onClose }) {
 const [currentPassword, setCurrent] = useState('');
 const [newPassword, setNew] = useState('');
 const [error, setError] = useState('');
 const [busy, setBusy] = useState(false);
 const close = () => { setCurrent(''); setNew(''); setError(''); onClose(); };
 const submit = async e => {
  e.preventDefault(); setBusy(true); setError('');
  try { await changePassword({ currentPassword, newPassword }); close(); clearSession(); }
  catch(e) { setError(e.message); } finally { setBusy(false); }
 };
 return <Dialog open={open} onClose={() => !busy && close()} fullWidth maxWidth="sm">
  <DialogTitle>Change password</DialogTitle>
  <DialogContent><form id="password-form" onSubmit={submit}>
   <Stack spacing={2} sx={{ pt: 1 }}>
    <TextField label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrent(e.target.value)} required />
    <TextField label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={e => setNew(e.target.value)} helperText="8-16 characters, uppercase and special character required" required />
    <Alert severity="info">Changing your password signs you out on all devices. Please sign in again.</Alert>
    {error && <Alert severity="error">{error}</Alert>}
   </Stack>
  </form></DialogContent>
  <DialogActions><Button disabled={busy} onClick={close}>Cancel</Button><Button type="submit" form="password-form" disabled={busy || !currentPassword || !passwordValid(newPassword)}>Save password</Button></DialogActions>
 </Dialog>;
}
