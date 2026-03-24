import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { db, normalizeJobsite } from '@/lib/db';
import { MapPin, Navigation, Building2, Map, Search, X, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

if (!document.getElementById('leaflet-css')) {
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
}

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function FlyToController({ target }) {
  const map = useMap();
  if (target) map.flyTo([target.latitude, target.longitude], 13, { duration: 1.2 });
  return null;
}

export default function MapPortal() {
  const navigate = useNavigate();
  const [flyTarget, setFlyTarget] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [search, setSearch] = useState('');

  const { data: siteRows = [], isLoading, error } = useQuery({
    queryKey: ['jobsites'],
    queryFn: () => db.jobsites.list().catch(err => {
      console.error('MapPortal: jobsites fetch failed', err);
      return [];
    }),
  });

  const allActive = siteRows.map(normalizeJobsite).filter(s => s.is_active);

  const mappedSites = allActive.filter(s => {
    const lat = parseFloat(s.latitude ?? s.lat);
    const lng = parseFloat(s.longitude ?? s.lng);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  }).map(s => ({
    ...s,
    latitude: parseFloat(s.latitude ?? s.lat),
    longitude: parseFloat(s.longitude ?? s.lng),
  }));

  const searchLower = search.toLowerCase();
  const filteredSites = allActive.filter(s =>
    s.jobsite_name?.toLowerCase().includes(searchLower) ||
    s.city?.toLowerCase().includes(searchLower)
  );

  // Auto-select first match when searching
  const handleSearchChange = (val) => {
    setSearch(val);
    if (val.trim()) {
      const q = val.toLowerCase();
      const match = allActive.find(s =>
        s.jobsite_name?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q)
      );
      if (match) handleSiteSelect(match);
    }
  };

  const center = mappedSites.length > 0
    ? [mappedSites[0].latitude, mappedSites[0].longitude]
    : [36.7783, -119.4179];

  const handleDirections = (site, e) => {
    e?.stopPropagation();
    const lat = site.latitude ?? site.lat;
    const lng = site.longitude ?? site.lng;
    if (lat && lng) {
      window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
    } else if (site.address || site.city) {
      const q = encodeURIComponent([site.address, site.city, site.state].filter(Boolean).join(', '));
      window.open(`https://maps.google.com/?q=${q}`, '_blank');
    }
  };

  const chipStripRef = useRef(null);

  const handleSiteSelect = (site) => {
    const mapped = mappedSites.find(s => s.id === site.id);
    setSelectedSite(site);
    if (mapped) {
      setFlyTarget(mapped);
      // Scroll the chip strip to the selected chip
      if (chipStripRef.current) {
        const chipIndex = mappedSites.findIndex(s => s.id === site.id);
        const chip = chipStripRef.current.children[chipIndex];
        if (chip) chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center active-scale"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </motion.button>
            <div>
              <h2 className="text-white font-black text-lg">Map Portal</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {mappedSites.length > 0
                  ? `${mappedSites.length} sites with GPS · ${allActive.length} total`
                  : `${allActive.length} active sites`}
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Map — takes up most of the screen */}
      <div className="mx-4 flex-shrink-0">
        {isLoading ? (
          <div className="h-64 rounded-3xl bg-card border border-border animate-pulse" />
        ) : mappedSites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 rounded-3xl bg-card border border-border text-center p-4">
            <Map className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-gray-400 font-bold text-sm">No GPS coordinates found</p>
            <p className="text-gray-600 text-xs mt-1">Add lat/lng to jobsites to enable the map</p>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden border border-border" style={{ height: '320px' }}>
            <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <FlyToController target={flyTarget} />
              {mappedSites.map(site => (
                <Marker key={site.id} position={[site.latitude, site.longitude]}>
                  <Popup>
                    <div style={{ minWidth: 140 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{site.jobsite_name}</div>
                      {site.city && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{site.city}, {site.state}</div>}
                      <button
                        onClick={(e) => handleDirections(site, e)}
                        style={{ marginTop: 6, fontSize: 11, color: '#10b981', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Get Directions →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>

      {/* Horizontal site chips — directly below map, always visible */}
      {mappedSites.length > 0 && (
        <div className="mt-2 flex-shrink-0 overflow-x-auto px-4 pb-1">
          <div ref={chipStripRef} className="flex gap-2" style={{ minWidth: 'max-content' }}>
            {mappedSites.map(site => (
              <motion.button
                key={site.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSiteSelect(site)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition-all flex-shrink-0 ${
                  selectedSite?.id === site.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-gray-400'
                }`}
              >
                <MapPin className="w-3 h-3" />
                {site.jobsite_name}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="px-4 mt-3 flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card border border-border">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search sites..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="bg-transparent text-white text-sm placeholder-gray-600 flex-1 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Selected site detail card */}
      <AnimatePresence>
        {selectedSite && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-4 mt-3 flex-shrink-0 p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{selectedSite.jobsite_name}</p>
              <p className="text-gray-400 text-xs mt-0.5">{selectedSite.city && `${selectedSite.city}, ${selectedSite.state}`}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => handleDirections(selectedSite, e)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold active-scale"
            >
              <Navigation className="w-3.5 h-3.5" />
              Directions
            </motion.button>
            <button onClick={() => setSelectedSite(null)}>
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full site list — scrollable below */}
      <div className="px-4 mt-3 pb-6 space-y-2 overflow-y-auto">
        <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">All Sites</p>
        {filteredSites.map((site, i) => {
          const hasMapped = mappedSites.some(s => s.id === site.id);
          const isSelected = selectedSite?.id === site.id;
          return (
            <motion.div
              key={site.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                isSelected ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'
              }`}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSiteSelect(site)}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${hasMapped ? 'bg-primary/10 border border-primary/20' : 'bg-white/5 border border-white/10'}`}>
                  <Building2 className={`w-4 h-4 ${hasMapped ? 'text-primary' : 'text-gray-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{site.jobsite_name}</p>
                  <p className="text-gray-500 text-xs">{site.city && `${site.city}, ${site.state}`}</p>
                </div>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => handleDirections(site, e)}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 hover:border-primary/30 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-primary" />
              </motion.button>
            </motion.div>
          );
        })}
        {filteredSites.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">No sites match your search</p>
        )}
      </div>
    </div>
  );
}