import { DISTRICTS, LOCATIONS } from "./gameData.mjs";

const DISTRICT_LAYOUT = {
  downtown: { x: 0, z: 0 },
  "old-town": { x: -34, z: -18 },
  harbor: { x: 34, z: -16 },
  industrial: { x: 40, z: 26 },
  "rich-district": { x: -40, z: 28 },
  underground: { x: 0, z: 42 },
  residential: { x: -2, z: -42 },
  "safehouse-area": { x: 26, z: 46 },
  "business-district": { x: -55, z: -2 },
  outskirts: { x: 56, z: 52 }
};

const LOCATION_OFFSETS = [
  { x: -11, z: -8 },
  { x: 11, z: -8 },
  { x: -11, z: 9 },
  { x: 11, z: 9 },
  { x: 0, z: -14 },
  { x: 0, z: 14 }
];

function distanceSq2(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

export function createDistrictAnchors(districts = DISTRICTS) {
  const anchors = {};
  districts.forEach((district, index) => {
    if (DISTRICT_LAYOUT[district.id]) {
      anchors[district.id] = DISTRICT_LAYOUT[district.id];
      return;
    }
    const angle = (Math.PI * 2 * index) / Math.max(1, districts.length);
    anchors[district.id] = {
      x: Math.round(Math.cos(angle) * 36),
      z: Math.round(Math.sin(angle) * 36)
    };
  });
  return anchors;
}

function getLocationOffset(index) {
  return LOCATION_OFFSETS[index % LOCATION_OFFSETS.length];
}

export function buildWorldModel(state, districts = DISTRICTS, locations = LOCATIONS) {
  const anchors = createDistrictAnchors(districts);
  const districtById = Object.fromEntries(districts.map((entry) => [entry.id, entry]));

  const buildings = [];
  const locationNodes = {};

  districts.forEach((district) => {
    const anchor = anchors[district.id] || { x: 0, z: 0 };
    district.locations.forEach((locationId, index) => {
      const data = locations[locationId];
      if (!data) return;
      const offset = getLocationOffset(index);
      const x = anchor.x + offset.x;
      const z = anchor.z + offset.z;
      const width = 8;
      const depth = 8;
      const height = 6 + (index % 3) * 2;
      const door = { x, z: z + depth * 0.5 + 0.9 };
      const node = {
        id: `building-${district.id}-${locationId}`,
        districtId: district.id,
        locationId,
        name: data.name,
        description: data.description,
        x,
        z,
        width,
        depth,
        height,
        door,
        prompt: `Enter ${data.name}`,
        interactionType: "door",
        districtName: district.name,
        enterable: [
          "safehouse",
          "bank",
          "luxury-club",
          "underground-club",
          "safehouse-compound",
          "garage",
          "restaurant",
          "hotel",
          "private-casino",
          "office-complex",
          "business-hub",
          "legal-office",
          "service-garage",
          "small-businesses"
        ].includes(locationId),
        locationType:
          locationId.includes("club") || locationId.includes("venue")
            ? "nightlife"
            : locationId.includes("bank")
              ? "finance"
              : locationId.includes("safehouse")
                ? "safehouse"
                : locationId.includes("garage")
                  ? "garage"
                  : "business"
      };
      buildings.push(node);
      locationNodes[locationId] = node;
    });
  });

  const npcs = (state?.npcs || []).map((npc, index) => {
    const home = locationNodes[npc.location];
    const jitterX = ((index % 3) - 1) * 1.5;
    const jitterZ = ((index % 2) - 0.5) * 2.2;
    const x = (home?.x ?? 0) + jitterX;
    const z = (home?.z ?? 0) + 4 + jitterZ;
    return {
      id: npc.id,
      districtId: npc.district,
      locationId: npc.location,
      name: npc.name,
      role: npc.role,
      x,
      z,
      homeX: x,
      homeZ: z,
      prompt: `Talk to ${npc.name}`,
      interactionType: "npc"
    };
  });

  const vehicles = (state?.vehicles || []).map((vehicle, index) => {
    const district = districts[index % districts.length];
    const anchor = anchors[district.id] || { x: 0, z: 0 };
    return {
      id: vehicle.id,
      districtId: district.id,
      name: vehicle.name,
      owned: Boolean(vehicle.owned),
      x: anchor.x + 3 + (index % 2) * 3,
      z: anchor.z + 16 + (index % 3),
      prompt: vehicle.owned ? `Drive ${vehicle.name}` : `View ${vehicle.name}`,
      interactionType: "vehicle"
    };
  });

  const districtMarkers = districts.map((district) => {
    const anchor = anchors[district.id] || { x: 0, z: 0 };
    return {
      id: district.id,
      districtId: district.id,
      name: district.name,
      x: anchor.x,
      z: anchor.z - 20,
      prompt: `Travel to ${district.name}`,
      interactionType: "district-marker"
    };
  });

  const blockedZones = buildings.map((entry) => ({
    minX: entry.x - entry.width * 0.5,
    maxX: entry.x + entry.width * 0.5,
    minZ: entry.z - entry.depth * 0.5,
    maxZ: entry.z + entry.depth * 0.5
  }));

  return {
    anchors,
    buildings,
    npcs,
    vehicles,
    districtMarkers,
    blockedZones,
    districtById,
    locationNodes
  };
}

export function getSpawnPoint(state, model) {
  const districtId = state?.selectedDistrictId;
  const locationId = state?.currentLocationId;
  const locationNode = model.locationNodes[locationId];
  if (locationNode && locationNode.districtId === districtId) {
    return { x: locationNode.door.x, z: locationNode.door.z + 1.5 };
  }
  const anchor = model.anchors[districtId] || { x: 0, z: 0 };
  return { x: anchor.x, z: anchor.z + 1.5 };
}

export function getInteractables(model) {
  const doors = model.buildings.map((entry) => ({
    id: entry.locationId,
    name: entry.name,
    districtId: entry.districtId,
    x: entry.door.x,
    z: entry.door.z,
    prompt: entry.prompt,
    interactionType: "door",
    enterable: entry.enterable,
    locationType: entry.locationType
  }));

  return [...doors, ...model.npcs, ...model.vehicles, ...model.districtMarkers];
}

export function findNearestInteraction(player, interactables, maxDistance = 3.3) {
  const maxSq = maxDistance * maxDistance;
  let nearest = null;
  for (const target of interactables) {
    const d2 = distanceSq2(player, target);
    if (d2 > maxSq) continue;
    if (!nearest || d2 < nearest.distanceSq) {
      nearest = { ...target, distanceSq: d2, distance: Math.sqrt(d2) };
    }
  }
  return nearest;
}

export function resolveWorldCollisions(position, radius, blockedZones) {
  const next = { ...position };
  for (const zone of blockedZones) {
    const nearestX = Math.max(zone.minX, Math.min(next.x, zone.maxX));
    const nearestZ = Math.max(zone.minZ, Math.min(next.z, zone.maxZ));
    const dx = next.x - nearestX;
    const dz = next.z - nearestZ;
    const d2 = dx * dx + dz * dz;
    if (d2 >= radius * radius) continue;

    if (Math.abs(dx) > Math.abs(dz)) {
      next.x = dx >= 0 ? zone.maxX + radius : zone.minX - radius;
    } else {
      next.z = dz >= 0 ? zone.maxZ + radius : zone.minZ - radius;
    }
  }
  return next;
}
