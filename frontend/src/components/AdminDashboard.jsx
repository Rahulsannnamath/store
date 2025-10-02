import { useMemo, useState } from "react";
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack, Chip,
  Divider, MenuItem, Select, InputLabel, FormControl, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, Alert
} from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import RefreshIcon from "@mui/icons-material/Refresh";

const seedUsers = [
  { id: 1, name: "Admin User", email: "admin@storeconnect.com", address: "789 Admin Avenue", role: "admin" },
  { id: 2, name: "Rahul Sannamath", email: "user@gmail.com", address: "123 Willow Lane", role: "user" },
  { id: 3, name: "owner1", email: "owner1@gmail.com", address: "12 Market St", role: "store_owner", ownerRating: 4.4 },
  { id: 4, name: "owner2", email: "owner2@gmail.com", address: "450 River Road", role: "store_owner", ownerRating: 4.1 },
  { id: 5, name: "owner3", email: "owner3@gmail.com", address: "22 Bay Ave", role: "store_owner", ownerRating: 4.6 },
];

const seedStores = [
  { id: 201, name: "The Corner Shop", email: "contact@cornershop.com", address: "123 Elm Street, Anytown", avgRating: 4.5, ratingsCount: 112 },
  { id: 202, name: "Tech Haven", email: "support@techhaven.com", address: "456 Oak Avenue, Anytown", avgRating: 4.2, ratingsCount: 87 },
  { id: 203, name: "Fashion Forward", email: "hello@fashionforward.com", address: "789 Pine Lane, Anytown", avgRating: 4.8, ratingsCount: 154 },
];

export default function AdminDashboard({ onLogout }) {
  const [users, setUsers] = useState(seedUsers);
  const [stores, setStores] = useState(seedStores);
  const [error, setError] = useState("");

  // Add New User form state
  const [nu, setNu] = useState({ name: "", email: "", password: "", address: "", role: "user" });
  // Add New Store form state
  const [ns, setNs] = useState({ name: "", email: "", address: "" });

  // Filters
  const [userQuery, setUserQuery] = useState("");
  const [userRole, setUserRole] = useState("all");
  const [storeQuery, setStoreQuery] = useState("");

  const totals = useMemo(() => {
    const totalUsers = users.length;
    const totalStores = stores.length;
    const totalRatings = stores.reduce((a, s) => a + Number(s.ratingsCount || 0), 0);
    return { totalUsers, totalStores, totalRatings };
  }, [users, stores]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return users.filter(u => {
      const matchRole = userRole === "all" || u.role === userRole;
      const matchQ = !q || [u.name, u.email, u.address, u.role].some(f => (f || "").toLowerCase().includes(q));
      return matchRole && matchQ;
    });
  }, [users, userQuery, userRole]);

  const filteredStores = useMemo(() => {
    const q = storeQuery.trim().toLowerCase();
    return stores.filter(s =>
      !q || [s.name, s.email, s.address].some(f => (f || "").toLowerCase().includes(q))
    );
  }, [stores, storeQuery]);

  const handleAddUser = () => {
    setError("");
    if (!nu.name.trim() || !nu.email.trim() || !nu.password.trim()) {
      setError("Please fill Name, Email and Password.");
      return;
    }
    const next = {
      id: Math.max(0, ...users.map(u => u.id)) + 1,
      name: nu.name.trim(),
      email: nu.email.trim(),
      address: nu.address.trim(),
      role: nu.role,
      ownerRating: nu.role === "store_owner" ? 4.2 : undefined
    };
    setUsers(prev => [next, ...prev]);
    setNu({ name: "", email: "", password: "", address: "", role: "user" });
  };

  const handleAddStore = () => {
    setError("");
    if (!ns.name.trim() || !ns.email.trim()) {
      setError("Please fill Store Name and Email.");
      return;
    }
    const next = {
      id: Math.max(0, ...stores.map(s => s.id)) + 1,
      name: ns.name.trim(),
      email: ns.email.trim(),
      address: ns.address.trim(),
      avgRating: 0.0,
      ratingsCount: 0
    };
    setStores(prev => [next, ...prev]);
    setNs({ name: "", email: "", address: "" });
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box className="admin-toolbar">
        <Typography variant="h5" sx={{ fontWeight: 800 }}>StoreConnect - Admin Panel</Typography>
        <Button variant="outlined" onClick={onLogout}>Logout</Button>
      </Box>

      <Box className="admin-summary">
        <Card className="admin-summary-card" elevation={1}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Total Users</Typography>
            <Typography className="admin-summary-number">{totals.totalUsers.toLocaleString()}</Typography>
          </CardContent>
        </Card>
        <Card className="admin-summary-card" elevation={1}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Total Stores</Typography>
            <Typography className="admin-summary-number">{totals.totalStores.toLocaleString()}</Typography>
          </CardContent>
        </Card>
        <Card className="admin-summary-card" elevation={1}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Total Ratings</Typography>
            <Typography className="admin-summary-number highlight">{totals.totalRatings.toLocaleString()}</Typography>
          </CardContent>
        </Card>
      </Box>

      <Box className="admin-grid">
        {/* Left column: Add New Entity */}
        <Box className="admin-left">
          <Card elevation={1} className="admin-form-card">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Add New User</Typography>
              <Stack spacing={1.25}>
                <TextField size="small" label="Name" value={nu.name} onChange={e => setNu(v => ({ ...v, name: e.target.value }))} />
                <TextField size="small" label="Email" value={nu.email} onChange={e => setNu(v => ({ ...v, email: e.target.value }))} />
                <TextField size="small" label="Password" type="password" value={nu.password} onChange={e => setNu(v => ({ ...v, password: e.target.value }))} />
                <TextField size="small" label="Address" value={nu.address} onChange={e => setNu(v => ({ ...v, address: e.target.value }))} />
                <FormControl size="small">
                  <InputLabel id="role-label">Role</InputLabel>
                  <Select labelId="role-label" label="Role" value={nu.role} onChange={e => setNu(v => ({ ...v, role: e.target.value }))}>
                    <MenuItem value="user">Normal User</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="store_owner">Store Owner</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="contained" onClick={handleAddUser}>Add User</Button>
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
                <Button variant="contained" onClick={handleAddStore}>Add Store</Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Right column: Manage Users and Stores */}
        <Box className="admin-right">
          <Card elevation={1} className="admin-list-card">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Manage Users</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Filter by Name, Email or Address"
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

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>NAME</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>EMAIL</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ADDRESS</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ROLE</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>OWNER RATING</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map(u => (
                    <TableRow key={u.id} hover>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.address}</TableCell>
                      <TableCell>
                        <Chip size="small" label={u.role === "store_owner" ? "Store Owner" : u.role.charAt(0).toUpperCase() + u.role.slice(1)} />
                      </TableCell>
                      <TableCell>
                        {u.role === "store_owner" ? (
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <StarRoundedIcon color="warning" fontSize="small" />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{(u.ownerRating || 0).toFixed(1)}</Typography>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>NAME</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>EMAIL</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ADDRESS</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>RATING</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStores.map(s => (
                    <TableRow key={s.id} hover>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell>{s.address}</TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{Number(s.avgRating).toFixed(1)}/5</Typography>
                          <StarRoundedIcon color="warning" fontSize="small" />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}