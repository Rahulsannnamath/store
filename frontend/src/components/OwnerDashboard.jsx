import { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Card, CardContent, CardMedia, Chip, Stack,
  IconButton, Collapse, Divider, Avatar, Tooltip, Alert, CircularProgress, TextField, MenuItem
} from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { getOwnerStores, getStoreRaters } from "../api";

import { sortedRows } from "../validation";

export default function OwnerDashboard({ user }) {
  const [sort, setSort] = useState({ key: "name", direction: "asc" });
  const [loading, setLoading] = useState(true);
  const [loadingRaters, setLoadingRaters] = useState({});
  const [stores, setStores] = useState([]);
  const [open, setOpen] = useState({});
  const [raters, setRaters] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setError("");
      try {
        const data = await getOwnerStores();
        setStores(data || []);
      } catch (e) {
        setError(e.message || "Failed to load stores");
      } finally { setLoading(false); }
    })();
  }, []);

  const totals = useMemo(() => {
    const count = stores.length;
    const ratingsCount = stores.reduce((a, s) => a + Number(s.ratingsCount || 0), 0);
    const avg = ratingsCount ? Number((stores.reduce((a, s) => a + Number(s.ratingSum || 0), 0) / ratingsCount).toFixed(1)) : 0;
    return { count, ratingsCount, avg };
  }, [stores]);

  const toggle = async (id) => {
    const next = !open[id];
    setOpen(p => ({ ...p, [id]: next }));
    if (next && !raters[id]) {
      setLoadingRaters(p => ({ ...p, [id]: true }));
      try {
        const rows = await getStoreRaters(id);
        setRaters(prev => ({ ...prev, [id]: rows || [] }));
      } catch (e) {
        setError(e.message || "Failed to load raters");
      } finally { setLoadingRaters(p => ({ ...p, [id]: false })); }
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box className="owner-toolbar">
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Store Owner Dashboard
        </Typography>
        <Chip label={`Signed in as: ${user?.name || "Owner"}`} />
      </Box>

      <Box className="owner-summary">
        <Card className="owner-summary-card" elevation={1}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Stores</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{totals.count}</Typography>
          </CardContent>
        </Card>
        <Card className="owner-summary-card" elevation={1}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Average Rating</Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <StarRoundedIcon color="warning" />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{totals.avg}</Typography>
            </Stack>
          </CardContent>
        </Card>
        <Card className="owner-summary-card" elevation={1}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Total Ratings</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{totals.ratingsCount}</Typography>
          </CardContent>
        </Card>
      </Box>

      <Typography variant="subtitle1" sx={{ mt: 3, mb: 1.5, fontWeight: 700 }}>
        Your Stores
      </Typography>

      {loading && <CircularProgress aria-label="Loading owner stores" />}
      {!loading && !stores.length && <Alert severity="info">No stores assigned yet.</Alert>}
      <TextField select label="Sort your stores" size="small" value={`${sort.key}:${sort.direction}`} onChange={e => { const [key, direction] = e.target.value.split(':'); setSort({ key, direction }); }} sx={{ mb: 2 }}>
       {['name','address','avgRating'].flatMap(key => ['asc','desc'].map(direction => <MenuItem key={`${key}:${direction}`} value={`${key}:${direction}`}>{key === 'avgRating' ? 'Rating' : key} {direction === 'asc' ? 'ascending' : 'descending'}</MenuItem>))}
      </TextField>
      <Box className="owner-stores">
        {sortedRows(stores, sort).map((s) => (
          <Card key={s.id} className="owner-card" elevation={2}>
            <CardMedia component="img" image={s.image_url || "/store-placeholder.svg"} alt={s.name} className="owner-media" />
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {s.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {s.address}
              </Typography>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <StarRoundedIcon fontSize="small" color="warning" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {Number(s.avgRating || 0).toFixed(1)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({s.ratingsCount} ratings)
                </Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Submitted Ratings
                </Typography>
                <Tooltip title={open[s.id] ? "Hide details" : "View details"}>
                  <IconButton aria-label={`View ratings for ${s.name}`} aria-expanded={!!open[s.id]} size="small" onClick={() => toggle(s.id)}>
                    <ExpandMoreIcon className={open[s.id] ? "owner-expand owner-expand-open" : "owner-expand"} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </CardContent>

            <Collapse in={!!open[s.id]}>
              <Divider />
              <Box className="owner-raters">
                {loadingRaters[s.id] && <CircularProgress size={24} aria-label="Loading ratings" />}
                {(raters[s.id] || []).map((r) => (
                  <Stack key={r.id} direction="row" alignItems="center" className="owner-rater-row">
                    <Avatar className="owner-rater-avatar">
                      {(r.name || r.email || "?").slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {r.name || r.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(r.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <StarRoundedIcon color="warning" fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.rating}</Typography>
                    </Stack>
                  </Stack>
                ))}
                {!loadingRaters[s.id] && raters[s.id]?.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                    No ratings yet.
                  </Typography>
                )}
              </Box>
            </Collapse>
          </Card>
        ))}
      </Box>
    </Box>
  );
}