import { useEffect, useRef, useState, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Wifi, WifiOff, Users, Navigation } from "lucide-react";
import { api } from "@/lib/api";
import { connectWebSocket, disconnectWebSocket } from "@/lib/websocket";

// DSK Meat Mart location
const DSK_MART = {
  lat: 12.8616552,
  lng: 77.6001312,
  name: "DSK Meat Mart Nobonagar",
  address: "VJ62+M3, Doddakammanahalli Main Rd, Bengaluru, Karnataka 560083",
};

// Map bounds
// const MAP_BOUNDS = {
//   south: 12.82,
//   north: 13.92,
//   west: 77.52,
//   east: 77.68,
// };
const MAP_BOUNDS = {
  south: 12.82,
  north: 12.92,
  west: 77.52,
  east: 77.68,
};
interface DeliveryBoy {
  _id: string;
  name: string;
  phone: string;
  status: string;
  lastLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: string;
  };
}

// Check if driver is online (location < 1 minute old = real-time)
const isDriverOnline = (updatedAt: string | undefined): boolean => {
  if (!updatedAt) return false;
  const locationTime = new Date(updatedAt).getTime();
  const now = Date.now();
  const oneMinute = 60 * 1000; // 1 minute
  return (now - locationTime) < oneMinute;
};

// Check if location is fresh enough to show (< 5 minutes = show, > 5 minutes = hide)
const isLocationFresh = (updatedAt: string | undefined): boolean => {
  if (!updatedAt) return false;
  const locationTime = new Date(updatedAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes
  return (now - locationTime) < fiveMinutes;
};

// Get time ago string with online/offline status
const getTimeAgo = (updatedAt: string): string => {
  const diff = Date.now() - new Date(updatedAt).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 30) return '🟢 Live';
  if (seconds < 60) return '🟢 Just now';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 2) return '🟢 1m ago';
  if (minutes < 5) return `🟡 ${minutes}m ago`;
  if (minutes < 60) return `🔴 ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `🔴 ${hours}h ago`;
  return '⚫ Offline';
};

export default function Track() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createDriverIcon = () => {
    const L = (window as any).L;
    return L.divIcon({
      className: "driver-marker",
      html: `<div style="width:40px;height:50px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
        <img src="/bike.svg" alt="Delivery" style="width:40px;height:50px;object-fit:contain;" />
      </div>`,
      iconSize: [40, 50],
      iconAnchor: [20, 25],
    });
  };

  const updateDriverMarker = useCallback((driverId: string, driverName: string, location: any) => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !location) return;

    // Only show marker if location is fresh (< 20 minutes)
    if (!isLocationFresh(location.updatedAt)) {
      // Remove stale marker if exists
      const existingMarker = markersRef.current.get(driverId);
      if (existingMarker) {
        mapRef.current.removeLayer(existingMarker);
        markersRef.current.delete(driverId);
      }
      return;
    }

    const timeAgo = getTimeAgo(location.updatedAt);
    const existingMarker = markersRef.current.get(driverId);
    
    if (existingMarker) {
      existingMarker.setLatLng([location.latitude, location.longitude]);
      existingMarker.setPopupContent(`<b>${driverName}</b><br><small>${timeAgo}</small>`);
    } else {
      const marker = L.marker(
        [location.latitude, location.longitude],
        { icon: createDriverIcon() }
      )
        .addTo(mapRef.current)
        .bindPopup(`<b>${driverName}</b><br><small>${timeAgo}</small>`);
      
      markersRef.current.set(driverId, marker);
    }
  }, []);

  const handleLocationUpdate = useCallback((data: any) => {
    if (data.type !== 'DRIVER_LOCATION_UPDATE') return;
    
    const { driverId, driverName, location } = data;
    setLastUpdate(new Date());
    
    setDeliveryBoys(prev => prev.map(driver => 
      driver._id === driverId 
        ? { ...driver, lastLocation: location }
        : driver
    ));

    updateDriverMarker(driverId, driverName, location);
  }, [updateDriverMarker]);

  const addDriverMarker = useCallback((driver: DeliveryBoy) => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !driver.lastLocation) return;

    // Only show marker if location is fresh (< 20 minutes)
    if (!isLocationFresh(driver.lastLocation.updatedAt)) {
      // Remove stale marker if exists
      if (markersRef.current.has(driver._id)) {
        mapRef.current.removeLayer(markersRef.current.get(driver._id));
        markersRef.current.delete(driver._id);
      }
      return;
    }

    if (markersRef.current.has(driver._id)) {
      mapRef.current.removeLayer(markersRef.current.get(driver._id));
    }

    const timeAgo = getTimeAgo(driver.lastLocation.updatedAt);
    const marker = L.marker(
      [driver.lastLocation.latitude, driver.lastLocation.longitude], 
      { icon: createDriverIcon() }
    )
      .addTo(mapRef.current)
      .bindPopup(`<b>${driver.name}</b><br><small>${timeAgo}</small>`);

    markersRef.current.set(driver._id, marker);
  }, []);

  const fetchDeliveryBoys = useCallback(async () => {
    try {
      const data = await api.getDeliveryBoys({ limit: 100 });
      const boys = data.deliveryBoys || [];
      
      // Debug logging
      console.log('📍 Fetched delivery boys:', boys.length);
      boys.forEach((d: DeliveryBoy) => {
        const fresh = d.lastLocation ? isLocationFresh(d.lastLocation.updatedAt) : false;
        console.log(`  - ${d.name}: hasLocation=${!!d.lastLocation}, fresh=${fresh}, lat=${d.lastLocation?.latitude}, lng=${d.lastLocation?.longitude}`);
      });
      
      setDeliveryBoys(boys);
    } catch (err) {
      console.error("Failed to fetch delivery boys:", err);
    }
  }, []);

  const initMap = async () => {
    try {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!(window as any).L) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Leaflet"));
          document.head.appendChild(script);
        });
      }

      await new Promise((r) => setTimeout(r, 300));

      const L = (window as any).L;
      if (!L || !mapContainerRef.current) {
        setError("Map failed to initialize");
        return;
      }

      const bounds = L.latLngBounds(
        [MAP_BOUNDS.south, MAP_BOUNDS.west],
        [MAP_BOUNDS.north, MAP_BOUNDS.east]
      );

      mapRef.current = L.map(mapContainerRef.current, {
        center: [DSK_MART.lat, DSK_MART.lng],
        zoom: 14,
        minZoom: 13,
        maxZoom: 18,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(mapRef.current);

      const shopIcon = L.divIcon({
        className: "shop-marker",
        html: `<div style="background:#dc2626;width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
          <svg style="transform:rotate(45deg)" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
            <path d="M2 7h20"/>
          </svg>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      L.marker([DSK_MART.lat, DSK_MART.lng], { icon: shopIcon })
        .addTo(mapRef.current)
        .bindPopup(`<b>${DSK_MART.name}</b><br>${DSK_MART.address}`)
        .openPopup();

      setTimeout(() => mapRef.current?.invalidateSize(), 100);
    } catch (err) {
      console.error("Map error:", err);
      setError("Failed to load map");
    }
  };

  const handleDriverSelect = useCallback((value: string) => {
    setSelectedDriver(value);
    
    markersRef.current.forEach((marker) => {
      if (mapRef.current) mapRef.current.removeLayer(marker);
    });
    markersRef.current.clear();

    if (value === "all") {
      deliveryBoys.forEach((driver) => {
        // Only show drivers with fresh locations (< 20 minutes)
        if (driver.lastLocation && isLocationFresh(driver.lastLocation.updatedAt)) {
          addDriverMarker(driver);
        }
      });
    } else {
      const driver = deliveryBoys.find((d) => d._id === value);
      if (driver?.lastLocation && isLocationFresh(driver.lastLocation.updatedAt)) {
        addDriverMarker(driver);
        mapRef.current?.setView([driver.lastLocation.latitude, driver.lastLocation.longitude], 16);
        setTimeout(() => markersRef.current.get(driver._id)?.openPopup(), 100);
      }
    }
  }, [deliveryBoys, addDriverMarker]);

  // Request locations from all drivers via push notification
  const requestDriverLocations = async () => {
    try {
      const result = await api.requestDriverLocations();
      console.log('📍 Location request sent to drivers:', result);
    } catch (error) {
      // Silently fail - FCM is optional, location still works via WebSocket when app is open
      console.log('📍 FCM request skipped (endpoint may not be deployed yet)');
    }
  };

  useEffect(() => {
    initMap();
    fetchDeliveryBoys();
    
    // Send push notification to all drivers to get their location
    requestDriverLocations();

    // Connect WebSocket for real-time updates
    const ws = connectWebSocket();
    if (ws) {
      wsRef.current = ws;
      
      const handleOpen = () => {
        console.log('📍 WebSocket connected');
        setIsConnected(true);
      };
      
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📍 WebSocket message:', data.type);
          handleLocationUpdate(data);
        } catch (e) {
          // ignore
        }
      };
      
      const handleClose = () => {
        console.log('📍 WebSocket disconnected');
        setIsConnected(false);
      };
      
      const handleError = () => {
        console.log('📍 WebSocket error');
        setIsConnected(false);
      };
      
      ws.addEventListener('open', handleOpen);
      ws.addEventListener('message', handleMessage);
      ws.addEventListener('close', handleClose);
      ws.addEventListener('error', handleError);

      if (ws.readyState === WebSocket.OPEN) {
        setIsConnected(true);
      }
    }

    // Fetch from database every 15 seconds (shows last known location even if app is closed)
    // Poll database every 10 seconds as fallback (WebSocket provides real-time updates)
    locationIntervalRef.current = setInterval(() => {
      fetchDeliveryBoys();
    }, 10000);

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      disconnectWebSocket();
    };
  }, []);

  useEffect(() => {
    if (deliveryBoys.length > 0 && mapRef.current) {
      // Update markers when delivery boys data changes
      handleDriverSelect(selectedDriver);
    }
  }, [deliveryBoys, handleDriverSelect, selectedDriver]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "busy": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  // Count online drivers (< 1 min) and recent drivers (< 5 min)
  const onlineDrivers = deliveryBoys.filter(d => 
    d.lastLocation && isDriverOnline(d.lastLocation.updatedAt)
  ).length;
  const activeDrivers = deliveryBoys.filter(d => 
    d.lastLocation && isLocationFresh(d.lastLocation.updatedAt)
  ).length;

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 relative z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Navigation className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">Live Tracking</h1>
          </div>
          
          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5" />
                <span>Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Active Drivers Count */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
            <Users className="h-4 w-4 text-gray-600" />
            <span className="text-gray-700 font-medium">
              {onlineDrivers > 0 && <span className="text-green-600">{onlineDrivers} Online</span>}
              {onlineDrivers > 0 && activeDrivers > onlineDrivers && " • "}
              {activeDrivers > onlineDrivers && <span className="text-yellow-600">{activeDrivers - onlineDrivers} Recent</span>}
              {activeDrivers === 0 && "0 Active"}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchDeliveryBoys();
              requestDriverLocations();
            }}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Refresh locations"
          >
            <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Driver Select */}
          <Select value={selectedDriver} onValueChange={handleDriverSelect}>
            <SelectTrigger className="w-[180px] md:w-[200px] bg-white">
              <SelectValue placeholder="Select driver" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  All Drivers
                </span>
              </SelectItem>
              {deliveryBoys.map((driver) => {
                const isOnline = driver.lastLocation && isDriverOnline(driver.lastLocation.updatedAt);
                const isFresh = driver.lastLocation && isLocationFresh(driver.lastLocation.updatedAt);
                return (
                  <SelectItem key={driver._id} value={driver._id}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : isFresh ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                      <span>{driver.name}</span>
                      {isOnline ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      ) : isFresh ? (
                        <span className="text-xs text-yellow-600">Recent</span>
                      ) : (
                        <span className="text-xs text-gray-400">Offline</span>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Last Update Info - Mobile */}
      {lastUpdate && (
        <div className="sm:hidden text-xs text-gray-500 mb-2">
          Last update: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {/* Map Container */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-gray-200 shadow-sm min-h-[400px]" style={{ zIndex: 0 }}>
        <div
          ref={mapContainerRef}
          className="absolute inset-0"
          style={{ zIndex: 0 }}
        />
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Last Update - Desktop */}
        {lastUpdate && (
          <div className="hidden sm:block absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm text-xs text-gray-600">
            Updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}


      </div>
    </div>
  );
}
