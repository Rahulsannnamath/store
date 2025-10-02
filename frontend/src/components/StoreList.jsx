import { useEffect, useState } from "react";
import {
  Box, Card, CardContent, CardActions, Typography, Rating,
  TextField, InputAdornment, IconButton, Chip, CircularProgress, Alert,
  Button, CardMedia, Stack
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { getStores, submitRating, updateRating } from "../api";

export default function StoreList() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState({});
  const [draftRatings, setDraftRatings] = useState({});
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getStores(debouncedSearch);
        if (active) {
          setStores(data || []);
          const nextDraft = {};
          (data || []).forEach(s => { nextDraft[s.id] = Number(s.userRating || 0); });
          setDraftRatings(nextDraft);
        }
      } catch (e) {
        if (active) setError(e.message || "Failed to load stores");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [debouncedSearch]);

  const beginEdit = (id) => {
    setEditing(prev => ({ ...prev, [id]: true }));
    setDraftRatings(prev => ({ ...prev, [id]: 0 }));
  };

  const onPick = (id, val) => {
    setDraftRatings(prev => ({ ...prev, [id]: Number(val || 0) }));
  };

  const onSubmit = async (store) => {
    const rating = Number(draftRatings[store.id] || 0);
    if (rating < 1) return setError("Pick a rating 1-5 before submitting");
    try {
      const hasRated = !!store.userRating;
      const result = hasRated ? await updateRating(store.id, rating) : await submitRating(store.id, rating);
      setStores(prev => prev.map(s => s.id === store.id
        ? { ...s, userRating: result.userRating, avgRating: result.avgRating, ratingsCount: result.ratingsCount }
        : s
      ));
      setEditing(prev => ({ ...prev, [store.id]: false }));
    } catch (e) {
      setError(e.message || "Rating failed");
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, pt: 3 }}>
      <Box className="stores-toolbar">
        <Typography variant="h5" style={{ fontWeight: 800 }}>Explore Stores</Typography>
        <TextField
          size="medium"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or address"
          className="stores-search"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setSearch("")} edge="end">
                  <RefreshIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box className="stores-loading">
          <CircularProgress />
        </Box>
      ) : (
        <Box className="stores-wrapper">
          {stores.map(store => {
            const hasUserRating = !!store.userRating;
            const isEditing = !!editing[store.id];
            const value = isEditing ? Number(draftRatings[store.id] || 0) : Number(store.userRating || 0);
            return (
              <Card key={store.id} className="store-card" elevation={2}>
                <CardMedia
                  component="img"
                  image={store.image_url || "https://via.placeholder.com/640x360?text=Store"}
                  alt={store.name}
                  className="store-media"
                />
                <CardContent style={{ flexGrow: 1 }}>
                  <Typography variant="h6" style={{ fontWeight: 700, marginBottom: 6 }}>
                    {store.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" style={{ marginBottom: 12 }}>
                    {store.address}
                  </Typography>

                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <StarRoundedIcon fontSize="small" color="warning" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {Number(store.avgRating || 0).toFixed(1)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({store.ratingsCount} ratings)
                    </Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Your rating:</Typography>
                    {(() => {
                      const hasUserRating = Number(store.userRating) > 0;
                      const isEditing = !!editing[store.id];
                      const draft = Number(draftRatings[store.id] ?? (hasUserRating ? store.userRating : 0)) || 0;
                      const value = isEditing ? draft : (hasUserRating ? Number(store.userRating) : draft);

                      return (
                        <>
                          <Rating
                            value={value}
                            max={5}
                            onChange={(_, val) => onPick(store.id, val)}
                          />
                          <Chip
                            size="small"
                            variant={hasUserRating ? "filled" : "outlined"}
                            color={hasUserRating ? (isEditing ? "secondary" : "primary") : (draft > 0 ? "primary" : "secondary")}
                            label={
                              hasUserRating
                                ? (isEditing ? "Editing…" : "Current")
                                : (draft > 0 ? "Selected" : "Not rated")
                            }
                          />
                        </>
                      );
                    })()}
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      onClick={() => onSubmit(store)}
                      disabled={Number(draftRatings[store.id] || 0) < 1}
                    >
                      Submit Rating
                    </Button>
                    {Number(store.userRating) > 0 && (
                      <Button
                        variant="outlined"
                        onClick={() => beginEdit(store.id)}
                      >
                        Edit Rating
                      </Button>
                    )}
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, pt: 1 }}>
                  <Button fullWidth variant="outlined" onClick={() => window.open(store.image_url || "#", "_blank")}>
                    View Photo
                  </Button>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}