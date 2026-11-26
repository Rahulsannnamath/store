import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack, Chip,
  Divider, MenuItem, Select, InputLabel, FormControl, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, Alert, InputAdornment, TableSortLabel, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import RefreshIcon from "@mui/icons-material/Refresh";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { adminGetStats, adminListUsers, adminListStores, adminCreateUser, adminCreateStore, adminGetUser } from "../api";

import { userError, sortedRows } from "../validation";

export default function AdminDashboard() {
  const [userSort, setUserSort] = useState({ key: 'name', direction: 'asc' });
  const [storeSort, setStoreSort] = useState({ key: 'name', direction: 'asc' });
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const sortHeader = (label, key, sort, setSort) => <TableCell sortDirection={sort.key === key ? sort.direction : false}><TableSortLabel active={sort.key === key} direction={sort.key === key ? sort.direction : 'asc'} onClick={() => setSort({ key, direction: sort.key === key && sort.direction === 'asc' ? 'desc' : 'asc' })}>{label}</TableSortLabel></TableCell>;
  const showUser = async id => { try { setDetail(await adminGetUser(id)); } catch(e) { setError(e.message); } };
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalStores: 0, totalRatings: 0 });
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // Add forms
  const [nu, setNu] = useState({ name: "", email: "", password: "", address: "", role: "user" });
  const [ns, setNs] = useState({ name: "", email: "", address: "", owner_id: "", image_url: "" });

  // Filters
  const [userQuery, setUserQuery] = useState("");
  const [userRole, setUserRole] = useState("all");
  const [storeQuery, setStoreQuery] = useState("");

  const loadAll = useCallback(async ({ reloadUsers = true, reloadStores = true } = {}) => {
    setError("");
    try {
      const [s] = await Promise.all([adminGetStats()]);
      setStats(s);
    } catch (e) {
      setError(e.message || "Failed to load stats");
    }
    try {
      if (reloadUsers) {
        const u = await adminListUsers({ q: userQuery, role: userRole });
        setUsers(u);
      }
    } catch (e) {
      setError(e.message || "Failed to load users");
    }
    try {
      if (reloadStores) {
        const st = await adminListStores({ q: storeQuery });
        setStores(st);
      }
    } catch (e) {
      setError(e.message || "Failed to load stores");
    }
  }, [userQuery, userRole, storeQuery]);

  useEffect(() => { adminGetStats().then(setStats).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);

  // live filter refresh
  useEffect(() => { let active = true; adminListUsers({ q: userQuery, role: userRole }).then(data => { if (active) setUsers(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [userQuery, userRole]);
  useEffect(() => { let active = true; adminListStores({ q: storeQuery }).then(data => { if (active) setStores(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [storeQuery]);

  const totals = useMemo(() => ({
    totalUsers: stats.totalUsers,
    totalStores: stats.totalStores,
    totalRatings: stats.totalRatings
  }), [stats]);

  // Normalize API roles ('store_owner' or 'owner') to display labels
  const roleToLabel = (role) =>
    role === "store_owner" || role === "owner"
      ? "Store Owner"
      : role === "admin"
      ? "Admin"
      : "Normal User";

  const handleAddUser = async () => {
    setError("");
    const validation = userError(nu);
    if (validation) { setError(validation); return; }
    setBusy(true);
    try {
      await adminCreateUser({
        name: nu.name.trim(),
        email: nu.email.trim(),
        password: nu.password,
        address: nu.address.trim(),
        role: nu.role
      });
      setNu({ name: "", email: "", password: "", address: "", role: "user" });
      await loadAll({ reloadUsers: true, reloadStores: false });
      setNotice("User created");
    } catch (e) {
      setError(e.message || "Failed to create user");
    } finally { setBusy(false); }
  };

  const handleAddStore = async () => {
    setError("");
    if (!ns.name.trim() || ns.name.trim().length > 60 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ns.email.trim()) || ns.email.trim().length > 254 || !ns.address.trim() || ns.address.trim().length > 400 || !Number.isInteger(Number(ns.owner_id)) || Number(ns.owner_id) < 1 || ns.image_url.length > 2048 || (ns.image_url && !/^https?:\/\//i.test(ns.image_url))) {
      setError("Provide a store name (1-60), valid email, address (1-400), valid owner ID, and optional HTTP(S) image URL.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: ns.name.trim(),
        email: ns.email.trim(),
        address: ns.address.trim(),
        image_url: ns.image_url.trim()
      };
      if (String(ns.owner_id).trim()) payload.owner_id = Number(ns.owner_id);
      await adminCreateStore(payload);
      setNs({ name: "", email: "", address: "", owner_id: "", image_url: "" });
      await loadAll({ reloadStores: true, reloadUsers: false });
      setNotice("Store created");
    } catch (e) {
      setError(e.message || "Failed to create store");
    } finally { setBusy(false); }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}
      {loading && <CircularProgress aria-label="Loading dashboard" />}
      <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth>
       <DialogTitle>User details</DialogTitle><DialogContent>
        {detail && <Stack spacing={1}><Typography>{detail.name}</Typography><Typography>{detail.email}</Typography><Typography>{detail.address}</Typography><Typography>{roleToLabel(detail.role)}</Typography>
         {(detail.stores || []).map(store => <Typography key={store.id}>{store.name}: {Number(store.avgRating).toFixed(1)}/5 ({store.ratingsCount} ratings)</Typography>)}
         {detail.role === 'owner' && !detail.stores?.length && <Typography>No stores assigned.</Typography>}
        </Stack>}
       </DialogContent><DialogActions><Button onClick={() => setDetail(null)}>Close</Button></DialogActions>
      </Dialog>

      <Box className="admin-toolbar">
        <Typography variant="h5" sx={{ fontWeight: 800 }}>StoreConnect - Admin Panel</Typography>
      </Box>

      <Box className="admin-summary">
        <Card className="admin-summary-card" elevation={1}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Total Users</Typography>
            <Typography className="admin-summary-number">{totals.totalUsers?.toLocaleString?.() || totals.totalUsers}</Typography>
          </CardContent>
        </Card>
        <Card className="admin-summary-card" elevation={1}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Total Stores</Typography>
            <Typography className="admin-summary-number">{totals.totalStores?.toLocaleString?.() || totals.totalStores}</Typography>
          </CardContent>
        </Card>
        <Card className="admin-summary-card" elevation={1}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Total Ratings</Typography>
            <Typography className="admin-summary-number highlight">{totals.totalRatings?.toLocaleString?.() || totals.totalRatings}</Typography>
          </CardContent>
        </Card>
      </Box>

      <Box className="admin-grid">
        <Box className="admin-left">
          <Card elevation={1} className="admin-form-card">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Add New User</Typography>
              <Stack spacing={1.25}>
                <TextField helperText="20-60 characters" size="small" label="Name" value={nu.name} onChange={e => setNu(v => ({ ...v, name: e.target.value }))} />
                <TextField size="small" label="Email" value={nu.email} onChange={e => setNu(v => ({ ...v, email: e.target.value }))} />
                <TextField
                  size="small"
                  label="Password"
                  helperText="8-16 characters, uppercase and special required"
                  type={showPwd ? "text" : "password"}
                  value={nu.password}
                  onChange={e => setNu(v => ({ ...v, password: e.target.value }))}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton edge="end" size="small" onClick={() => setShowPwd(s => !s)} aria-label="toggle password visibility">
                          {showPwd ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                <TextField size="small" label="Address" value={nu.address} onChange={e => setNu(v => ({ ...v, address: e.target.value }))} />
                <FormControl size="small">
                  <InputLabel id="role-label">Role</InputLabel>
                  <Select labelId="role-label" label="Role" value={nu.role} onChange={e => setNu(v => ({ ...v, role: e.target.value }))}>
                    <MenuItem value="user">Normal User</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="store_owner">Store Owner</MenuItem>
                  </Select>
                </FormControl>
                <Button disabled={busy} variant="contained" onClick={handleAddUser}>Add User</Button>
              </Stack>
            </CardContent>
          </Card>

          <Card elevation={1} className="admin-form-card">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Add New Store</Typography>
              <Stack spacing={1.25}>
                <TextField size="small" label="Store Name" value={ns.name} onChange={e => setNs(v => ({ ...v, name: e.target.value }))} />
                <TextField size="small" label="Email" value={ns.email} onChange={e => setNs(v => ({ ...v, email: e.target.value }))} />
                <TextField size="small" label="Address" value={ns.address} onChange={e => setNs(v => ({ ...v, address: e.target.value }))} />
                <TextField size="small" label="Owner User ID" value={ns.owner_id} onChange={e => setNs(v => ({ ...v, owner_id: e.target.value }))} />
                <TextField size="small" label="Image URL (optional)" value={ns.image_url} onChange={e => setNs(v => ({ ...v, image_url: e.target.value }))} />
                <Button disabled={busy} variant="contained" onClick={handleAddStore}>Add Store</Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box className="admin-right">
          <Card elevation={1} className="admin-list-card">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Manage Users</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Filter by Name, Email, Address, Role"
                  value={userQuery}
                  onChange={e => setUserQuery(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <Tooltip title="Clear">
                        <IconButton size="small" onClick={() => setUserQuery("")}><RefreshIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="role-filter">All Roles</InputLabel>
                  <Select labelId="role-filter" label="All Roles" value={userRole} onChange={e => setUserRole(e.target.value)}>
                    <MenuItem value="all">All Roles</MenuItem>
                    <MenuItem value="user">Normal User</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="store_owner">Store Owner</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Box sx={{ overflowX: "auto" }}><Table size="small">
                <TableHead><TableRow>{['name','email','address','role'].map(key => <TableCell key={key} sortDirection={userSort.key === key ? userSort.direction : false}><TableSortLabel active={userSort.key === key} direction={userSort.key === key ? userSort.direction : 'asc'} onClick={() => setUserSort({ key, direction: userSort.key === key && userSort.direction === 'asc' ? 'desc' : 'asc' })}>{key.toUpperCase()}</TableSortLabel></TableCell>)}<TableCell>DETAILS</TableCell></TableRow></TableHead>
                <TableBody>
                  {!users.length && <TableRow><TableCell colSpan={5}>No users found.</TableCell></TableRow>}
                  {sortedRows(users, userSort).map(u => (
                    <TableRow key={u.id} hover>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.address}</TableCell>
                      <TableCell>
                        <Chip size="small" label={roleToLabel(u.role)} />
                      </TableCell><TableCell><Button onClick={() => showUser(u.id)}>View details</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></Box>
            </CardContent>
          </Card>

          <Divider sx={{ my: 2 }} />

          <Card elevation={1} className="admin-list-card">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Manage Stores</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Filter by Name, Email or Address"
                  value={storeQuery}
                  onChange={e => setStoreQuery(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <Tooltip title="Clear">
                        <IconButton size="small" onClick={() => setStoreQuery("")}><RefreshIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )
                  }}
                />
              </Stack>

              <Box sx={{ overflowX: "auto" }}><Table size="small">
                <TableHead><TableRow>
 {sortHeader('NAME', 'name', storeSort, setStoreSort)}{sortHeader('EMAIL', 'email', storeSort, setStoreSort)}{sortHeader('ADDRESS', 'address', storeSort, setStoreSort)}{sortHeader('RATING', 'avgRating', storeSort, setStoreSort)}
 </TableRow></TableHead>
                <TableBody>
                  {!stores.length && <TableRow><TableCell colSpan={4}>No stores found.</TableCell></TableRow>}
                  {sortedRows(stores, storeSort).map(s => (
                    <TableRow key={s.id} hover>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell>{s.address}</TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{Number(s.avgRating || 0).toFixed(1)}/5</Typography>
                          <StarRoundedIcon color="warning" fontSize="small" />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}